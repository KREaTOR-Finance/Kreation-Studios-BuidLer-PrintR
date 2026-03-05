export type SolanaCluster = "devnet" | "mainnet-beta";

export type SolanaPayIntent = {
  reference: string; // pubkey base58
  playerRef: string;
  bundle: string;
  usdCents: number;
  sessions: number;
  cluster: SolanaCluster;
  status: "PENDING" | "PAID";
  signature?: string | null;
  createdAtMs: number;
  paidAtMs?: number | null;
};

export interface SolanaPayStore {
  migrate?: () => void | Promise<void>;

  createIntent(i: Omit<SolanaPayIntent, "status" | "createdAtMs" | "paidAtMs">): Promise<SolanaPayIntent>;
  getIntent(reference: string): Promise<SolanaPayIntent | null>;
  markPaid(reference: string, signature: string, paidAtMs: number): Promise<boolean>; // false if already paid
  isSignatureProcessed(signature: string): Promise<boolean>;
  markSignatureProcessed(signature: string, reference: string, atMs: number): Promise<void>;
}
