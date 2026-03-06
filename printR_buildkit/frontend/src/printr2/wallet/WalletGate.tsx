import React, { useEffect, useMemo, useState } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { SolanaMobileWalletAdapter } from "@solana-mobile/wallet-adapter-mobile";
import { AuthGate } from "./AuthGate";

const WALLET_KEY = "printr:wallet:pubkey";

export function WalletGate(props: { children: React.ReactNode }){
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(() => {
    const list: any[] = [];

    // MWA-first (Seed Vault), but never let a constructor crash the whole app.
    try {
      if (isProbablyMobile()) {
        list.push(new SolanaMobileWalletAdapter({
          addressSelector: { select: "any" },
          appIdentity: { name: "PrintR" }
        } as any));
      }
    } catch {
      // ignore
    }

    try {
      list.push(new PhantomWalletAdapter());
    } catch {
      // ignore
    }

    return list;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletStorageBridge />
        <AuthGate>
          {props.children}
        </AuthGate>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function WalletStorageBridge(){
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    if (connected && publicKey) {
      localStorage.setItem(WALLET_KEY, publicKey.toBase58());
    } else {
      localStorage.removeItem(WALLET_KEY);
    }
  }, [connected, publicKey]);

  return null;
}

function isProbablyMobile(){
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

export function getStoredWalletPubkey(): string | null {
  try {
    const v = localStorage.getItem(WALLET_KEY);
    return v && v.length > 20 ? v : null;
  } catch {
    return null;
  }
}
