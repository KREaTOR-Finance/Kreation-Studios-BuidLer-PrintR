/**
 * PrintR Frontend State Machine (framework-agnostic, React-friendly)
 *
 * v4: Mechanics math implemented (price simulation + demand bias + dynamic clamp + points + break point).
 * - One VRF (random) sample per tick per session (stubbed with deterministic PRNG; wire to Switchboard SRS later).
 * - Supply tiers: 1M / 10M / 100M / 1B (session.supply)
 * - Initial price: 1..100 recommended (session.price at start)
 * - Tick cadence: 5 seconds (event TICK_5S)
 * - Min hold: 1 tick
 * - Max 1 open position per session per player
 * - Percent-based points: 1% move = (C * L) points
 * - P_min = 0.01
 * - Max leverage = 5x
 * - Break Point triggers auto-close (no marker consumed) when lossPoints >= (C/L)
 *
 * IMPORTANT:
 * - This is an arcade points game. All values are simulated and do not represent real assets.
 * - Replace prngZ() with on-chain VRF z-values when wiring settlement.
 */
export type SessionPhase = "LIVE" | "CLOSING" | "ENDED";
export type SessionId = string;
export type PositionId = string;

export type Direction = "LONG" | "SHORT";

export type Archetype =
  | "DEEP_POOL"
  | "STANDARD"
  | "THIN_FLOAT"
  | "WHIPSAW"
  | "TREND_DAY";

export type Position = {
  id: PositionId;
  sessionId: SessionId;
  entryTickIndex: number;
  entryPrice: number;

  committedPoints: number; // 1..1000
  leverage: number;        // 1..5
  direction: Direction;    // LONG | SHORT

  isOpen: boolean;
  wasBreakPoint?: boolean; // forced close due to Break Point
};

export type SessionRuntime = {
  id: SessionId;
  assetName: string;
  accentColorToken: string;

  // Mechanics params (persisted per session)
  supply: number;          // 1_000_000 | 10_000_000 | 100_000_000 | 1_000_000_000
  marketIndex: number;     // 1..100 (regime intensity), generated once per session
  archetype: Archetype;
  seed: number;            // deterministic stub seed (replace with VRF-derived session seed)

  phase: SessionPhase;

  startEpochMs: number;
  endEpochMs: number;
  closingStartEpochMs: number; // end - 2 minutes

  tickIndex: number;           // increments every 5s
  price: number;               // current price
  lastTickEpochMs: number;

  // Scoring
  scoreRealized: number;       // realized points
  scoreDisplay: number;        // realized + unrealized (updated each tick)

  // Ammo (markers)
  markersRemaining: number;

  // Open commits (max 1 open per session by rule)
  positions: Position[];

  // Diagnostics
  breakPointCount: number;
  forfeitCount: number;
};

export type ViewMode = "FOCUS" | "GRID";

export type UIState = {
  viewMode: ViewMode;
  activeSessionId: SessionId;

  commitSliderVisible: boolean;
  commitAmount: number; // 0..1000, snapped

  // v4: directional + leverage selection (UI wiring can be added later)
  commitDirection: Direction;
  commitLeverage: number; // 1..5

  finalCloseRequired: boolean; // computed: markers==1 && hasOpenPosition
};

export type GameState = {
  sessions: Record<SessionId, SessionRuntime>;
  ui: UIState;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
};

export type GameEvent =
  | { type: "SET_VIEW_MODE"; mode: ViewMode }
  | { type: "SELECT_ACTIVE_SESSION"; sessionId: SessionId }
  | { type: "OPEN_COMMIT_SLIDER" }
  | { type: "SET_COMMIT_AMOUNT"; amount: number }
  | { type: "SET_COMMIT_DIRECTION"; direction: Direction }
  | { type: "SET_COMMIT_LEVERAGE"; leverage: number }
  | { type: "CANCEL_COMMIT_SLIDER" }
  | { type: "CONFIRM_COMMIT" }
  | { type: "CLOSE_POSITION"; positionId: PositionId }
  | { type: "TICK_5S"; nowMs: number }
  | { type: "CLOCK_1S"; nowMs: number }
  | { type: "SESSION_PHASE_UPDATE"; sessionId: SessionId; phase: SessionPhase }
  | { type: "PLAYER_LEAVING_SESSION"; sessionId: SessionId };

export function createInitialState(sessions: SessionRuntime[], activeSessionId: SessionId): GameState {
  const map: Record<string, SessionRuntime> = {};
  for (const s of sessions) map[s.id] = s;

  return {
    sessions: map,
    ui: {
      viewMode: "FOCUS",
      activeSessionId,
      commitSliderVisible: false,
      commitAmount: 250,
      commitDirection: "LONG",
      commitLeverage: 1,
      finalCloseRequired: false,
    },
    soundEnabled: true,
    hapticsEnabled: true,
  };
}

