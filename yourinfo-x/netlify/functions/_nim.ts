// Shared NVIDIA NIM client for Netlify serverless functions.
//
// NIM exposes an OpenAI-compatible /v1/chat/completions endpoint at
// https://integrate.api.nvidia.com/v1
//
// All you need is an nvapi- key from build.nvidia.com (free, no credit card).
// The free tier gives ~40 RPM across all models on your key.
//
// Recommended models for this app (fast + free):
//   meta/llama-4-maverick-17b-128e-instruct  -- default, great reasoning, very fast
//   mistralai/mistral-large-3-675b            -- highest quality, slower
//   nvidia/llama-3.1-nemotron-70b-instruct    -- NVIDIA's own tuned model
//   deepseek-ai/deepseek-r1                   -- reasoning specialist
//
// Any model on build.nvidia.com works. Swap NVIDIA_MODEL in your env.

const BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export const NIM_KEY = process.env.NVIDIA_API_KEY;
export const NIM_MODEL =
  process.env.NVIDIA_MODEL || 'meta/llama-4-maverick-17b-128e-instruct';

export const JSON_HEADERS: Record<string, string> = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
};

/** Parses a JSON string from the model, stripping markdown fences if present. */
export function safeParse(raw: string): any | null {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Calls NVIDIA NIM with an OpenAI-compatible chat completions request.
 * Returns the text content of the first choice, or throws on network error.
 */
export async function nimChat(
  messages: Array<{ role: string; content: string }>,
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${NIM_KEY}`,
    },
    body: JSON.stringify({
      model: NIM_MODEL,
      messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 1024,
      // Ask the model to return JSON directly. Not all NIM models honour
      // response_format but it's harmless to set and helps where supported.
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`NIM ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data?.choices?.[0]?.message?.content as string) ?? '';
}
