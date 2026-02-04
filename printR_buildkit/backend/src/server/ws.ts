import WebSocket, { WebSocketServer } from "ws";
import { ClientEventSchema, type ClientEvent } from "../types/events.js";

export type WsClient = { ws: WebSocket; playerId: string; sessionSubs: Set<string> };

export class WsHub {
  private wss: WebSocketServer;
  private clients = new Set<WsClient>();
  private onClientEvent?: (playerId: string, ev: ClientEvent) => void;

  constructor(server: any, onClientEvent?: (playerId: string, ev: ClientEvent) => void) {
    this.wss = new WebSocketServer({ server });
    this.onClientEvent = onClientEvent;
    this.wss.on("connection", (ws) => this.onConn(ws));
  }

  private onConn(ws: WebSocket) {
    const url = new URL(ws.url ?? "", "http://localhost");
    const playerId = url.searchParams.get("playerId") ?? "00000000-0000-0000-0000-000000000000";
    const client: WsClient = { ws, playerId, sessionSubs: new Set() };
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
