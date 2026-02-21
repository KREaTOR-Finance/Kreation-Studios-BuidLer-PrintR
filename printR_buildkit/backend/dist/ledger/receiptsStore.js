import { randomUUID } from "node:crypto";
export class InMemoryReceiptsStore {
    ledger = [];
    async record(entry) {
        const full = { ...entry, id: randomUUID(), createdAt: Date.now() };
        this.ledger.push(full);
        return full;
    }
    async list(playerRef, limit = 100) {
        return this.ledger.filter(r => r.playerRef === playerRef).slice(-limit).reverse();
    }
}
