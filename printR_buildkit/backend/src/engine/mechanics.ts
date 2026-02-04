import type { Archetype, Direction } from "../types/events.js";

export const CONST = {
  P_MIN: 0.01,
  MC_REF: 100_000_000,
  G_MIN: 0.70,
  G_MAX: 1.30,
  G_GAMMA: 1.15,
  D_MIN: 0.20,
  D_MAX: 3.00,
  R_LO: 0.01,
  R_HI: 0.10,
  DEMAND_NORM_PER_PLAYER: 1000,
  BREAK_K: 1.0,
  PCT_MULT: 100,
  BREAKPOINTS_ENABLED: false,
  LEV_MAX: 5,
  MIN_HOLD_TICKS: 1
} as const;

export type Position = {
  id: string;
  playerId: string;
  sessionId: string;
  entryTickIndex: number;
  entryPrice: number;
  committedPoints: number;
  leverage: number;
  direction: Direction;
  isOpen: boolean;
  wasBreakPoint?: boolean;
};

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function marketRegimeMultiplier(marketIndex: number): number {
  const x = clamp((marketIndex - 1) / 99, 0, 1);
  return CONST.G_MIN + (CONST.G_MAX - CONST.G_MIN) * Math.pow(x, CONST.G_GAMMA);
}

export function mcDamp(mc: number): number {
  const raw = Math.sqrt(CONST.MC_REF / (mc + 1e-9));
  return clamp(raw, CONST.D_MIN, CONST.D_MAX);
}

export function archetypeParams(a: Archetype): { sigma0: number; beta0: number; mArch: number } {
  switch (a) {
    case "DEEP_POOL": return { sigma0: 0.020, beta0: 0.010, mArch: 0.70 };
    case "STANDARD": return { sigma0: 0.030, beta0: 0.015, mArch: 1.00 };
    case "THIN_FLOAT": return { sigma0: 0.050, beta0: 0.025, mArch: 1.25 };
    case "WHIPSAW": return { sigma0: 0.040, beta0: 0.012, mArch: 1.10 };
    case "TREND_DAY": return { sigma0: 0.035, beta0: 0.020, mArch: 0.95 };
  }
}

export function pointsCap(committed: number, leverage: number): number {
  return committed * leverage * 5;
}

export function computeDemand(openPositions: Position[], activePlayers: number): number {
  let eLong = 0, eShort = 0;
  for (const p of openPositions) {
    if (!p.isOpen) continue;
    const exposure = p.committedPoints * p.leverage;
    if (p.direction === "LONG") eLong += exposure;
    else eShort += exposure;
  }
  const denom = Math.max(1, activePlayers) * CONST.DEMAND_NORM_PER_PLAYER;
  return clamp((eLong - eShort) / denom, -1, 1);
}

export function rMaxDynamic(opts: { supply: number; price: number; marketIndex: number; archetype: Archetype }): number {
  const mc = opts.supply * opts.price;
  const g = marketRegimeMultiplier(opts.marketIndex);
  const d = mcDamp(mc);
  const { mArch } = archetypeParams(opts.archetype);
  const raw = CONST.R_HI * g * d * mArch;
  return clamp(raw, CONST.R_LO, CONST.R_HI);
}

export function computeTickReturn(opts: {
  supply: number; price: number; marketIndex: number; archetype: Archetype;
  z: number; demand: number;
}): { r: number; rMax: number } {
  const mc = opts.supply * opts.price;
  const g = marketRegimeMultiplier(opts.marketIndex);
  const d = mcDamp(mc);
  const { sigma0, beta0 } = archetypeParams(opts.archetype);
  const sigma = sigma0 * g * d;
  const beta  = beta0  * g * d;
  const rUnclamped = (sigma * opts.z) + (beta * opts.demand);
  const rMax = rMaxDynamic(opts);
  return { r: clamp(rUnclamped, -rMax, rMax), rMax };
}

export function unrealizedPoints(pos: Position, currentPrice: number): number {
  const dir = pos.direction === "LONG" ? 1 : -1;
  if (pos.entryPrice <= 0) return 0;
  const pctMove = (currentPrice - pos.entryPrice) / pos.entryPrice;
  return pos.committedPoints * pos.leverage * dir * (pctMove * CONST.PCT_MULT);
}

export function realizedPoints(pos: Position, currentPrice: number): number {
  const u = unrealizedPoints(pos, currentPrice);
  const cap = pointsCap(pos.committedPoints, pos.leverage);
  return clamp(u, -cap, cap);
}

export function breakPointTriggered(pos: Position, currentPrice: number): boolean {
  if (!CONST.BREAKPOINTS_ENABLED) return false;
  const u = unrealizedPoints(pos, currentPrice);
  const loss = Math.max(0, -u);
  const budget = (pos.committedPoints / pos.leverage) * CONST.BREAK_K;
  return loss >= budget;
}

export function nextPrice(price: number, r: number): number {
  return Math.max(CONST.P_MIN, price * (1 + r));
}
