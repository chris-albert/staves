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
├── apps/web/              # React SPA (Vite + TanStack Router + Tailwind)
├── packages/
│   ├── audio-engine/      # Web Audio API layer (transport, recording, playback)
│   ├── storage/           # IndexedDB via Dexie (projects, tracks, clips, audio blobs)
│   ├── sync/              # Real-time collaboration (Yjs + y-webrtc)
│   └── ui/                # Shared UI primitives (Button, Slider, Knob, Dialog)
├── turbo.json
└── pnpm-workspace.yaml
```
