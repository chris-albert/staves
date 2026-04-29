# Staves

A browser-based DAW (Digital Audio Workstation) for two musicians to record and arrange ideas collaboratively in real-time. Built as a client-side SPA with audio and projects stored in IndexedDB, and real-time collaboration via WebRTC using Yjs CRDTs.

## Prerequisites

- Node.js >= 18 (22 recommended — see `.nvmrc`)
- pnpm

```sh
# If using nvm
nvm use
```

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev
```

Opens the web app at `http://localhost:5173`.

## Build

```sh
pnpm build
```

Production output goes to `apps/web/dist/`.

## Tests

```sh
pnpm test
```

## Project Structure

```
staves/
├── apps/
│   ├── web/               # React SPA (Vite + TanStack Router + Tailwind)
│   └── signaling/         # Cloudflare Worker — y-webrtc signaling server
├── packages/
│   ├── audio-engine/      # Web Audio API layer (transport, recording, playback)
│   ├── storage/           # IndexedDB via Dexie (projects, tracks, clips, audio blobs)
│   ├── sync/              # Real-time collaboration (Yjs + y-webrtc)
│   └── ui/                # Shared UI primitives (Button, Slider, Knob, Dialog)
├── turbo.json
└── pnpm-workspace.yaml
```

## Deployment

- **Web** (`apps/web`) deploys to Cloudflare Pages on push to `main` via
  `.github/workflows/deploy-web.yml`. Project name: `staves`.
- **Signaling** (`apps/signaling`) deploys to a Cloudflare Worker on push to
  `main` via `.github/workflows/deploy-signaling.yml`.

Both workflows need these GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN` — token with `Workers Scripts:Edit` and
  `Cloudflare Pages:Edit` permissions
- `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID

And one repository variable (Settings → Variables):

- `VITE_SIGNALING_SERVER` — the deployed signaling URL, e.g.
  `wss://staves-signaling.<account-subdomain>.workers.dev`. Set this _after_
  the first signaling deploy. Without it the web app falls back to the public
  `wss://signaling.yjs.dev` server.
