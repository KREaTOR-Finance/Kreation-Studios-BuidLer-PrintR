import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  vrf: {
    requestId: string;
    proofRef?: string;
    z: number;
    proof?: {
      provider: "switchboard";
      randomnessAccount?: string;
      commitTxSig?: string;
      revealTxSig?: string;
      committedSlot?: number;
      revealedSlot?: number;
      outputHex?: string;
      fetchedAtMs?: number;
    };
  };
};

function row(label: string, value?: string | number, href?: string) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginBottom: 8 }}>
      <div style={{ opacity: 0.75 }}>{label}</div>
      <div style={{ maxWidth: 260, textAlign: "right", wordBreak: "break-all" }}>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--accentA)" }}>
            {String(value)}
          </a>
        ) : (
          String(value)
        )}
      </div>
    </div>
  );
}

export const VrfProofModal: React.FC<Props> = ({ open, onClose, vrf }) => {
  if (!open) return null;

  const proof = vrf.proof;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          background: "rgba(14,16,20,0.98)",
          border: "1px solid rgba(255,255,255,0.10)",
          padding: 16,
          marginBottom: 0
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Randomness Proof</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent",
              color: "rgba(255,255,255,0.9)",
              borderRadius: 10,
              padding: "6px 10px"
            }}
          >
            Close
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
          Every tick uses verifiable randomness. This panel shows the VRF request + proof references.
        </div>

        {row("Provider", proof?.provider ?? "switchboard")}
        {row("Request ID", vrf.requestId)}
        {row("z", vrf.z.toFixed(4))}
        {row("Randomness Acct", proof?.randomnessAccount, explorerUrl("address", proof?.randomnessAccount, vrf.proofRef))}
        {row("Commit Tx", proof?.commitTxSig, explorerUrl("tx", proof?.commitTxSig, vrf.proofRef))}
        {row("Reveal Tx", proof?.revealTxSig, explorerUrl("tx", proof?.revealTxSig, vrf.proofRef))}
        {row("Commit Slot", proof?.committedSlot)}
        {row("Reveal Slot", proof?.revealedSlot)}
        {row("Output", proof?.outputHex)}
        {row("Proof Ref", vrf.proofRef, vrf.proofRef && vrf.proofRef.startsWith("http") ? vrf.proofRef : undefined)}
        {row("Fetched", proof?.fetchedAtMs ? new Date(proof.fetchedAtMs).toISOString() : undefined)}
      </div>
    </div>
  );
};

function explorerUrl(kind: "tx" | "address", value?: string, proofRef?: string): string | undefined {
  if (!value) return undefined;
  const base = `https://explorer.solana.com/${kind}/${value}`;
  if (proofRef && proofRef.startsWith("http")) {
    try {
      const url = new URL(proofRef);
      const cluster = url.searchParams.get("cluster");
      if (cluster && cluster !== "mainnet-beta") {
        return `${base}?cluster=${cluster}`;
      }
    } catch {}
  }
  return base;
}
