export class VrfQueue {
    provider;
    buffers = new Map();
    inFlight = new Map();
    constructor(provider) {
        this.provider = provider;
    }
    async ensureBuffered(sessionId, nextTickIndex, targetDepth = 3) {
        const buf = this.buffers.get(sessionId) ?? [];
        const inflight = this.inFlight.get(sessionId) ?? new Set();
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
    consume(sessionId) {
        const buf = this.buffers.get(sessionId);
        if (!buf || buf.length === 0)
            return null;
        return buf.shift() ?? null;
    }
}
