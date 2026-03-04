import React, { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "../ui";

function isProbablyMobile(){
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

export function ConnectButton(){
  const { connected, connecting, disconnecting, connect, disconnect, publicKey } = useWallet();
  const [err, setErr] = useState<string | null>(null);

  const label = useMemo(() => {
    if (disconnecting) return "DISCONNECTING";
    if (connecting) return "CONNECTING";
    if (connected && publicKey) return shortKey(publicKey.toBase58());
    return isProbablyMobile() ? "CONNECT (SEED VAULT)" : "CONNECT";
  }, [connected, connecting, disconnecting, publicKey]);

  const onClick = async () => {
    setErr(null);
    try {
      if (connected) await disconnect();
      else await connect();
    } catch (e: any) {
      setErr(e?.message ?? "CONNECT_FAILED");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <Button variant={connected ? "secondary" : "ghost"} onClick={onClick}>{label}</Button>
      {err ? <div className="p2-mini" style={{ maxWidth: 240, textAlign: "right" }}>wallet: {err}</div> : null}
    </div>
  );
}

function shortKey(k: string){
  return `${k.slice(0,4)}…${k.slice(-4)}`.toUpperCase();
}
