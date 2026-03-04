import { API_BASE } from "../network/httpClient";

export function backendHttpBase(): string {
  return API_BASE;
}

export function backendWsUrl(playerId?: string): string {
  if (typeof window === "undefined") return "ws://localhost:3001";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname;
  const base = `${proto}://${host}:3001`;
  if (!playerId) return base;
  const qs = new URLSearchParams({ playerId });
  return `${base}?${qs.toString()}`;
}
