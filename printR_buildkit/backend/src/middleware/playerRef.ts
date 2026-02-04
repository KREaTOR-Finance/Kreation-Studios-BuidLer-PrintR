import type { Request, Response, NextFunction } from "express";

/**
 * PlayerRef middleware (Trust-first MVP)
 * - Requires x-printr-player header: "tg:<telegram_user_id>"
 * - Optional x-printr-wallet header: "<solana_pubkey>"
 */
export function requirePlayerRef(req: Request, res: Response, next: NextFunction) {
  const playerRef = req.header("x-printr-player");
  if (!playerRef) return res.status(401).json({ error: "MISSING_PLAYER_REF" });

  (req as any).playerRef = playerRef;
  (req as any).wallet = req.header("x-printr-wallet") ?? null;
  next();
}

export function getPlayerRef(req: Request): string {
  return (req as any).playerRef as string;
}
