import { getWsPlayerId } from "../network/wsClient";

// For Printr2 MVP we reuse the WS player UUID as the http playerRef as well.
// This keeps identity stable per device/browser without Telegram auth wiring.
export function getPrintr2PlayerRef(): string {
  if (typeof window === "undefined") return "dev";
  return getWsPlayerId();
}
