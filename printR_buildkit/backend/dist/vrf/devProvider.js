import { createHash } from "node:crypto";
import { bytesToHex, bytesToSignedUnit } from "./bytes.js";
export class DevVrfProvider {
    seed;
    constructor(seed = 1337) {
        this.seed = seed;
    }
    async requestSample(sessionId, tickIndex) {
        return { requestId: `${sessionId}:${tickIndex}` };
    }
    async waitForSample(requestId) {
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
