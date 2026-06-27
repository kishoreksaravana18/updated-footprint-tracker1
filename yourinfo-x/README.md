# YourInfo X

A privacy awareness demonstration. It shows what a website can learn about you the moment you arrive, then frames it as a live intelligence dossier being assembled on you in real time.

This is a modern rebuild of the YourInfo concept, re-architected to run entirely on free services and deploy to Netlify with no persistent server.

## What it does

It reads your browser and network passively (no permission prompts), builds a device fingerprint, tracks your behavior live, enriches your location with weather and country data, then uses AI to infer who you are and simulate what advertisers would pay for you.

Sections:

1. Location intelligence: IP geolocation plus a live globe of other visitors, current local weather, your country's currency and daylight hours
2. Device fingerprint: hardware, browser, canvas/WebGL/audio fingerprints, and privacy leak detection
3. Behavior and inference: live mouse, scroll, and typing tracking plus an AI dossier
4. Ad auction: a simulated real time bid auction showing what you are worth

## Free API stack

| Purpose | Service | Key needed |
|---------|---------|-----------|
| AI profiling + ad auction | NVIDIA NIM (free tier) | Yes (free) |
| IP geolocation | ipwho.is (fallback freeipapi.com) | No |
| Local weather | Open-Meteo | No |
| Country flag, currency, languages | REST Countries | No |
| Currency to USD rate | Frankfurter | No |
| Sunrise and sunset | Sunrise-Sunset | No |
| Live globe + visitor count | Supabase Realtime | Yes (free) |

The app degrades gracefully. Without a Gemini key the AI panels show a placeholder. Without Supabase the globe runs in solo mode showing only you.

## Tech

Frontend: React 19 + TypeScript + Vite. Backend: Netlify Functions (serverless). Globe: globe.gl. Realtime: Supabase. Hosting: Netlify.

Netlify does not support persistent WebSocket servers, so the original MaxMind database and self-hosted WebSocket globe were replaced with a geolocation API and Supabase Realtime respectively.

## Local development

```bash
npm install
cp .env.example .env   # fill in your keys
npx netlify dev        # runs vite + functions together at http://localhost:8888
```

Use `netlify dev` rather than `npm run dev` so the `/api/*` functions resolve locally. Install the CLI with `npm i -g netlify-cli` if needed.

## Environment variables

See `.env.example`. Set these in Netlify under Site settings > Environment variables:

- `NVIDIA_API_KEY  from build.nvidia.com (free, no credit card)
- `NVIDIA_MODEL   optional, defaults to meta/llama-4-maverick-17b-128e-instruct
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project

The Gemini free tier Free tier, ~40 RPM. See build.nvidia.com/models for the full catalog.

## Deploy

1. Push this repo to GitHub
2. In Netlify, "Add new site" > "Import an existing project" and pick the repo
3. Netlify reads `netlify.toml` automatically (build `npm run build`, publish `dist`, functions `netlify/functions`)
4. Add the environment variables above
5. Deploy

## Privacy note

This is a demonstration, built to make tracking visible. The only thing it stores server side is the ephemeral Supabase presence channel that powers the live globe. Everything else is computed in your browser or fetched on the fly.

## License

MIT
