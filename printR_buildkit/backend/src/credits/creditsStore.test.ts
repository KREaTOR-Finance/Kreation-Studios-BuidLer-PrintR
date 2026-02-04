import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InMemoryCreditsStore } from "./store.js";
import { SqliteCreditsStore } from "./sqliteCreditsStore.js";
import type { CreditsStore } from "./store.js";

type StoreHarness = {
  store: CreditsStore;
  cleanup?: () => void;
};

const fixtures = [
  {
    name: "in-memory",
    create: async (): Promise<StoreHarness> => ({ store: new InMemoryCreditsStore() })
  },
  {
    name: "sqlite",
    create: async (): Promise<StoreHarness> => {
      const store = new SqliteCreditsStore(":memory:");
      store.migrate();
      return { store, cleanup: () => store.close() };
    }
  }
];

describe.each(fixtures)("credits store ($name)", ({ create }) => {
  let store: CreditsStore;
  let cleanup: (() => void) | undefined;

  beforeEach(async () => {
    const harness = await create();
    store = harness.store;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup?.();
  });

  it("consumes once with idempotency", async () => {
    await store.addLedger({
      playerRef: "tg:test",
      deltaSessions: 2,
      reason: "purchase",
      source: "stripe",
      externalRef: "evt_1"
    });

    const first = await store.consumeOneSession("tg:test", "session-1", "idem-1");
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.balance).toBe(1);

    const second = await store.consumeOneSession("tg:test", "session-1", "idem-1");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("DUPLICATE");

    const balance = await store.getBalance("tg:test");
    expect(balance).toBe(1);
  });

  it("records webhook events idempotently", async () => {
    if (!store.recordWebhookEvent) {
      throw new Error("recordWebhookEvent not implemented");
    }

    const first = await Promise.resolve(store.recordWebhookEvent("stripe", "evt_1"));
    const second = await Promise.resolve(store.recordWebhookEvent("stripe", "evt_1"));

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("prevents negative balances", async () => {
    await expect(
      store.addLedger({
        playerRef: "tg:test",
        deltaSessions: -1,
        reason: "consume",
        source: "system",
        externalRef: "session-1"
      })
    ).rejects.toThrow("INSUFFICIENT_SESSIONS");

    const balance = await store.getBalance("tg:test");
    expect(balance).toBe(0);
  });
});
