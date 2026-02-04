import type { VrfProvider, VrfSample } from "./provider.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class DevVrfProvider implements VrfProvider {
  constructor(private seed = 1337) {}
  async requestSample(sessionId: string, tickIndex: number): Promise<{ requestId: string }> {
    return { requestId: `${sessionId}:${tickIndex}` };
  }
  async waitForSample(requestId: string): Promise<VrfSample> {
    const [, tickStr] = requestId.split(":");
    const tick = Number(tickStr);
    const rnd = mulberry32((this.seed ^ (tick * 2654435761)) >>> 0)();
    const z = rnd * 2 - 1;
    return { requestId, proofRef: "dev", z };
  }
}
