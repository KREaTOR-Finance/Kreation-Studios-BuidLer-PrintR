export class InMemoryEntitlementsStore {
    store = new Map();
    async list(playerRef) {
        return Array.from(this.store.get(playerRef)?.values() ?? []);
    }
    async get(playerRef, sessionId) {
        return this.store.get(playerRef)?.get(sessionId) ?? null;
    }
    async upsert(entry) {
        const playerMap = this.store.get(entry.playerRef) ?? new Map();
        const existing = playerMap.get(entry.sessionId);
        const merged = existing
            ? {
                ...existing,
                mode: existing.mode === "play" || entry.mode === "play" ? "play" : "spectate",
                lastSeenAt: entry.lastSeenAt,
                expiresAt: Math.max(existing.expiresAt, entry.expiresAt)
            }
            : entry;
        playerMap.set(entry.sessionId, merged);
        this.store.set(entry.playerRef, playerMap);
        return merged;
    }
    async remove(playerRef, sessionId) {
        const playerMap = this.store.get(playerRef);
        if (!playerMap)
            return;
        playerMap.delete(sessionId);
        if (playerMap.size === 0)
            this.store.delete(playerRef);
    }
}
