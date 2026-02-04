const ENV_BASE = ((import.meta as any).env?.VITE_API_BASE ?? "").trim() || undefined;
const FALLBACK_BASE =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "http://localhost:8080";

export const API_BASE = ENV_BASE ?? FALLBACK_BASE;

export type PlayerHeaders = {
  playerRef: string; // e.g. tg:123
  walletPubkey?: string | null;
};

export async function apiGet<T>(path: string, headers: PlayerHeaders): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "x-printr-player": headers.playerRef,
      ...(headers.walletPubkey ? { "x-printr-wallet": headers.walletPubkey } : {})
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: any, headers: PlayerHeaders, extra?: Record<string,string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-printr-player": headers.playerRef,
      ...(headers.walletPubkey ? { "x-printr-wallet": headers.walletPubkey } : {}),
      ...(extra ?? {})
    },
    body: JSON.stringify(body ?? {})
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
