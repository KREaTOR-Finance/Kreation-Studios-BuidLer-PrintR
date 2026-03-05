export type PriceFeed = {
  solUsd: number; // USD per 1 SOL
  skrUsd: number; // USD per 1 SKR
  fetchedAtMs: number;
  source: "jupiter";
};

const SOL_MINT = "So11111111111111111111111111111111111111112";

let cache: PriceFeed | null = null;

async function jupPriceUsd(mint: string): Promise<number> {
  const url = `https://price.jup.ag/v6/price?ids=${encodeURIComponent(mint)}&vsToken=USD`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error(`JUP_PRICE_HTTP_${r.status}`);
  const j = await r.json() as any;
  const p = Number(j?.data?.[mint]?.price);
  if (!Number.isFinite(p) || p <= 0) throw new Error(`JUP_PRICE_BAD_${mint}`);
  return p;
}

export async function getPriceFeed(args: { skrMint: string }): Promise<PriceFeed> {
  // Cache 15s to reduce rate-limit pain.
  if (cache && Date.now() - cache.fetchedAtMs < 15_000) return cache;

  const [solUsd, skrUsd] = await Promise.all([
    jupPriceUsd(SOL_MINT),
    jupPriceUsd(args.skrMint)
  ]);

  cache = { solUsd, skrUsd, fetchedAtMs: Date.now(), source: "jupiter" };
  return cache;
}
