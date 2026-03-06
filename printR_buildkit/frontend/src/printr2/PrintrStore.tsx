import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction } from "@solana/spl-token";

import { Panel, Button, TopBar, TopActions } from "./ui";
import { ConnectButton } from "./wallet/ConnectButton";
import { apiPost } from "../network/httpClient";
import { getPrintr2PlayerRef } from "./playerRef";

type Bundle = "BUNDLE_1" | "BUNDLE_5" | "BUNDLE_15" | "BUNDLE_99" | "RESET_POINTS";

type SolanaIntent = {
  ok: boolean;
  asset: "SOL" | "SKR";
  reference: string;
  recipient: string;
  cluster: "devnet" | "mainnet-beta";
  mint?: string;
  usdCents: number;
  plays: number;
  quote: any;
};

export function PrintrStore(){
  const nav = useNavigate();
  const player = useMemo(() => ({ playerRef: getPrintr2PlayerRef() }), []);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [busy, setBusy] = useState<Bundle | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const stripe = async (bundle: Bundle) => {
    setMsg(null);
    setBusy(bundle);
    try {
      const r = await apiPost<{ ok: boolean; url: string }>(`/api/payments/stripe/checkout`, { bundle }, player);
      const openLink = (window as any).Telegram?.WebApp?.openLink;
      if (openLink) openLink(r.url);
      else window.location.href = r.url;
    } catch (e: any) {
      setMsg(e?.message ?? "stripe_checkout_error");
    } finally {
      setBusy(null);
    }
  };

  const solana = async (bundle: Bundle, asset: "SOL"|"SKR") => {
    setMsg(null);
    if (!publicKey) {
      setMsg("Connect wallet first.");
      return;
    }

    setBusy(bundle);
    try {
      const intent = await apiPost<SolanaIntent>("/api/payments/solana/intent", { bundle, asset }, player);
      const referencePk = new PublicKey(intent.reference);
      const recipientPk = new PublicKey(intent.recipient);

      const tx = new Transaction();
      tx.feePayer = publicKey;

      if (asset === "SOL") {
        const lamports = Number(intent.quote?.lamports ?? 0);
        if (!lamports || lamports < 1) throw new Error("Bad SOL quote");
        tx.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: recipientPk, lamports }));
      } else {
        const mintPk = new PublicKey(String(intent.mint));
        const fromAta = getAssociatedTokenAddressSync(mintPk, publicKey);
        const toAta = getAssociatedTokenAddressSync(mintPk, recipientPk, true);

        const ixs = [] as any[];
        const toInfo = await connection.getAccountInfo(toAta);
        if (!toInfo) {
          ixs.push(createAssociatedTokenAccountInstruction(publicKey, toAta, recipientPk, mintPk));
        }

        const decimals = Number(intent.quote?.decimals ?? 9);
        const amountAtoms = BigInt(String(intent.quote?.amountAtoms ?? "0"));
        ixs.push(createTransferCheckedInstruction(fromAta, mintPk, toAta, publicKey, amountAtoms, decimals, [], undefined));
        tx.add(...ixs);
      }

      // Solana Pay reference style
      tx.add({
        keys: [{ pubkey: referencePk, isSigner: false, isWritable: false }],
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from("")
      } as any);

      const sig = await sendTransaction(tx, connection);
      setMsg(`Sent: ${sig}. Confirming…`);

      const confirmed = await apiPost<any>("/api/payments/solana/confirm", { reference: intent.reference, signature: sig }, player);
      if (confirmed?.ok) {
        setMsg(`Credited ${intent.plays} plays.`);
      } else {
        setMsg(`Confirm failed: ${confirmed?.error ?? "unknown"}`);
      }
    } catch (e: any) {
      setMsg(e?.message ?? "solana_payment_failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p2-root">
      <div className="p2-noise" />
      <div className="p2-frame">
        <TopBar
          left={<Button variant="ghost" onClick={() => nav("/")}>Home</Button>}
          center={<div className="p2-mini">STORE</div>}
          right={<TopActions><ConnectButton compact /></TopActions>}
        />

        <Panel className="p2-panel" as="div">
          <div className="p2-panelTitle">Session Credits</div>
          <div className="p2-panelSub">Stripe or Solana (MWA / Seed Vault).</div>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <Pack title="$1 Pack" subtitle="4 plays" price="$1" onStripe={() => stripe("BUNDLE_1")} onSol={() => solana("BUNDLE_1","SOL")} onSkr={() => solana("BUNDLE_1","SKR")} busy={busy!==null} />
          <Pack title="$5 Pack" subtitle="20 plays" price="$5" onStripe={() => stripe("BUNDLE_5")} onSol={() => solana("BUNDLE_5","SOL")} onSkr={() => solana("BUNDLE_5","SKR")} busy={busy!==null} />
          <Pack title="$15 Pack" subtitle="60 plays" price="$15" onStripe={() => stripe("BUNDLE_15")} onSol={() => solana("BUNDLE_15","SOL")} onSkr={() => solana("BUNDLE_15","SKR")} busy={busy!==null} />
          <Pack title="$99 Pack" subtitle="396 plays" price="$99" onStripe={() => stripe("BUNDLE_99")} onSol={() => solana("BUNDLE_99","SOL")} onSkr={() => solana("BUNDLE_99","SKR")} busy={busy!==null} />
          <Pack title="Points Reset" subtitle="Reset points (streak stays)" price="$5" onStripe={() => stripe("RESET_POINTS")} onSol={() => solana("RESET_POINTS","SOL")} onSkr={() => solana("RESET_POINTS","SKR")} busy={busy!==null} />
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="p2-mini" style={{ opacity: 0.8 }}>Treasury: 3RDG3…MUkZ</div>
        </div>

        {msg ? (
          <div className="p2-mini" style={{ marginTop: 10, opacity: 0.9 }}>{msg}</div>
        ) : null}

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="p2-mini" style={{ opacity: 0.8 }}>
            Solana Pay confirmation is server-verified (mint, amount, recipient, reference) before crediting.
          </div>
        </div>
        </Panel>
      </div>
    </div>
  );
}

function Pack(props: { title: string; subtitle: string; price: string; onStripe: ()=>void; onSol: ()=>void; onSkr: ()=>void; busy: boolean }){
  return (
    <div className="p2-row" style={{ display:"grid", gap: 10 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>{props.title}</div>
        <div style={{ fontWeight: 900, opacity: 0.9 }}>{props.price}</div>
      </div>
      <div className="p2-mini" style={{ opacity: 0.8 }}>{props.subtitle}</div>
      <div className="p2-packButtons">
        <Button disabled={props.busy} onClick={props.onStripe}>STRIPE</Button>
        <Button disabled={props.busy} variant="secondary" onClick={props.onSol}>SOL</Button>
        <Button disabled={props.busy} variant="secondary" onClick={props.onSkr}>SKR (+25%)</Button>
      </div>
    </div>
  );
}
