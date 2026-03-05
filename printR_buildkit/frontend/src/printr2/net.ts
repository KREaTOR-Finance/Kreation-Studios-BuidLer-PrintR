import { API_BASE } from "../network/httpClient";

export function backendHttpBase(): string {
  return API_BASE;
}

import { getStoredWalletPubkey } from "./wallet/WalletGate";

export function backendWsUrl(playerId?: string): string {  if (typeof window === "undefined") return "ws://localhost:3001/ws";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname;
  const port = window.location.port;

  // If frontend is served from backend (:3001), use same-origin /ws.
  const base = port === "3001"
    ? `${proto}://${host}:${port}/ws`
    : `${proto}://${host}:3001/ws`;

  const wallet = getStoredWalletPubkey();
  if (!playerId && !wallet) return base;
  const qs = new URLSearchParams();
  if (playerId) qs.set("playerId", playerId);
  if (wallet) qs.set("wallet", wallet);
  return `${base}?${qs.toString()}`;
}
