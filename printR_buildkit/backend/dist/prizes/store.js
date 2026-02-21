import { randomUUID } from "node:crypto";
export class InMemoryPrizesStore {
    profiles = new Map();
    claims = [];
    async getProfile(playerRef) {
        const existing = this.profiles.get(playerRef);
        if (existing)
            return existing;
        const profile = {
            playerRef,
            points: 0,
            streak: 0,
            totalRounds: 0,
            updatedAt: Date.now()
        };
        this.profiles.set(playerRef, profile);
        return profile;
    }
    async listClaims(playerRef) {
        return this.claims.filter(c => c.playerRef === playerRef);
    }
    async resetPoints(playerRef) {
        const profile = await this.getProfile(playerRef);
        const next = {
            ...profile,
            points: 0,
            updatedAt: Date.now()
        };
        this.profiles.set(playerRef, next);
        return next;
    }
    async claimPrize(playerRef, prizeId, costPoints) {
        const existing = this.claims.find(c => c.playerRef === playerRef && c.prizeId === prizeId);
        if (existing) {
            const profile = await this.getProfile(playerRef);
            return { claim: existing, profile };
        }
        const profile = await this.getProfile(playerRef);
        if (profile.points < costPoints) {
            throw new Error("INSUFFICIENT_POINTS");
        }
        const claim = {
            id: randomUUID(),
            playerRef,
            prizeId,
            costPoints,
            status: "PENDING",
            createdAt: Date.now()
        };
        this.claims.push(claim);
        const next = {
            ...profile,
            points: Math.max(0, profile.points - costPoints),
            updatedAt: Date.now()
        };
        this.profiles.set(playerRef, next);
        return { claim, profile: next };
    }
}
