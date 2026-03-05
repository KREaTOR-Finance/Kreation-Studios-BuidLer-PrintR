import type { VrfProvider, VrfSample } from "./provider.js";

/**
 * Wrap a VRF provider and fall back to a secondary provider if the primary throws.
 *
 * This prevents the entire backend tick loop from crashing when devnet/RPC/Switchboard
 * is flaky.
 */
export class SafeVrfProvider implements VrfProvider {
  constructor(
    private primary: VrfProvider,
    private fallback: VrfProvider,
    private onError?: (err: unknown) => void
  ) {}

  async requestSample(sessionId: string, tickIndex: number): Promise<{ requestId: string }> {
    try {
      return await this.primary.requestSample(sessionId, tickIndex);
    } catch (e) {
      this.onError?.(e);
      return await this.fallback.requestSample(sessionId, tickIndex);
    }
  }

  async waitForSample(requestId: string): Promise<VrfSample> {
    try {
      return await this.primary.waitForSample(requestId);
    } catch (e) {
      this.onError?.(e);
      return await this.fallback.waitForSample(requestId);
    }
  }
}

