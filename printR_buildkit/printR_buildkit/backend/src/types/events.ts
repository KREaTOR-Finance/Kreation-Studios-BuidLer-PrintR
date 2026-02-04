import { z } from "zod";

export const DirectionSchema = z.enum(["LONG", "SHORT"]);
export type Direction = z.infer<typeof DirectionSchema>;

export const ArchetypeSchema = z.enum([
  "DEEP_POOL",
  "STANDARD",
  "THIN_FLOAT",
  "WHIPSAW",
  "TREND_DAY",
]);
export type Archetype = z.infer<typeof ArchetypeSchema>;

export const SessionPhaseSchema = z.enum(["LIVE", "CLOSING", "ENDED"]);
export type SessionPhase = z.infer<typeof SessionPhaseSchema>;

export const PlayerIntentSchema = z.object({
  type: z.literal("PLAYER_INTENT"),
  sessionId: z.string().uuid(),
  playerId: z.string().uuid(),
  intent: z.enum(["OPEN", "CLOSE"]),
  payload: z
    .object({
      commitPoints: z.number().int().min(1).max(1000).optional(),
      direction: DirectionSchema.optional(),
      leverage: z.number().int().min(1).max(5).optional(),
      positionId: z.string().uuid().optional()
    })
    .default({}),
  clientTs: z.number().int()
});
export type PlayerIntentEvent = z.infer<typeof PlayerIntentSchema>;

export const ClientEventSchema = z.discriminatedUnion("type", [PlayerIntentSchema]);
export type ClientEvent = z.infer<typeof ClientEventSchema>;

// Server -> Client
export const SessionStateSchema = z.object({
  type: z.literal("SESSION_STATE"),
  sessionId: z.string().uuid(),
  phase: SessionPhaseSchema,
  tickIndex: z.number().int(),
  price: z.number(),
  timeRemainingMs: z.number().int(),
  closingRemainingMs: z.number().int(),
  marketIndex: z.number().int().min(1).max(100),
  supply: z.number().int(),
  archetype: ArchetypeSchema,
  assetName: z.string()
});
export type SessionStateEvent = z.infer<typeof SessionStateSchema>;

export const TickSchema = z.object({
  type: z.literal("TICK"),
  sessionId: z.string().uuid(),
  tickIndex: z.number().int(),
  price: z.number(),
  r: z.number(),
  rMax: z.number(),
  demand: z.number(),
  phase: SessionPhaseSchema.optional(),
  timeRemainingMs: z.number().int().optional(),
  closingRemainingMs: z.number().int().optional(),
  vrf: z.object({
    requestId: z.string(),
    proofRef: z.string().optional(),
    z: z.number(),
    proof: z.object({
      provider: z.literal("switchboard"),
      randomnessAccount: z.string().optional(),
      commitTxSig: z.string().optional(),
      revealTxSig: z.string().optional(),
      committedSlot: z.number().int().optional(),
      revealedSlot: z.number().int().optional(),
      outputHex: z.string().optional(),
      fetchedAtMs: z.number().int().optional()
    }).optional()
  })
});
export type TickEvent = z.infer<typeof TickSchema>;

export const PlayerHudSchema = z.object({
  type: z.literal("PLAYER_HUD"),
  sessionId: z.string().uuid(),
  playerId: z.string().uuid(),
  scoreRealized: z.number(),
  scoreDisplay: z.number(),
  markersRemaining: z.number().int(),
  hasOpen: z.boolean(),
  openPosition: z
    .object({
      positionId: z.string().uuid(),
      direction: DirectionSchema,
      leverage: z.number().int(),
      commitPoints: z.number().int(),
      entryPrice: z.number(),
      entryTickIndex: z.number().int(),
      unrealized: z.number()
    })
    .nullable(),
  flags: z.object({
    finalCloseRequired: z.boolean(),
    closingPhase: z.boolean()
  })
});
export type PlayerHudEvent = z.infer<typeof PlayerHudSchema>;

export const FxEventSchema = z.object({
  type: z.literal("FX_EVENT"),
  sessionId: z.string().uuid(),
  playerId: z.string().uuid(),
  fx: z.enum(["COMMIT_SONAR", "CLOSE_GAIN", "CLOSE_LOSS", "BREAK_POINT", "FORFEIT"]),
  atTickIndex: z.number().int(),
  meta: z.record(z.any()).optional()
});
export type FxEvent = z.infer<typeof FxEventSchema>;

export type ServerEvent = SessionStateEvent | TickEvent | PlayerHudEvent | FxEvent;
