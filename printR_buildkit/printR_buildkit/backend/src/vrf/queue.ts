import type { VrfProvider, VrfSample } from "./provider.js";

export class VrfQueue {
  private provider: VrfProvider;
  private buffers = new Map<string, VrfSample[]>();
  private inFlight = new Map<string, Set<string>>();

  constructor(provider: VrfProvider) {
    this.provider = provider;
  }

  async ensureBuffered(sessionId: string, nextTickIndex: number, targetDepth = 3): Promise<void> {
    const buf = this.buffers.get(sessionId) ?? [];
    const inflight = this.inFlight.get(sessionId) ?? new Set<string>();
    this.buffers.set(sessionId, buf);
    this.inFlight.set(sessionId, inflight);

    while (buf.length + inflight.size < targetDepth) {
      const { requestId } = await this.provider.requestSample(sessionId, nextTickIndex + buf.length + inflight.size);
      inflight.add(requestId);

      this.provider.waitForSample(requestId)
        .then(sample => {
          inflight.delete(requestId);
          buf.push(sample);
        })
        .catch(() => {
          inflight.delete(requestId);
        });
    }
  }

  consume(sessionId: string): VrfSample | null {
    const buf = this.buffers.get(sessionId);
    if (!buf || buf.length === 0) return null;
    return buf.shift() ?? null;
  }
}
