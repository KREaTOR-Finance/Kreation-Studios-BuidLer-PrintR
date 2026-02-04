export type RiskTier = "SAFE" | "BOLD" | "LEGEND";
export type Direction = "UP" | "DOWN";

export type RoundRecord = {
  roundId: string;
  playerRef: string;
  sessionId?: string | null;
  tier: RiskTier;
  direction: Direction;
  status: "WIN" | "MISS";
  pointsDelta: number;
  streakDelta: number;
  randomnessHex: string;
  z: number;
  requestId: string;
  nonce: string;
  signature: string;
  proofRef?: string | null;
  proof?: Record<string, any> | null;
  requestedAt: number;
  fulfilledAt: number;
};

export type PlayerProfile = {
  playerRef: string;
  points: number;
  streak: number;
  totalRounds: number;
  updatedAt: number;
};

export interface RoundsStore {
  getProfile(playerRef: string): Promise<PlayerProfile>;
  getRound(roundId: string): Promise<RoundRecord | null>;
  resetPoints(playerRef: string): Promise<PlayerProfile>;
  recordRound(round: RoundRecord): Promise<{ round: RoundRecord; profile: PlayerProfile; created: boolean }>;
  listRounds(playerRef: string, limit?: number): Promise<RoundRecord[]>;
}

export class InMemoryRoundsStore implements RoundsStore {
  private profiles = new Map<string, PlayerProfile>();
  private rounds = new Map<string, RoundRecord>();

  async getProfile(playerRef: string): Promise<PlayerProfile> {
    const existing = this.profiles.get(playerRef);
    if (existing) return existing;
    const profile: PlayerProfile = {
      playerRef,
      points: 0,
      streak: 0,
      totalRounds: 0,
      updatedAt: Date.now()
    };
    this.profiles.set(playerRef, profile);
    return profile;
  }

  async getRound(roundId: string): Promise<RoundRecord | null> {
    return this.rounds.get(roundId) ?? null;
  }

  async resetPoints(playerRef: string): Promise<PlayerProfile> {
    const profile = await this.getProfile(playerRef);
    const next: PlayerProfile = {
      ...profile,
      points: 0,
      updatedAt: Date.now()
    };
    this.profiles.set(playerRef, next);
    return next;
  }

  async recordRound(round: RoundRecord): Promise<{ round: RoundRecord; profile: PlayerProfile; created: boolean }> {
    const existing = this.rounds.get(round.roundId);
    if (existing) {
      const profile = await this.getProfile(round.playerRef);
      return { round: existing, profile, created: false };
    }

    const profile = await this.getProfile(round.playerRef);
    const points = Math.max(0, profile.points + round.pointsDelta);
    const streak = Math.max(0, profile.streak + round.streakDelta);
    const next: PlayerProfile = {
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

  async listRounds(playerRef: string, limit = 50): Promise<RoundRecord[]> {
    const rows = Array.from(this.rounds.values()).filter(r => r.playerRef === playerRef);
    return rows.sort((a, b) => b.fulfilledAt - a.fulfilledAt).slice(0, limit);
  }
}
