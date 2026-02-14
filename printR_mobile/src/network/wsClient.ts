import AsyncStorage from "@react-native-async-storage/async-storage";

export type ServerEvent =
  | { type: "TICK"; sessionId: string; tickIndex: number; price: number; r: number; rMax: number; demand: number; phase?: string; timeRemainingMs?: number; closingRemainingMs?: number; vrf: { requestId: string; proofRef?: string; z: number; proof?: { provider: "switchboard"; randomnessAccount?: string; commitTxSig?: string; revealTxSig?: string; committedSlot?: number; revealedSlot?: number; outputHex?: string; fetchedAtMs?: number } } }
  | { type: "PLAYER_HUD"; sessionId: string; playerId: string; scoreRealized: number; scoreDisplay: number; markersRemaining: number; hasOpen: boolean; openPosition: any; flags: any }
  | { type: "FX_EVENT"; sessionId: string; playerId: string; fx: string; atTickIndex: number; meta?: any }
  | { type: "SESSION_STATE"; sessionId: string; phase: string; tickIndex: number; price: number; timeRemainingMs: number; closingRemainingMs: number; marketIndex: number; supply: number; archetype: string; assetName: string; history?: Array<{ tickIndex: number; price: number }> };

const WS_PLAYER_KEY = "printr_ws_player_id";
let cachedWsPlayerId: string | null = null;

export async function getWsPlayerId(): Promise<string> {
  if (cachedWsPlayerId) return cachedWsPlayerId;
  const existing = await AsyncStorage.getItem(WS_PLAYER_KEY);
  if (existing && isUuid(existing)) {
    cachedWsPlayerId = existing;
    return existing;
  }
  const id = generateUuid();
  await AsyncStorage.setItem(WS_PLAYER_KEY, id);
  cachedWsPlayerId = id;
  return id;
}

export function getWsPlayerIdSync(): string {
  return cachedWsPlayerId ?? "pending";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers: Array<(ev: ServerEvent) => void> = [];
  private pending: string[] = [];

  connect(url: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const socket = new WebSocket(url);
    this.ws = socket;
    socket.onopen = () => {
      if (this.ws !== socket) return;
      const queued = this.pending.slice();
      this.pending = [];
      queued.forEach((msg) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(msg);
      });
    };
    socket.onmessage = (m: any) => {
      try {
        const ev = JSON.parse(String(m.data)) as ServerEvent;
        this.handlers.forEach(h => h(ev));
      } catch {}
    };
    socket.onclose = () => {
      if (this.ws === socket) this.ws = null;
    };
  }

  onEvent(cb: (ev: ServerEvent) => void) {
    this.handlers.push(cb);
    return () => {
      this.handlers = this.handlers.filter(h => h !== cb);
    };
  }

  send(msg: any) {
    const payload = JSON.stringify(msg);
    const socket = this.ws;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(payload);
      return;
    }
    this.pending.push(payload);
  }

  close() {
    this.pending = [];
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;
  }
}
