import React, { useState } from "react";
import { VrfProofModal } from "./VrfProofModal";

type Props = {
  vrf?: {
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

export const VrfProofBadge: React.FC<Props> = ({ vrf }) => {
  const [open, setOpen] = useState(false);
  if (!vrf) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Randomness proof"
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.35)",
          color: "rgba(255,255,255,0.9)",
          fontSize: 13,
          lineHeight: "20px",
          textAlign: "center",
          padding: 0
        }}
      >
        ⓘ
      </button>

      <VrfProofModal open={open} onClose={() => setOpen(false)} vrf={vrf} />
    </>
  );
};
