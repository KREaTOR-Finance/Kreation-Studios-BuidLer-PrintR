export type EntitlementMode = "play" | "spectate";

export type SessionEntitlement = {
  sessionId: string;
  playerRef: string;
  mode: EntitlementMode;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
};

export interface EntitlementsStore {
  list(playerRef: string): Promise<SessionEntitlement[]>;
  get(playerRef: string, sessionId: string): Promise<SessionEntitlement | null>;
  upsert(entry: SessionEntitlement): Promise<SessionEntitlement>;
  remove(playerRef: string, sessionId: string): Promise<void>;
}

export class InMemoryEntitlementsStore implements EntitlementsStore {
  private store = new Map<string, Map<string, SessionEntitlement>>();

  async list(playerRef: string): Promise<SessionEntitlement[]> {
    return Array.from(this.store.get(playerRef)?.values() ?? []);
  }

  async get(playerRef: string, sessionId: string): Promise<SessionEntitlement | null> {
    return this.store.get(playerRef)?.get(sessionId) ?? null;
  }

  async upsert(entry: SessionEntitlement): Promise<SessionEntitlement> {
    const playerMap = this.store.get(entry.playerRef) ?? new Map<string, SessionEntitlement>();
    const existing = playerMap.get(entry.sessionId);
    const merged: SessionEntitlement = existing
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

  async remove(playerRef: string, sessionId: string): Promise<void> {
    const playerMap = this.store.get(playerRef);
    if (!playerMap) return;
    playerMap.delete(sessionId);
    if (playerMap.size === 0) this.store.delete(playerRef);
  }
}
