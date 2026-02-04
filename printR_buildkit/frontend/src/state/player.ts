import type { PlayerHeaders } from "../network/httpClient";

declare global {
  interface Window {
    Telegram?: any;
  }
}

/**
 * Derive player identity for backend headers.
 * - Primary: Telegram WebApp user id (tg:<id>)
 * - Fallback: tg:demo for local dev
 * - Wallet optional (future)
 */
export function getPlayerHeaders(): PlayerHeaders {
  const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const playerRef = id ? `tg:${id}` : "tg:demo";
  return { playerRef, walletPubkey: null };
}
