import { randomUUID } from "node:crypto";
export class InMemoryAnalyticsStore {
    events = [];
    async record(entry) {
        const full = { ...entry, id: randomUUID(), createdAt: Date.now() };
        this.events.push(full);
        return full;
    }
}