/* -----------------------------
 * Constants (finalized v1 defaults)
 * ----------------------------- */

const P_MIN = 0.01;
const PCT_MULT = 100;

// Market-cap reference anchor (tuning knob; coherent across supply tiers)
const MC_REF = 100_000_000;

// Regime mapping g(M): 0.70..1.30
const G_MIN = 0.70;
const G_MAX = 1.30;
const G_GAMMA = 1.15;

// MC damp clamp
const D_MIN = 0.20;
const D_MAX = 3.00;

// Per-tick clamp bounds (5s)
const R_LO = 0.01;  // 1%
const R_HI = 0.10;  // 10%

// Demand normalization constant per player (tune with playtests)
const DEMAND_NORM_PER_PLAYER = 1000;

// Cap realized points per position (prevents one spike dominating)
function pointsCap(committed: number, leverage: number): number {
  return committed * leverage * 5;
}

// Break Point threshold multiplier (lossPoints >= (C/L) * K)
const BREAK_K = 1.0;

// Enforce max leverage
const LEV_MAX = 5;

// Min hold ticks before close
const MIN_HOLD_TICKS = 1;

/* -----------------------------
 * Helpers
 * ----------------------------- */

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function snapCommitAmount(amount: number): number {
  const snaps = [0, 100, 250, 500, 750, 1000];
  const a = clamp(amount, 0, 1000);
  let best = snaps[0];
  let bestDist = Infinity;
  for (const s of snaps) {
    const d = Math.abs(s - a);
    if (d < bestDist) { best = s; bestDist = d; }
  }
  return best;
}

function recomputeFinalCloseRequired(s: GameState): GameState {
  const active = s.sessions[s.ui.activeSessionId];
  const hasOpen = active.positions.some(p => p.isOpen);
  const finalCloseRequired = hasOpen && active.markersRemaining === 1;
  return { ...s, ui: { ...s.ui, finalCloseRequired } };
}

// Deterministic PRNG (Mulberry32). Replace with on-chain VRF-derived z-values.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One VRF per tick per session → z ∈ [-1, +1]
function prngZ(sessionSeed: number, tickIndex: number): number {
  const rnd = mulberry32((sessionSeed ^ (tickIndex * 2654435761)) >>> 0)();
  return rnd * 2 - 1;
}

function marketRegimeMultiplier(marketIndex: number): number {
  const x = clamp((marketIndex - 1) / 99, 0, 1);
  return G_MIN + (G_MAX - G_MIN) * Math.pow(x, G_GAMMA);
}

function mcDamp(mc: number): number {
  const raw = Math.sqrt(MC_REF / (mc + 1e-9));
  return clamp(raw, D_MIN, D_MAX);
}

function archetypeParams(a: Archetype): { sigma0: number; beta0: number; mArch: number } {
  switch (a) {
    case "DEEP_POOL":
      return { sigma0: 0.020, beta0: 0.010, mArch: 0.70 };
    case "STANDARD":
      return { sigma0: 0.030, beta0: 0.015, mArch: 1.00 };
    case "THIN_FLOAT":
      return { sigma0: 0.050, beta0: 0.025, mArch: 1.25 };
    case "WHIPSAW":
      return { sigma0: 0.040, beta0: 0.012, mArch: 1.10 };
    case "TREND_DAY":
      return { sigma0: 0.035, beta0: 0.020, mArch: 0.95 };
  }
}

// Demand: net exposure normalized to [-1, +1]
function computeDemand(session: SessionRuntime, activePlayers: number): number {
  let eLong = 0;
  let eShort = 0;

  for (const p of session.positions) {
    if (!p.isOpen) continue;
    const exposure = p.committedPoints * p.leverage;
    if (p.direction === "LONG") eLong += exposure;
    else eShort += exposure;
  }

  const denom = Math.max(1, activePlayers) * DEMAND_NORM_PER_PLAYER * 1; // L_ref=1
  return clamp((eLong - eShort) / denom, -1, 1);
}

function rMaxDynamic(session: SessionRuntime): number {
  const mc = session.supply * session.price;
  const g = marketRegimeMultiplier(session.marketIndex);
  const d = mcDamp(mc);
  const { mArch } = archetypeParams(session.archetype);

  const raw = R_HI * g * d * mArch;
  // clamp within [R_LO, R_HI]
  return clamp(raw, R_LO, R_HI);
}

function computeTickReturn(session: SessionRuntime, z: number, demand: number): number {
  const mc = session.supply * session.price;
  const g = marketRegimeMultiplier(session.marketIndex);
  const d = mcDamp(mc);
  const { sigma0, beta0 } = archetypeParams(session.archetype);

  const sigma = sigma0 * g * d;
  const beta = beta0 * g * d;

  const r = (sigma * z) + (beta * demand);
  const rMax = rMaxDynamic(session);

  return clamp(r, -rMax, rMax);
}

