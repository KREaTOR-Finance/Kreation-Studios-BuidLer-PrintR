import { createHmac, timingSafeEqual } from "node:crypto";

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlJson(obj: any) {
  return b64url(Buffer.from(JSON.stringify(obj), "utf8"));
}

function fromB64url(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export type AuthClaims = {
  wallet: string; // base58 pubkey
  termsVersion: string;
  iat: number;
  exp: number;
};

export function issueToken(claims: Omit<AuthClaims, "iat" | "exp">, ttlMs: number) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET_MISSING");

  const now = Date.now();
  const payload: AuthClaims = {
    ...claims,
    iat: now,
    exp: now + ttlMs
  };
  const header = { alg: "HS256", typ: "JWT" };

  const p1 = b64urlJson(header);
  const p2 = b64urlJson(payload);
  const body = `${p1}.${p2}`;
  const sig = createHmac("sha256", secret).update(body).digest();
  return { token: `${body}.${b64url(sig)}`, claims: payload };
}

export function verifyToken(token: string): AuthClaims | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [p1, p2, p3] = parts;
  const body = `${p1}.${p2}`;

  const expected = createHmac("sha256", secret).update(body).digest();
  const got = fromB64url(p3);
  if (got.length !== expected.length) return null;
  if (!timingSafeEqual(got, expected)) return null;

  try {
    const payload = JSON.parse(fromB64url(p2).toString("utf8"));
    const exp = Number(payload.exp ?? 0);
    if (!exp || Date.now() > exp) return null;
    if (!payload.wallet) return null;
    return payload as AuthClaims;
  } catch {
    return null;
  }
}
