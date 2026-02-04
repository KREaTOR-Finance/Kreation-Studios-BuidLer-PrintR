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

export type GameState = {
  view: View;
  points: number;
  streak: number;
  tokens: number; // arcade credits (non-transferable)
  selection: { direction: Direction; tier: RiskTier };

  live: null | { startedAt: number; durationMs: number; endsAt: number };
  pending: PendingSettlement;   // async VRF settlement
  result: null | RoundResult;
};

export type GameEvent =
  | { type: "SET_DIRECTION"; direction: Direction }
  | { type: "SET_TIER"; tier: RiskTier }
  | { type: "PLAY_REQUESTED" }
  | { type: "ROUND_STARTED"; now: number; durationMs: number }
  | { type: "SETTLEMENT_REQUESTED"; roundId: string; provider: "SIM" | "ONCHAIN"; requestId: string; submittedAt: number }
  | { type: "ROUND_RESOLVED"; result: RoundResult }
  | { type: "ACK_RESULT" }
  | { type: "NAVIGATE"; view: View };

export const initialState: GameState = {
  view: "home",
  points: 1250,
  streak: 3,
  tokens: 12,
  selection: { direction: "UP", tier: "SAFE" },
  live: null,
  pending: null,
  result: null
};

const tierConfig: Record<RiskTier, { winPoints: number; reasonWin: string; reasonMiss: string }> = {
  SAFE:   { winPoints: 250,  reasonWin: "SAFE cleared — steady read.",         reasonMiss: "SAFE needs a clean move. Try again." },
  BOLD:   { winPoints: 450,  reasonWin: "BOLD hit — tight timing.",           reasonMiss: "BOLD is a tighter window. Consider SAFE for consistency." },
  LEGEND: { winPoints: 800,  reasonWin: "LEGEND nailed — elite precision.",   reasonMiss: "LEGEND missed — razor-thin window. Keep grinding." }
};

export function reducer(state: GameState, ev: GameEvent): GameState {
  switch(ev.type){
    case "SET_DIRECTION":
      return { ...state, selection: { ...state.selection, direction: ev.direction } };

    case "SET_TIER":
      return { ...state, selection: { ...state.selection, tier: ev.tier } };

    case "PLAY_REQUESTED":
      if(state.tokens <= 0) return state; // later: route to store
      return { ...state, tokens: state.tokens - 1 };

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
        points: state.points + ev.result.pointsDelta,
        streak: Math.max(0, state.streak + ev.result.streakDelta),
        result: ev.result
      };

    case "ACK_RESULT":
      return { ...state, view: "home", result: null };

    case "NAVIGATE":
      // Prevent navigating away during a live round
      if(state.view === "live") return state;
      return { ...state, view: ev.view };

    default:
      return state;
  }
}

// Local demo resolver (kept for fallback/testing)
export function resolveRound(direction: Direction, tier: RiskTier): RoundResult {
  const cfg = tierConfig[tier];

  const pWin = tier === "SAFE" ? 0.58 : tier === "BOLD" ? 0.48 : 0.38;
  const win = Math.random() < pWin;

  return {
    outcome: win ? "WIN" : "MISS",
    pointsDelta: win ? cfg.winPoints : 0,
    streakDelta: win ? 1 : -1,
    reason: win ? cfg.reasonWin : cfg.reasonMiss,
    tier,
    direction,
    durationMs: tier === "SAFE" ? 5200 : tier === "BOLD" ? 6200 : 7200
  };
}