function unrealizedPointsForPosition(pos: Position, currentPrice: number): number {
  const dir = pos.direction === "LONG" ? 1 : -1;
  if (pos.entryPrice <= 0) return 0;
  const pctMove = (currentPrice - pos.entryPrice) / pos.entryPrice;
  return pos.committedPoints * pos.leverage * dir * (pctMove * PCT_MULT);
}

function realizedPointsOnClose(pos: Position, currentPrice: number): number {
  const u = unrealizedPointsForPosition(pos, currentPrice);
  const cap = pointsCap(pos.committedPoints, pos.leverage);
  return clamp(u, -cap, cap);
}

function breakPointTriggered(pos: Position, currentPrice: number): boolean {
  const u = unrealizedPointsForPosition(pos, currentPrice);
  const lossPoints = Math.max(0, -u);
  const budget = (pos.committedPoints / pos.leverage) * BREAK_K;
  return lossPoints >= budget;
}

function recomputeScoreDisplay(session: SessionRuntime): SessionRuntime {
  let unreal = 0;
  for (const p of session.positions) {
    if (!p.isOpen) continue;
    unreal += unrealizedPointsForPosition(p, session.price);
  }
  return { ...session, scoreDisplay: session.scoreRealized + unreal };
}

/* -----------------------------
 * Reducer
 * ----------------------------- */

