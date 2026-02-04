export type VrfProof = {
  provider: "switchboard";
  randomnessAccount?: string;
  commitTxSig?: string;
  revealTxSig?: string;
  committedSlot?: number;
  revealedSlot?: number;
  outputHex?: string;
  fetchedAtMs?: number;
};

export type VrfSample = {
  requestId: string;
  proofRef?: string;
  z: number; // [-1,+1]
  proof?: VrfProof;
};

export interface VrfProvider {
  requestSample(sessionId: string, tickIndex: number): Promise<{ requestId: string }>;
  waitForSample(requestId: string): Promise<VrfSample>;
}
