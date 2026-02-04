export type ServerEvent =
  | { type: "TICK"; sessionId: string; tickIndex: number; price: number; r: number; rMax: number; demand: number; vrf: { requestId: string; proofRef?: string; z: number; proof?: { provider: "switchboard"; randomnessAccount?: string; commitTxSig?: string; revealTxSig?: string; committedSlot?: number; revealedSlot?: number; outputHex?: string; fetchedAtMs?: number } } }
  | { type: "PLAYER_HUD"; sessionId: string; playerId: string; scoreRealized: number; scoreDisplay: number; markersRemaining: number; hasOpen: boolean; openPosition: any; flags: any }
  | { type: "FX_EVENT"; sessionId: string; playerId: string; fx: string; atTickIndex: number; meta?: any }
  | { type: "SESSION_STATE"; sessionId: string; phase: string; tickIndex: number; price: number; timeRemainingMs: number; closingRemainingMs: number; marketIndex: number; supply: number; archetype: string; assetName: string };

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers: Array<(ev: ServerEvent) => void> = [];

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (m) => {
      try {
        const ev = JSON.parse(String(m.data)) as ServerEvent;
        this.handlers.forEach(h => h(ev));
      } catch {}
    };
  }

  onEvent(cb: (ev: ServerEvent) => void) { this.handlers.push(cb); }

  send(msg: any) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
}
