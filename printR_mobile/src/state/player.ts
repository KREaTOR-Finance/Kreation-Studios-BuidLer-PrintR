import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlayerHeaders } from "../network/httpClient";

const PLAYER_KEY = "printr_mobile_player_id";
let cachedId: string | null = null;

export async function getPlayerHeaders(): Promise<PlayerHeaders> {
  if (cachedId) return { playerRef: `mobile:${cachedId}`, walletPubkey: null };

  let stored = await AsyncStorage.getItem(PLAYER_KEY);
  if (!stored) {
    stored = generateUUID();
    await AsyncStorage.setItem(PLAYER_KEY, stored);
  }
  cachedId = stored;
  return { playerRef: `mobile:${stored}`, walletPubkey: null };
}

export function getPlayerHeadersSync(): PlayerHeaders {
  const ref = cachedId ? `mobile:${cachedId}` : "mobile:demo";
  return { playerRef: ref, walletPubkey: null };
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
