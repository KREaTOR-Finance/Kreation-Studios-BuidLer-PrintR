export class RateLimiter {
    buckets = new Map();
    allow(key, limit, windowMs) {
        const now = Date.now();
        const existing = this.buckets.get(key);
        if (!existing || (now - existing.windowStart) > windowMs) {
            this.buckets.set(key, { windowStart: now, count: 1 });
            return true;
        }
        if (existing.count >= limit)
            return false;
        existing.count += 1;
        return true;
    }
}
