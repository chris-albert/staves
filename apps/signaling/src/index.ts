/**
 * y-webrtc compatible signaling server on Cloudflare Workers.
 *
 * Protocol (matches the reference server in y-webrtc/bin/server.js):
 *   { type: 'subscribe',   topics: string[] }
 *   { type: 'unsubscribe', topics: string[] }
 *   { type: 'publish',     topic: string, ... }   // forwarded to all subscribers of topic
 *   { type: 'ping' }                              // server replies with { type: 'pong' }
 *
 * All sockets are routed to a single named Durable Object so topics are shared
 * across every connected client. Uses the WebSocket Hibernation API so idle
 * connections don't keep the DO billable-active.
 */

interface Env {
  SIGNALING_ROOM: DurableObjectNamespace;
}

interface Attachment {
  topics: string[];
}

interface SubscribeMessage {
  type: 'subscribe' | 'unsubscribe';
  topics?: unknown;
}

interface PublishMessage {
  type: 'publish';
  topic?: unknown;
  [key: string]: unknown;
}

interface PingMessage {
  type: 'ping';
}

type SignalingMessage = SubscribeMessage | PublishMessage | PingMessage;

export class SignalingRoom {
  private state: DurableObjectState;
  private topics: Map<string, Set<WebSocket>>;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    this.topics = new Map();

    // Rebuild the topic index from any sockets that were hibernated.
    for (const ws of this.state.getWebSockets()) {
      const meta = ws.deserializeAttachment() as Attachment | null;
      if (!meta?.topics) continue;
      for (const topic of meta.topics) {
        let subs = this.topics.get(topic);
        if (!subs) {
          subs = new Set();
          this.topics.set(topic, subs);
        }
        subs.add(ws);
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.state.acceptWebSocket(server);
    server.serializeAttachment({ topics: [] } satisfies Attachment);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let msg: SignalingMessage;
    try {
      const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;

    const meta = (ws.deserializeAttachment() as Attachment | null) ?? { topics: [] };
    const subscribed = new Set(meta.topics);

    switch (msg.type) {
      case 'subscribe': {
        const topics = Array.isArray(msg.topics) ? msg.topics : [];
        for (const topic of topics) {
          if (typeof topic !== 'string') continue;
          let subs = this.topics.get(topic);
          if (!subs) {
            subs = new Set();
            this.topics.set(topic, subs);
          }
          subs.add(ws);
          subscribed.add(topic);
        }
        ws.serializeAttachment({ topics: [...subscribed] } satisfies Attachment);
        return;
      }
      case 'unsubscribe': {
        const topics = Array.isArray(msg.topics) ? msg.topics : [];
        for (const topic of topics) {
          if (typeof topic !== 'string') continue;
          this.topics.get(topic)?.delete(ws);
          subscribed.delete(topic);
        }
        ws.serializeAttachment({ topics: [...subscribed] } satisfies Attachment);
        return;
      }
      case 'publish': {
        if (typeof msg.topic !== 'string') return;
        const subs = this.topics.get(msg.topic);
        if (!subs || subs.size === 0) return;
        const payload = JSON.stringify({ ...msg, clients: subs.size });
        for (const sub of subs) {
          try {
            sub.send(payload);
          } catch {
            // The socket will fire close/error and be cleaned up there.
          }
        }
        return;
      }
      case 'ping': {
        try {
          ws.send(JSON.stringify({ type: 'pong' }));
        } catch {
          // ignore
        }
        return;
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.removeFromAllTopics(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.removeFromAllTopics(ws);
  }

  private removeFromAllTopics(ws: WebSocket): void {
    for (const [topic, subs] of this.topics) {
      subs.delete(ws);
      if (subs.size === 0) this.topics.delete(topic);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      // All clients share a single global room map.
      const id = env.SIGNALING_ROOM.idFromName('global');
      const stub = env.SIGNALING_ROOM.get(id);
      return stub.fetch(request);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('staves signaling server: ok\n', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
    }

    return new Response('not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
