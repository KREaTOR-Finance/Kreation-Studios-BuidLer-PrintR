import { WebSocketServer } from "ws";
import { ClientEventSchema } from "../types/events.js";
export class WsHub {
    wss;
    clients = new Set();
    onClientEvent;
    constructor(server, onClientEvent) {
        this.wss = new WebSocketServer({ server });
        this.onClientEvent = onClientEvent;
        this.wss.on("connection", (ws) => this.onConn(ws));
    }
    onConn(ws) {
        const url = new URL(ws.url ?? "", "http://localhost");
        const playerId = url.searchParams.get("playerId") ?? "00000000-0000-0000-0000-000000000000";
        const client = { ws, playerId, sessionSubs: new Set() };
        this.clients.add(client);
        ws.on("message", (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                const ev = ClientEventSchema.parse(msg);
                this.onClientEvent?.(playerId, ev);
            }
            catch { }
        });
        ws.on("close", () => { this.clients.delete(client); });
    }
    broadcastToSession(sessionId, event) {
        const payload = JSON.stringify(event);
        for (const c of this.clients)
            if (c.sessionSubs.has(sessionId))
                c.ws.send(payload);
    }
    sendToPlayer(playerId, event) {
        const payload = JSON.stringify(event);
        for (const c of this.clients)
            if (c.playerId === playerId)
                c.ws.send(payload);
    }
    subscribe(playerId, sessionId) {
        for (const c of this.clients)
            if (c.playerId === playerId)
                c.sessionSubs.add(sessionId);
    }
    getClients() { return this.clients; }
}
