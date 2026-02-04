import { createHash } from "node:crypto";
import type { VrfProvider, VrfSample } from "./provider.js";
import { bytesToHex, bytesToSignedUnit } from "./bytes.js";

export class DevVrfProvider implements VrfProvider {
  constructor(private seed = 1337) {}
  async requestSample(sessionId: string, tickIndex: number): Promise<{ requestId: string }> {
    return { requestId: `${sessionId}:${tickIndex}` };
  }
  async waitForSample(requestId: string): Promise<VrfSample> {
    const digest = createHash("sha256")
      .update(String(this.seed))
      .update(":")
      .update(requestId)
      .digest();
    const bytes = new Uint8Array(digest);
    const z = bytesToSignedUnit(bytes);
    return {
      requestId,
      proofRef: "dev",
      z,
      proof: {
        provider: "switchboard",
        randomnessAccount: `dev:${this.seed}`,
        outputHex: bytesToHex(bytes),
        fetchedAtMs: Date.now()
      }
    };
  }
}