export function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "SET_VIEW_MODE":
      return { ...state, ui: { ...state.ui, viewMode: event.mode } };

    case "SELECT_ACTIVE_SESSION": {
      if (!state.sessions[event.sessionId]) return state;
      const next = { ...state, ui: { ...state.ui, activeSessionId: event.sessionId, commitSliderVisible: false } };
      return recomputeFinalCloseRequired(next);
    }

    case "SET_COMMIT_DIRECTION":
      return { ...state, ui: { ...state.ui, commitDirection: event.direction } };

    case "SET_COMMIT_LEVERAGE":
      return { ...state, ui: { ...state.ui, commitLeverage: clamp(event.leverage, 1, LEV_MAX) } };

    case "OPEN_COMMIT_SLIDER": {
      const s = state.sessions[state.ui.activeSessionId];
      if (!s) return state;
      if (s.phase !== "LIVE") return state;
      if (s.markersRemaining <= 0) return state;

      // Enforce max 1 open position per session
      const hasOpen = s.positions.some(p => p.isOpen);
      if (hasOpen) return state;

      return { ...state, ui: { ...state.ui, commitSliderVisible: true } };
    }

    case "SET_COMMIT_AMOUNT":
      return { ...state, ui: { ...state.ui, commitAmount: snapCommitAmount(event.amount) } };

    case "CANCEL_COMMIT_SLIDER":
      return { ...state, ui: { ...state.ui, commitSliderVisible: false } };

    case "CONFIRM_COMMIT": {
      const session = state.sessions[state.ui.activeSessionId];
      if (!session) return state;
      if (session.phase !== "LIVE") return { ...state, ui: { ...state.ui, commitSliderVisible: false } };

      if (session.markersRemaining <= 0) return { ...state, ui: { ...state.ui, commitSliderVisible: false } };

      // Enforce max 1 open
      const hasOpen = session.positions.some(p => p.isOpen);
      if (hasOpen) return { ...state, ui: { ...state.ui, commitSliderVisible: false } };

      const commitAmount = clamp(state.ui.commitAmount, 1, 1000);
      const leverage = clamp(state.ui.commitLeverage, 1, LEV_MAX);
      const direction = state.ui.commitDirection;

      const id = (globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random());

      const pos: Position = {
        id,
        sessionId: session.id,
        entryTickIndex: session.tickIndex,
        entryPrice: session.price,
        committedPoints: commitAmount,
        leverage,
        direction,
        isOpen: true,
      };

      const updated: SessionRuntime = recomputeScoreDisplay({
        ...session,
        markersRemaining: session.markersRemaining - 1,
        positions: [...session.positions, pos],
      });

      const next = {
        ...state,
        sessions: { ...state.sessions, [session.id]: updated },
        ui: { ...state.ui, commitSliderVisible: false },
      };
      return recomputeFinalCloseRequired(next);
    }

    case "CLOSE_POSITION": {
      const session = state.sessions[state.ui.activeSessionId];
      if (!session) return state;
      if (session.phase === "ENDED") return state;

      const idx = session.positions.findIndex(p => p.id === event.positionId);
      if (idx === -1) return state;
      const pos = session.positions[idx];
      if (!pos.isOpen) return state;

      // Min hold 1 tick
      if ((session.tickIndex - pos.entryTickIndex) < MIN_HOLD_TICKS) return state;

      if (session.markersRemaining <= 0) return state;

      const deltaPoints = realizedPointsOnClose(pos, session.price);

      const updatedPositions = session.positions.slice();
      updatedPositions[idx] = { ...pos, isOpen: false };

      const updated: SessionRuntime = recomputeScoreDisplay({
        ...session,
        markersRemaining: session.markersRemaining - 1,
        scoreRealized: session.scoreRealized + deltaPoints,
        positions: updatedPositions,
      });

      const next = { ...state, sessions: { ...state.sessions, [session.id]: updated } };
      return recomputeFinalCloseRequired(next);
    }

    case "TICK_5S": {
      const sessions = { ...state.sessions };

      for (const id of Object.keys(sessions)) {
        const s = sessions[id];
        if (s.phase === "ENDED") continue;

        // Stub active player count (wire from room state later)
        const activePlayers = 25;

        const z = prngZ(s.seed, s.tickIndex);
        const demand = computeDemand(s, activePlayers);
        const r = computeTickReturn(s, z, demand);

        const nextPrice = Math.max(P_MIN, s.price * (1 + r));

        // Update price + tick
        let nextSession: SessionRuntime = {
          ...s,
          tickIndex: s.tickIndex + 1,
          price: nextPrice,
          lastTickEpochMs: event.nowMs,
        };

        // Break Point enforcement: force-close if threshold hit (no marker consumed)
        let positions = nextSession.positions.slice();
        let bpCount = nextSession.breakPointCount;

        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          if (!p.isOpen) continue;
          if ((nextSession.tickIndex - p.entryTickIndex) < MIN_HOLD_TICKS) continue; // can't break before minimum tick

          if (breakPointTriggered(p, nextSession.price)) {
            const delta = realizedPointsOnClose(p, nextSession.price);
            // Auto-close, mark wasBreakPoint, apply realized delta, do NOT consume marker
            positions[i] = { ...p, isOpen: false, wasBreakPoint: true };
            bpCount += 1;
            nextSession = { ...nextSession, scoreRealized: nextSession.scoreRealized + delta };
          }
        }

        nextSession = recomputeScoreDisplay({ ...nextSession, positions, breakPointCount: bpCount });

        sessions[id] = nextSession;
      }

      return recomputeFinalCloseRequired({ ...state, sessions });
    }

    case "CLOCK_1S": {
      const sessions = { ...state.sessions };
      for (const id of Object.keys(sessions)) {
        const s = sessions[id];
        if (s.phase === "ENDED") continue;

        const now = event.nowMs;
        const nextPhase: SessionPhase =
          now >= s.endEpochMs ? "ENDED" :
          now >= s.closingStartEpochMs ? "CLOSING" :
          "LIVE";

        if (nextPhase === "ENDED") {
          // Forfeits: apply losses only (gains zeroed), then close positions
          let lossDelta = 0;
          let openCount = 0;
          const closed = s.positions.map(p => {
            if (!p.isOpen) return p;
            openCount += 1;
            const rawDelta = realizedPointsOnClose(p, s.price);
            if (rawDelta < 0) lossDelta += rawDelta;
            return { ...p, isOpen: false };
          });
          sessions[id] = recomputeScoreDisplay({
            ...s,
            phase: "ENDED",
            positions: closed,
            scoreRealized: s.scoreRealized + lossDelta,
            forfeitCount: s.forfeitCount + openCount,
          });
        } else {
          sessions[id] = { ...s, phase: nextPhase };
        }
      }
      return recomputeFinalCloseRequired({ ...state, sessions });
    }

    case "SESSION_PHASE_UPDATE": {
      const s = state.sessions[event.sessionId];
      if (!s) return state;
      const sessions = { ...state.sessions, [event.sessionId]: { ...s, phase: event.phase } };
      return recomputeFinalCloseRequired({ ...state, sessions });
    }

    case "PLAYER_LEAVING_SESSION": {
      const s = state.sessions[event.sessionId];
      if (!s) return state;
      let lossDelta = 0;
      let openCount = 0;
      const sessions = {
        ...state.sessions,
        [s.id]: recomputeScoreDisplay({
          ...s,
          positions: s.positions.map(p => {
            if (!p.isOpen) return p;
            openCount += 1;
            const rawDelta = realizedPointsOnClose(p, s.price);
            if (rawDelta < 0) lossDelta += rawDelta;
            return { ...p, isOpen: false };
          }),
          scoreRealized: s.scoreRealized + lossDelta,
          forfeitCount: s.forfeitCount + openCount,
        }),
      };
      return recomputeFinalCloseRequired({ ...state, sessions });
    }

    default:
      return state;
  }
}
