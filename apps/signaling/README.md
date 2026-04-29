# @staves/signaling

A `y-webrtc` compatible signaling server that runs on a Cloudflare Worker.

A single named Durable Object holds the `topic -> subscribers` map for every
client, and the WebSocket Hibernation API is used so idle connections don't
keep the DO active.

## Local development

```sh
pnpm --filter @staves/signaling dev
```

This boots `wrangler dev` on `http://localhost:8787`. Point the web app at it
by setting `VITE_SIGNALING_SERVER=ws://localhost:8787` before `pnpm dev`.

## Deploy

```sh
pnpm --filter @staves/signaling deploy
```

You'll need `CLOUDFLARE_API_TOKEN` (and optionally `CLOUDFLARE_ACCOUNT_ID`) in
your environment. CI handles this automatically — see
`.github/workflows/deploy-signaling.yml`.

The default deployed URL is
`wss://staves-signaling.<your-account-subdomain>.workers.dev`. Set
`VITE_SIGNALING_SERVER` in the web app's build environment to that URL.

## Protocol

Matches the reference y-webrtc signaling server. Messages are JSON over a
single WebSocket connection:

| `type`        | payload                          | behavior                                              |
| ------------- | -------------------------------- | ----------------------------------------------------- |
| `subscribe`   | `{ topics: string[] }`           | subscribe this socket to each topic                   |
| `unsubscribe` | `{ topics: string[] }`           | unsubscribe                                           |
| `publish`     | `{ topic: string, ...payload }`  | forward to every subscriber of `topic` (sender too)   |
| `ping`        | —                                | server replies `{ type: 'pong' }`                     |
