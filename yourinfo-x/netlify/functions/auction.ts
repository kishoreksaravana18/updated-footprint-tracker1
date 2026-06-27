// Netlify Function: /api/auction
// Simulates a real-time bidding ad auction via NVIDIA NIM. Shows the visitor
// exactly what they are worth to the ad market right now.
// Model: meta/llama-4-maverick-17b-128e-instruct (free tier, ~40 RPM)

import type { Handler } from '@netlify/functions';
import { NIM_KEY, NIM_MODEL, JSON_HEADERS, safeParse, nimChat } from './_nim';

const SYSTEM = `You are an ad-tech RTB auction simulator for an educational privacy demo.
Generate realistic bids from real companies with accurate CPMs for the visitor's profile.
Respond with ONLY valid JSON — no markdown, no code fences.`;

function buildPrompt(p: Record<string, unknown>): string {
  return `VISITOR PROFILE:
${JSON.stringify(p, null, 2)}

Simulate a real-time bidding auction. Rules:
- Choose 12-18 ad companies. Always include global DSPs: Google Ads, Meta Ads, Amazon DSP, The Trade Desk, Criteo, Xandr.
- Add regional networks for the visitor's country (e.g. Yandex for Russia, Baidu for China, InMobi for India, Grab Ads for SE Asia).
- Add specialty bidders for their profile (developer? LinkedIn, Stack Overflow; gamer? Twitch Ads, Unity Ads; crypto? Coinbase, Brave Ads).
- CPM tiers by country: Tier 1 US/UK/AU/CA/DE/CH $1.50-$4.00, Tier 2 FR/JP/KR/IT/ES $0.80-$2.00, Tier 3 BR/MX/PL/TR $0.30-$1.00, Tier 4 IN/ID/PH/NG $0.05-$0.40.
- Adjust CPM: premium GPU/device +30%, developer/professional +40%, ad blocker detected -70%, VPN detected -40%, high income signals +50%.
- 3-5 bidders should no-bid with realistic short reasons.

Return ONLY this JSON:
{
  "bids": [
    {"bidder": "Google Ads", "cpm": 1.85, "status": "bid", "reason": "cross-device profile match"},
    {"bidder": "TikTok Ads", "cpm": 0, "status": "no-bid", "reason": "age bracket outside target"}
  ],
  "estimatedValue": 1.85
}
estimatedValue = highest winning bid CPM in USD.`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  if (!NIM_KEY) {
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        bids: [
          { bidder: 'Google Ads', cpm: 0, status: 'no-bid', reason: 'NVIDIA_API_KEY not set' },
        ],
        estimatedValue: 0,
        source: 'placeholder',
      }),
    };
  }

  try {
    const raw = await nimChat(
      [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: buildPrompt(payload) },
      ],
      { temperature: 0.75, maxTokens: 1200 },
    );

    const parsed = safeParse(raw);
    if (!parsed) {
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ bids: [], estimatedValue: 0, source: 'parse_failed' }),
      };
    }

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ ...parsed, source: `nvidia-nim / ${NIM_MODEL}` }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ bids: [], estimatedValue: 0, source: 'error', detail: String(err) }),
    };
  }
};
