import React, { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "../ui";

function isProbablyMobile(){
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

export function ConnectButton(props: { compact?: boolean } = {}){
  const { connected, connecting, disconnecting, connect, disconnect, publicKey, wallet, wallets, select } = useWallet();
  const [err, setErr] = useState<string | null>(null);

  const label = useMemo(() => {
    if (disconnecting) return "DISCONNECTING";
    if (connecting) return "CONNECTING";
    if (connected && publicKey) return shortKey(publicKey.toBase58());
    if (props.compact) return "CONNECT";
    return isProbablyMobile() ? "CONNECT (SEED VAULT)" : "CONNECT";
  }, [connected, connecting, disconnecting, publicKey]);

  const onClick = async () => {
    setErr(null);
    try {
      if (connected) {
        await disconnect();
        return;
      }

      // If no wallet selected, pick a sane default.
      if (!wallet) {
        const preferred = isProbablyMobile()
          ? (wallets.find(w => /solana mobile/i.test(w.adapter.name)) ?? wallets[0])
          : wallets[0];

        if (!preferred) throw new Error("NO_WALLET_AVAILABLE");
        select(preferred.adapter.name);
      }

      await connect();
    } catch (e: any) {
      setErr(e?.message ?? "CONNECT_FAILED");
    }
  };

  return (
    <div className={props.compact ? "p2-connectWrap p2-connectCompact" : "p2-connectWrap"}>
      <Button variant={connected ? "secondary" : "ghost"} onClick={onClick}>{label}</Button>
      {!props.compact && err ? <div className="p2-mini p2-connectErr">wallet: {err}</div> : null}
    </div>
  );
}

function shortKey(k: string){
  return `${k.slice(0,4)}…${k.slice(-4)}`.toUpperCase();
}
