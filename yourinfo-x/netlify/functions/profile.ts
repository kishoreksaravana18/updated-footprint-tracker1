// Netlify Function: /api/profile
// Sends anonymized fingerprint + geo signals to NVIDIA NIM and returns an
// inferred dossier showing what advertisers and data brokers would guess.
// Model: meta/llama-4-maverick-17b-128e-instruct (free tier, ~40 RPM)

import type { Handler } from '@netlify/functions';
import { NIM_KEY, NIM_MODEL, JSON_HEADERS, safeParse, nimChat } from './_nim';

const SYSTEM = `You are a profiling AI for an educational privacy demonstration.
Analyze the browser fingerprint and network signals below and infer what
advertisers and data brokers would guess about this anonymous visitor.
Base every inference on a specific signal. This is demonstration only.
Respond with ONLY valid JSON — no markdown, no code fences.`;

function buildPrompt(payload: Record<string, unknown>): string {
  return `SIGNALS:
${JSON.stringify(payload, null, 2)}

Return ONLY this JSON shape:
{
  "occupation": "single best guess",
  "ageRange": "e.g. 25-34",
  "incomeLevel": "low | medium | high | very-high",
  "techSavvy": "low | medium | high",
  "personalityTraits": ["3 to 5 short traits"],
  "inferredInterests": ["4 to 6 interests"],
  "creepyInsights": ["3 to 5 specific surprising one-line inferences tied to a signal"]
}`;
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
        occupation: 'Unknown (NVIDIA_API_KEY not set)',
        ageRange: 'Unknown',
        incomeLevel: 'medium',
        techSavvy: 'medium',
        personalityTraits: ['curious'],
        inferredInterests: ['technology', 'privacy'],
        creepyInsights: [
          `Add NVIDIA_API_KEY (nvapi-...) from build.nvidia.com to enable live AI inference.`,
          `Model will run: ${NIM_MODEL}`,
        ],
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
      { temperature: 0.85, maxTokens: 900 },
    );

    const parsed = safeParse(raw);
    if (!parsed) {
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: 'parse_failed', raw: raw.slice(0, 400), source: 'nvidia-nim' }),
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
      body: JSON.stringify({ error: 'request_failed', detail: String(err), source: 'nvidia-nim' }),
    };
  }
};
