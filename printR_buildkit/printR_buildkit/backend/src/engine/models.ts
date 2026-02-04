import type { Archetype, SessionPhase } from "../types/events.js";
import type { Position } from "./mechanics.js";

export type SessionRuntime = {
  id: string;
  assetName: string;
  supply: number;
  marketIndex: number;
  archetype: Archetype;

  phase: SessionPhase;
  startTimeMs: number;
  closingTimeMs: number;
  endTimeMs: number;

  tickIndex: number;
  price: number;

  activePlayers: number;
  positions: Position[];
};
