import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlayerHeaders } from "../network/httpClient";

const PLAYER_KEY = "printr_mobile_player_id";
const WALLET_KEY = "printr_wallet_pubkey";
let cachedId: string | null = null;
let cachedWallet: string | null = null;

/**
 * Set the connected wallet pubkey (called by WalletProvider on connect/disconnect).
 */
export function setWalletPubkey(pubkey: string | null) {
  cachedWallet = pubkey;
}

export async function getPlayerHeaders(): Promise<PlayerHeaders> {
  // Read wallet pubkey from storage if not cached
  if (cachedWallet === null) {
    cachedWallet = (await AsyncStorage.getItem(WALLET_KEY)) ?? null;
  }

  if (cachedId) {
    return {
      playerRef: cachedWallet ? `wallet:${cachedWallet}` : `mobile:${cachedId}`,
      walletPubkey: cachedWallet,
    };
  }

  let stored = await AsyncStorage.getItem(PLAYER_KEY);
  if (!stored) {
    stored = generateUUID();
    await AsyncStorage.setItem(PLAYER_KEY, stored);
  }
  cachedId = stored;

  return {
    playerRef: cachedWallet ? `wallet:${cachedWallet}` : `mobile:${stored}`,
    walletPubkey: cachedWallet,
  };
}

export function getPlayerHeadersSync(): PlayerHeaders {
  const ref = cachedWallet
    ? `wallet:${cachedWallet}`
    : cachedId
      ? `mobile:${cachedId}`
      : "mobile:demo";
  return { playerRef: ref, walletPubkey: cachedWallet };
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
