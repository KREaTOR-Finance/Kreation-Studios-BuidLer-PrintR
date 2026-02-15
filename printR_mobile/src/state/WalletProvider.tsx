/**
 * WalletProvider — unified Solana wallet connection for PRINTR.
 *
 * Web:    Phantom browser extension (window.phantom.solana)
 * Native: Mobile Wallet Adapter (MWA) — works with Phantom, Solflare, etc.
 *
 * Exposes publicKey, connect/disconnect, and SNS .sol name resolution.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform, Linking } from "react-native";
import { PublicKey, Connection } from "@solana/web3.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resolveSnsName } from "./sns";

// ─── Types ───────────────────────────────────────────────────────
export type WalletContextValue = {
  /** The connected wallet's public key, or null */
  publicKey: PublicKey | null;
  /** Base-58 string of the pubkey */
  publicKeyStr: string | null;
  /** Whether a wallet is currently connected */
  connected: boolean;
  /** Which wallet adapter was used */
  walletName: "phantom" | "mwa" | null;
  /** Resolved .sol SNS name (null if none or still loading) */
  snsName: string | null;
  /** Whether SNS lookup is in flight */
  snsLoading: boolean;
  /** Connect wallet */
  connect: () => Promise<void>;
  /** Disconnect wallet */
  disconnect: () => Promise<void>;
  /** Whether connection is in progress */
  connecting: boolean;
};

const WalletContext = createContext<WalletContextValue>({
  publicKey: null,
  publicKeyStr: null,
  connected: false,
  walletName: null,
  snsName: null,
  snsLoading: false,
  connect: async () => {},
  disconnect: async () => {},
  connecting: false,
});

export const useWallet = () => useContext(WalletContext);

// ─── Storage keys ────────────────────────────────────────────────
const STORAGE_WALLET_KEY = "printr_wallet_pubkey";
const STORAGE_WALLET_NAME = "printr_wallet_name";

// ─── Phantom browser helper (web only) ──────────────────────────
function getPhantomProvider(): any | null {
  if (Platform.OS !== "web") return null;
  const w = typeof window !== "undefined" ? (window as any) : null;
  return w?.phantom?.solana?.isPhantom ? w.phantom.solana : null;
}

// ─── MWA helpers (native only) ──────────────────────────────────
async function connectMwa(): Promise<{ publicKey: PublicKey; walletName: string }> {
  // Dynamic import to avoid web bundling issues
  const {
    transact,
  } = await import("@solana-mobile/mobile-wallet-adapter-protocol-web3js");

  const APP_IDENTITY = {
    name: "PRINTR",
    uri: "https://kreation-studios-buidler-printr.onrender.com",
    icon: "favicon.png",
  };

  const result = await transact(async (wallet: any) => {
    const auth = await wallet.authorize({
      identity: APP_IDENTITY,
      cluster: "mainnet-beta",
    });
    return {
      publicKey: new PublicKey(auth.accounts[0].address),
      walletName: auth.wallet_uri_base ?? "mwa",
    };
  });

  return { publicKey: result.publicKey, walletName: result.walletName };
}

// ─── RPC connection for SNS lookups ─────────────────────────────
const RPC_URL = "https://api.mainnet-beta.solana.com";

// ─── Provider ────────────────────────────────────────────────────
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [walletName, setWalletName] = useState<"phantom" | "mwa" | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [snsName, setSnsName] = useState<string | null>(null);
  const [snsLoading, setSnsLoading] = useState(false);

  const publicKeyStr = useMemo(
    () => (publicKey ? publicKey.toBase58() : null),
    [publicKey]
  );

  // ── Restore persisted wallet on mount ──
  useEffect(() => {
    (async () => {
      try {
        const storedPk = await AsyncStorage.getItem(STORAGE_WALLET_KEY);
        const storedName = await AsyncStorage.getItem(STORAGE_WALLET_NAME);
        if (storedPk) {
          setPublicKey(new PublicKey(storedPk));
          setWalletName((storedName as any) ?? "phantom");
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // ── Listen for Phantom account changes (web) ──
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const phantom = getPhantomProvider();
    if (!phantom) return;

    const onAccountChanged = (pk: any) => {
      if (pk) {
        const newPk = new PublicKey(pk);
        setPublicKey(newPk);
        AsyncStorage.setItem(STORAGE_WALLET_KEY, newPk.toBase58());
      } else {
        // Disconnected from Phantom side
        setPublicKey(null);
        setWalletName(null);
        setSnsName(null);
        AsyncStorage.multiRemove([STORAGE_WALLET_KEY, STORAGE_WALLET_NAME]);
      }
    };

    phantom.on("accountChanged", onAccountChanged);
    return () => {
      phantom.removeListener("accountChanged", onAccountChanged);
    };
  }, []);

  // ── SNS reverse lookup when publicKey changes ──
  useEffect(() => {
    if (!publicKey) {
      setSnsName(null);
      return;
    }

    let cancelled = false;
    setSnsLoading(true);

    const connection = new Connection(RPC_URL, "confirmed");
    resolveSnsName(connection, publicKey)
      .then((name) => {
        if (!cancelled) setSnsName(name);
      })
      .catch(() => {
        if (!cancelled) setSnsName(null);
      })
      .finally(() => {
        if (!cancelled) setSnsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publicKey?.toBase58()]);

  // ── Connect ──
  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);

    try {
      if (Platform.OS === "web") {
        // Phantom browser extension
        const phantom = getPhantomProvider();
        if (!phantom) {
          // Redirect to Phantom install
          if (typeof window !== "undefined") {
            window.open("https://phantom.app/", "_blank");
          }
          return;
        }

        const resp = await phantom.connect();
        const pk = new PublicKey(resp.publicKey.toString());
        setPublicKey(pk);
        setWalletName("phantom");

        await AsyncStorage.setItem(STORAGE_WALLET_KEY, pk.toBase58());
        await AsyncStorage.setItem(STORAGE_WALLET_NAME, "phantom");
      } else {
        // Native — MWA
        try {
          const result = await connectMwa();
          setPublicKey(result.publicKey);
          setWalletName("mwa");

          await AsyncStorage.setItem(
            STORAGE_WALLET_KEY,
            result.publicKey.toBase58()
          );
          await AsyncStorage.setItem(STORAGE_WALLET_NAME, "mwa");
        } catch (mwaError: any) {
          // MWA not available — try Phantom deeplink as fallback
          const phantomDeeplink =
            "https://phantom.app/ul/v1/connect?app_url=https://kreation-studios-buidler-printr.onrender.com&redirect_link=printr://callback";
          const canOpen = await Linking.canOpenURL(phantomDeeplink);
          if (canOpen) {
            await Linking.openURL(phantomDeeplink);
          } else {
            // No wallet available at all — open Phantom download
            await Linking.openURL("https://phantom.app/download");
          }
        }
      }
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  // ── Disconnect ──
  const disconnect = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        const phantom = getPhantomProvider();
        if (phantom) {
          await phantom.disconnect();
        }
      }
    } catch {
      // ignore
    }

    setPublicKey(null);
    setWalletName(null);
    setSnsName(null);
    await AsyncStorage.multiRemove([STORAGE_WALLET_KEY, STORAGE_WALLET_NAME]);
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      publicKey,
      publicKeyStr,
      connected: !!publicKey,
      walletName,
      snsName,
      snsLoading,
      connect,
      disconnect,
      connecting,
    }),
    [publicKey, publicKeyStr, walletName, snsName, snsLoading, connect, disconnect, connecting]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
