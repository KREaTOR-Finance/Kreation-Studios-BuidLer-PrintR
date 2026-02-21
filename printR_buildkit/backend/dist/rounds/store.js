export class InMemoryRoundsStore {
    profiles = new Map();
    rounds = new Map();
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
    async getRound(roundId) {
        return this.rounds.get(roundId) ?? null;
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
    async recordRound(round) {
        const existing = this.rounds.get(round.roundId);
        if (existing) {
            const profile = await this.getProfile(round.playerRef);
            return { round: existing, profile, created: false };
        }
        const profile = await this.getProfile(round.playerRef);
        const points = Math.max(0, profile.points + round.pointsDelta);
        const streak = Math.max(0, profile.streak + round.streakDelta);
        const next = {
            ...profile,
            points,
            streak,
            totalRounds: profile.totalRounds + 1,
            updatedAt: Date.now()
        };
        this.profiles.set(round.playerRef, next);
        this.rounds.set(round.roundId, { ...round, proof: round.proof ?? null, proofRef: round.proofRef ?? null });
        return { round, profile: next, created: true };
    }
    async listRounds(playerRef, limit = 50) {
        const rows = Array.from(this.rounds.values()).filter(r => r.playerRef === playerRef);
        return rows.sort((a, b) => b.fulfilledAt - a.fulfilledAt).slice(0, limit);
    }
}
