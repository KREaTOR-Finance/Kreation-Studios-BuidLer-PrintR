import { randomUUID } from "node:crypto";

export type ReceiptEntry = {
  id: string;
  playerRef: string;
  deltaSessions: number;
  deltaPoints: number;
  reason: string;
  source: string;
  externalRef?: string | null;
  meta?: Record<string, any> | null;
  createdAt: number;
};

export interface ReceiptsStore {
  record(entry: Omit<ReceiptEntry, "id" | "createdAt">): Promise<ReceiptEntry>;
  list(playerRef: string, limit?: number): Promise<ReceiptEntry[]>;
}

export class InMemoryReceiptsStore implements ReceiptsStore {
  private ledger: ReceiptEntry[] = [];

  async record(entry: Omit<ReceiptEntry, "id" | "createdAt">): Promise<ReceiptEntry> {
    const full: ReceiptEntry = { ...entry, id: randomUUID(), createdAt: Date.now() };
    this.ledger.push(full);
    return full;
  }

  async list(playerRef: string, limit = 100): Promise<ReceiptEntry[]> {
    return this.ledger.filter(r => r.playerRef === playerRef).slice(-limit).reverse();
  }
}
