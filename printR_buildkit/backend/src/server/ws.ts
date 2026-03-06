import WebSocket, { WebSocketServer } from "ws";
import type { IncomingMessage } from "node:http";
import { ClientEventSchema, type ClientEvent } from "../types/events.js";

export type WsClient = { ws: WebSocket; playerId: string; wallet?: string; sessionSubs: Set<string> };

export class WsHub {
  private wss: WebSocketServer;
  private clients = new Set<WsClient>();
  private onClientEvent?: (playerId: string, ev: ClientEvent) => void;

  constructor(server: any, onClientEvent?: (playerId: string, ev: ClientEvent) => void) {
    // Use same-origin WS endpoint for mobile webviews: ws(s)://host:PORT/ws
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.onClientEvent = onClientEvent;
    this.wss.on("connection", (ws, req) => { void this.onConn(ws, req); });
  }

  private async onConn(ws: WebSocket, req: IncomingMessage) {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token") ?? "";
    const claims = token ? (await import("../auth/tokens.js")).verifyToken(token) : null;
    const wallet = claims?.wallet;
    if (!wallet) {
      try { ws.close(1008, "UNAUTHORIZED"); } catch {}
      return;
    }

    // Canonical identity for WS + engine: wallet pubkey.
    const playerId = wallet;
    const client: WsClient = { ws, playerId, wallet, sessionSubs: new Set() };
    this.clients.add(client);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const ev = ClientEventSchema.parse(msg);
        this.onClientEvent?.(playerId, ev);
      } catch {}
    });

    ws.on("close", () => { this.clients.delete(client); });
  }

  broadcastToSession(sessionId: string, event: any) {
    const payload = JSON.stringify(event);
    for (const c of this.clients) if (c.sessionSubs.has(sessionId)) c.ws.send(payload);
  }

  sendToPlayer(playerId: string, event: any) {
    const payload = JSON.stringify(event);
    for (const c of this.clients) if (c.playerId === playerId) c.ws.send(payload);
  }

  subscribe(playerId: string, sessionId: string) {
    for (const c of this.clients) if (c.playerId === playerId) c.sessionSubs.add(sessionId);
  }

  getClients() { return this.clients; }
}
