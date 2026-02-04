import { randomUUID } from "node:crypto";

export type CreditLedgerEntry = {
  id: string;
  playerRef: string;
  deltaSessions: number;
  reason: "purchase" | "consume" | "refund" | "adjustment";
  source: "stripe" | "usdc" | "system" | "admin";
  externalRef?: string | null;
  idempotencyKey?: string | null;
  meta?: Record<string, any> | null;
  createdAt: number; // ms epoch
};

export interface CreditsStore {
  getBalance(playerRef: string): Promise<number>;
  addLedger(entry: Omit<CreditLedgerEntry, "id" | "createdAt">): Promise<CreditLedgerEntry>;
  /** Optional: idempotency for webhook events */
  recordWebhookEvent?: (provider: "stripe", eventId: string) => Promise<boolean> | boolean;
  listLedger(playerRef: string, limit?: number): Promise<CreditLedgerEntry[]>;
  consumeOneSession(playerRef: string, sessionId: string, idempotencyKey?: string): Promise<{ ok: true; balance: number } | { ok: false; reason: "INSUFFICIENT" | "DUPLICATE" }>;
}

/**
 * In-memory store for MVP/dev. Replace with DB implementation.
 * NOTE: For production, implement this with Postgres/SQLite and proper transactions.
 */
export class InMemoryCreditsStore implements CreditsStore {
  private balances = new Map<string, number>();
  private ledger: CreditLedgerEntry[] = [];
  private consumeIdem = new Set<string>(); // playerRef|sessionId|idemKey
  private webhookEvents = new Set<string>(); // provider|eventId

  recordWebhookEvent(provider: "stripe", eventId: string): boolean {
    const k = `${provider}|${eventId}`;
    if (this.webhookEvents.has(k)) return false;
    this.webhookEvents.add(k);
    return true;
  }

  async getBalance(playerRef: string): Promise<number> {
    return this.balances.get(playerRef) ?? 0;
  }

  async addLedger(entry: Omit<CreditLedgerEntry, "id" | "createdAt">): Promise<CreditLedgerEntry> {
    const cur = await this.getBalance(entry.playerRef);
    const next = cur + entry.deltaSessions;
    if (next < 0) throw new Error("INSUFFICIENT_SESSIONS");

    const full: CreditLedgerEntry = { ...entry, id: randomUUID(), createdAt: Date.now() };
    this.ledger.push(full);
    this.balances.set(entry.playerRef, next);
    return full;
  }

  async listLedger(playerRef: string, limit = 100): Promise<CreditLedgerEntry[]> {
    return this.ledger.filter(x => x.playerRef === playerRef).slice(-limit).reverse();
  }

  async consumeOneSession(playerRef: string, sessionId: string, idempotencyKey = "") {
    const key = `${playerRef}|${sessionId}|${idempotencyKey}`;
    if (idempotencyKey && this.consumeIdem.has(key)) {
      return { ok: false as const, reason: "DUPLICATE" as const };
    }
    const bal = await this.getBalance(playerRef);
    if (bal < 1) return { ok: false as const, reason: "INSUFFICIENT" as const };

    if (idempotencyKey) this.consumeIdem.add(key);

    await this.addLedger({
      playerRef,
      deltaSessions: -1,
      reason: "consume",
      source: "system",
      externalRef: sessionId,
      idempotencyKey,
      meta: { idempotencyKey }
    });

    return { ok: true as const, balance: await this.getBalance(playerRef) };
  }
}
