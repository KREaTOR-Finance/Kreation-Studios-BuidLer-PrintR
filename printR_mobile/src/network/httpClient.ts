import { API_BASE as ENV_API_BASE } from "../config/env";

export const API_BASE = ENV_API_BASE;

export type PlayerHeaders = {
  playerRef: string;
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

export async function apiPost<T>(path: string, body: any, headers: PlayerHeaders, extra?: Record<string, string>): Promise<T> {
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
