import { randomUUID } from "node:crypto";
import type { PlayerProfile } from "../rounds/store";

export type PrizeClaimStatus = "PENDING" | "FULFILLED";

export type PrizeClaim = {
  id: string;
  playerRef: string;
  prizeId: string;
  costPoints: number;
  status: PrizeClaimStatus;
  createdAt: number;
  meta?: Record<string, any> | null;
};

export interface PrizesStore {
  getProfile(playerRef: string): Promise<PlayerProfile>;
  listClaims(playerRef: string): Promise<PrizeClaim[]>;
  resetPoints(playerRef: string): Promise<PlayerProfile>;
  claimPrize(playerRef: string, prizeId: string, costPoints: number): Promise<{ claim: PrizeClaim; profile: PlayerProfile }>;
}

export class InMemoryPrizesStore implements PrizesStore {
  private profiles = new Map<string, PlayerProfile>();
  private claims: PrizeClaim[] = [];

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

  async listClaims(playerRef: string): Promise<PrizeClaim[]> {
    return this.claims.filter(c => c.playerRef === playerRef);
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

  async claimPrize(playerRef: string, prizeId: string, costPoints: number): Promise<{ claim: PrizeClaim; profile: PlayerProfile }> {
    const existing = this.claims.find(c => c.playerRef === playerRef && c.prizeId === prizeId);
    if (existing) {
      const profile = await this.getProfile(playerRef);
      return { claim: existing, profile };
    }

    const profile = await this.getProfile(playerRef);
    if (profile.points < costPoints) {
      throw new Error("INSUFFICIENT_POINTS");
    }

    const claim: PrizeClaim = {
      id: randomUUID(),
      playerRef,
      prizeId,
      costPoints,
      status: "PENDING",
      createdAt: Date.now()
    };
    this.claims.push(claim);
    const next: PlayerProfile = {
      ...profile,
      points: Math.max(0, profile.points - costPoints),
      updatedAt: Date.now()
    };
    this.profiles.set(playerRef, next);
    return { claim, profile: next };
  }
}
