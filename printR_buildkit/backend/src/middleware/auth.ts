import type { Request, Response, NextFunction } from "express";
import { verifyToken, type AuthClaims } from "../auth/tokens.js";

export type AuthedRequest = Request & { auth?: AuthClaims };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = String(req.header("authorization") ?? "");
  const m = h.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : "";
  const claims = token ? verifyToken(token) : null;
  if (!claims) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  req.auth = claims;
  return next();
}

export function getWallet(req: AuthedRequest): string {
  const w = req.auth?.wallet;
  if (!w) throw new Error("UNAUTHORIZED");
  return w;
}
