export type Direction = "UP" | "DOWN";
export type RiskTier = "SAFE" | "BOLD" | "LEGEND";

export type View =
  | "home"
  | "live"
  | "result"
  | "progress"
  | "store"
  | "governance"
  | "profile"
  | "vault"
  | "leaderboard"
  | "history";

export type RoundResult = {
  outcome: "WIN" | "MISS";
  pointsDelta: number;
  streakDelta: number;
  reason: string; // mastery copy
  tier: RiskTier;
  direction: Direction;
  durationMs: number;
};

export type PendingSettlement = null | {
  roundId: string;
  provider: "SIM" | "ONCHAIN";
  requestId: string;     // provider request id / tx signature
  submittedAt: number;
};

export type JoinInfo = null | {
  mode: "play" | "spectate";
  phase: "LIVE" | "FINAL_COMMIT_WARNING" | "CLOSING";
  sessionId: string;
};

export type GameState = {
  view: View;
  points: number;
  streak: number;
  tokens: number; // arcade credits (non-transferable)
  selection: { direction: Direction; tier: RiskTier };

  live: null | { startedAt: number; durationMs: number; endsAt: number };
  pending: PendingSettlement;   // async VRF settlement
  result: null | RoundResult;
  join: JoinInfo;
};

export type GameEvent =
  | { type: "SET_DIRECTION"; direction: Direction }
  | { type: "SET_TIER"; tier: RiskTier }
  | { type: "PLAY_REQUESTED" }
  | { type: "ROUND_STARTED"; now: number; durationMs: number }
  | { type: "SETTLEMENT_REQUESTED"; roundId: string; provider: "SIM" | "ONCHAIN"; requestId: string; submittedAt: number }
  | { type: "ROUND_RESOLVED"; result: RoundResult; pointsTotal?: number; streakTotal?: number }
  | { type: "ACK_RESULT" }
  | { type: "JOIN_UPDATED"; join: NonNullable<JoinInfo> }
  | { type: "JOIN_CLEARED" }
  | { type: "PROFILE_SYNCED"; points: number; streak: number }
  | { type: "NAVIGATE"; view: View };

export const initialState: GameState = {
  view: "home",
  points: 1250,
  streak: 3,
  tokens: 12,
  selection: { direction: "UP", tier: "SAFE" },
  live: null,
  pending: null,
  result: null,
  join: null
};

const tierConfig: Record<RiskTier, { winPoints: number; reasonWin: string; reasonMiss: string }> = {
  SAFE:   { winPoints: 250,  reasonWin: "SAFE cleared — steady read.",         reasonMiss: "SAFE needs a clean move. Try again." },
  BOLD:   { winPoints: 450,  reasonWin: "BOLD hit — tight timing.",           reasonMiss: "BOLD is a tighter window. Consider SAFE for consistency." },
  LEGEND: { winPoints: 800,  reasonWin: "LEGEND nailed — elite precision.",   reasonMiss: "LEGEND missed — razor-thin window. Keep grinding." }
};

export function durationForTier(tier: RiskTier): number {
  return tier === "SAFE" ? 5200 : tier === "BOLD" ? 6200 : 7200;
}

export function buildResultFromServer(round: {
  tier: RiskTier;
  direction: Direction;
  status: "WIN" | "MISS";
  pointsDelta: number;
  streakDelta: number;
}): RoundResult {
  const cfg = tierConfig[round.tier];
  const win = round.status === "WIN";
  return {
    outcome: win ? "WIN" : "MISS",
    pointsDelta: round.pointsDelta,
    streakDelta: round.streakDelta,
    reason: win ? cfg.reasonWin : cfg.reasonMiss,
    tier: round.tier,
    direction: round.direction,
    durationMs: durationForTier(round.tier)
  };
}

export function reducer(state: GameState, ev: GameEvent): GameState {
  switch(ev.type){
    case "SET_DIRECTION":
      return { ...state, selection: { ...state.selection, direction: ev.direction } };

    case "SET_TIER":
      return { ...state, selection: { ...state.selection, tier: ev.tier } };

    case "PLAY_REQUESTED":
      return state;

    case "ROUND_STARTED":
      return {
        ...state,
        view: "live",
        live: { startedAt: ev.now, durationMs: ev.durationMs, endsAt: ev.now + ev.durationMs },
        pending: null,
        result: null
      };

    case "SETTLEMENT_REQUESTED":
      return {
        ...state,
        pending: { roundId: ev.roundId, provider: ev.provider, requestId: ev.requestId, submittedAt: ev.submittedAt }
      };

    case "ROUND_RESOLVED":
      return {
        ...state,
        view: "result",
        live: null,
        pending: null,
        points: typeof ev.pointsTotal === "number" ? ev.pointsTotal : state.points + ev.result.pointsDelta,
        streak: typeof ev.streakTotal === "number" ? ev.streakTotal : Math.max(0, state.streak + ev.result.streakDelta),
        result: ev.result
      };

    case "ACK_RESULT":
      return { ...state, view: "home", result: null, join: null };

    case "JOIN_UPDATED":
      return { ...state, join: ev.join };

    case "JOIN_CLEARED":
      return { ...state, join: null };

    case "PROFILE_SYNCED":
      return { ...state, points: ev.points, streak: ev.streak };

    case "NAVIGATE":
      return { ...state, view: ev.view };

    default:
      return state;
  }
}

// Local demo resolver (kept for fallback/testing)
export function resolveRound(direction: Direction, tier: RiskTier, randomness?: string): RoundResult {
  const cfg = tierConfig[tier];

  const pWin = tier === "SAFE" ? 0.58 : tier === "BOLD" ? 0.48 : 0.38;
  const u = randomness ? hexToUnit(randomness) : seededUnit(`${direction}:${tier}`);
  const win = u < pWin;

  return {
    outcome: win ? "WIN" : "MISS",
    pointsDelta: win ? cfg.winPoints : 0,
    streakDelta: win ? 1 : -1,
    reason: win ? cfg.reasonWin : cfg.reasonMiss,
    tier,
    direction,
    durationMs: durationForTier(tier)
  };
}

function seededUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    bytes[i] = h & 0xff;
  }
  return bytesToUnit(bytes);
}

function hexToUnit(randomness: string): number {
  const bytes = hexToBytes(randomness);
  return bytes ? bytesToUnit(bytes) : seededUnit(randomness);
}

function hexToBytes(hex: string): Uint8Array | null {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleaned.length === 0 || cleaned.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) return null;
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToUnit(bytes: Uint8Array): number {
  if (bytes.length < 8) return 0;
  let u64 = 0n;
  for (let i = 0; i < 8; i++) {
    u64 = (u64 << 8n) + BigInt(bytes[i]);
  }
  return Number(u64) / 18446744073709551616;
}
