import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { apiGet, apiPost } from "../../network/httpClient";
import { getPrintr2PlayerRef } from "../playerRef";
import { getAuthToken, setAuthToken } from "../../network/auth";
import { Button, Panel } from "../ui";

export function AuthGate(props: { children: React.ReactNode }) {
  const { connected, publicKey, signMessage, connect } = useWallet();
  const player = useMemo(() => ({ playerRef: getPrintr2PlayerRef() }), []);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const token = getAuthToken();
  const wallet = publicKey?.toBase58() ?? null;

  useEffect(() => {
    // If wallet disconnected, drop auth token.
    if (!wallet) setAuthToken(null);
  }, [wallet]);

  const login = async () => {
    if (!wallet) throw new Error("WALLET_REQUIRED");
    if (!signMessage) throw new Error("SIGN_MESSAGE_UNSUPPORTED");

    const nonceRes = await apiGet<any>(`/api/auth/nonce?wallet=${encodeURIComponent(wallet)}`, player as any);
    if (!nonceRes?.ok) throw new Error(nonceRes?.error ?? "NONCE_FAILED");

    const msg = String(nonceRes.message ?? "");
    const nonce = String(nonceRes.nonce ?? "");
    const termsVersion = String(nonceRes.termsVersion ?? "v1");

    const sigBytes = await signMessage(new TextEncoder().encode(msg));
    const signature = (await import("bs58")).default.encode(sigBytes);

    const loginRes = await apiPost<any>("/api/auth/login", { wallet, signature, nonce, termsVersion }, player as any);
    if (!loginRes?.ok) throw new Error(loginRes?.error ?? "LOGIN_FAILED");

    setAuthToken(String(loginRes.token));
  };

  // Auto-login when connected.
  useEffect(() => {
    if (token) return;
    if (!connected || !wallet) return;
    if (busy) return;
    setBusy(true);
    setErr(null);
    login().catch((e: any) => setErr(String(e?.message ?? e))).finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, wallet]);

  if (token) return <>{props.children}</>;

  return (
    <div className="p2-root">
      <div className="p2-noise" />
      <div className="p2-frame">
        <Panel className="p2-panel" as="div">
          <div className="p2-panelTitle">Enter PrintR</div>
          <div className="p2-panelSub">Read the disclaimer, connect Seed Vault, and sign to continue.</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div className="p2-mini" style={{ opacity: 0.85, lineHeight: 1.5 }}>
              Disclaimer: PrintR is an arcade score game. No financial product. Points can go up or down.
            </div>

            <Button
              onClick={async () => {
                setErr(null);
                setBusy(true);
                try {
                  if (!connected) await connect();
                  // login will auto-run on connect effect
                } catch (e: any) {
                  setErr(String(e?.message ?? e));
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              {busy ? "LOADING…" : (connected ? "SIGN TO ENTER" : "CONNECT WALLET")}
            </Button>

            {err ? <div className="p2-mini" style={{ color: "rgba(255,120,120,.95)" }}>{err}</div> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
