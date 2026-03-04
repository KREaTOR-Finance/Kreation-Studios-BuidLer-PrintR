const ENV_BASE = ((import.meta as any).env?.VITE_API_BASE ?? "").trim() || undefined;

function defaultBase(): string {
  if (typeof window === "undefined") return "http://localhost:3001";
  const host = window.location.hostname;
  // In dev, backend runs on :3001 on the same LAN host.
  // This makes mobile testing work (e.g. http://192.168.x.x:5173 -> http://192.168.x.x:3001).
  return `http://${host}:3001`;
}

export const API_BASE = ENV_BASE ?? defaultBase();

import { getStoredWalletPubkey } from "../printr2/wallet/WalletGate";

export type PlayerHeaders = {
  playerRef: string; // e.g. tg:123
  walletPubkey?: string | null;
};

export async function apiGet<T>(path: string, headers: PlayerHeaders): Promise<T> {
  const stored = getStoredWalletPubkey();
  const wallet = headers.walletPubkey ?? stored;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "x-printr-player": headers.playerRef,
      ...(wallet ? { "x-printr-wallet": wallet } : {})
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: any, headers: PlayerHeaders, extra?: Record<string,string>): Promise<T> {
  const stored = getStoredWalletPubkey();
  const wallet = headers.walletPubkey ?? stored;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-printr-player": headers.playerRef,
      ...(wallet ? { "x-printr-wallet": wallet } : {}),
      ...(extra ?? {})
    },
    body: JSON.stringify(body ?? {})
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
