import type { Request, Response, NextFunction } from "express";

export function requireAdminToken(req: Request, res: Response, next: NextFunction){
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return res.status(500).json({ ok: false, error: "ADMIN_TOKEN_NOT_CONFIGURED" });
  }
  const got = String(req.header("X-Admin-Token") ?? "");
  if (!got || got !== expected) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  }
  next();
}
