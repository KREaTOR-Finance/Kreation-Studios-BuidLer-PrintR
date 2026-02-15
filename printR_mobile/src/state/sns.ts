/**
 * SNS (Solana Name Service) reverse lookup.
 *
 * Given a wallet PublicKey, resolves the primary .sol domain name.
 * Uses @bonfida/spl-name-service for the lookup.
 *
 * Falls back gracefully to null if no .sol name exists or the
 * lookup fails (e.g. no RPC, package not available).
 */
import { Connection, PublicKey } from "@solana/web3.js";

// ─── SNS Constants ───────────────────────────────────────────────
// The SNS program ID (Bonfida Name Service)
const NAME_PROGRAM_ID = new PublicKey(
  "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX"
);

// The .sol TLD class (hashed "sol" under the root)
const SOL_TLD_AUTHORITY = new PublicKey(
  "58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx"
);

// Reverse lookup class
const REVERSE_LOOKUP_CLASS = new PublicKey(
  "33m47vH6Eav6jr5Ry86XjhRft2jRBLDnDgPBSmJJbJat" // Bonfida reverse lookup class -- NOT the central state
);

/**
 * Resolve the primary .sol name for a given wallet pubkey.
 * Returns "name.sol" or null if no reverse record exists.
 */
export async function resolveSnsName(
  connection: Connection,
  owner: PublicKey
): Promise<string | null> {
  try {
    // Try dynamic import of @bonfida/spl-name-service first
    const sns = await import("@bonfida/spl-name-service");

    if (sns.getFavoriteDomain) {
      // Preferred: get the user's favorite domain
      try {
        const fav = await sns.getFavoriteDomain(connection, owner);
        if (fav?.domain) return `${fav.domain}.sol`;
      } catch {
        // No favorite set, fall through to reverse lookup
      }
    }

    if (sns.reverseLookup) {
      // Fallback: get any reverse record
      try {
        const reverseKey = await getReverseKey(owner);
        const accountInfo = await connection.getAccountInfo(reverseKey);
        if (accountInfo?.data) {
          const name = sns.reverseLookup(connection, reverseKey);
          if (name) return `${await name}.sol`;
        }
      } catch {
        // No reverse record
      }
    }

    // Final fallback: getAllDomains if available
    if (sns.getAllDomains) {
      try {
        const domains = await sns.getAllDomains(connection, owner);
        if (domains && domains.length > 0) {
          const first = domains[0];
          const name = await sns.reverseLookup(connection, first);
          if (name) return `${name}.sol`;
        }
      } catch {
        // ignore
      }
    }

    return null;
  } catch {
    // @bonfida/spl-name-service not available — try manual reverse lookup
    return manualReverseLookup(connection, owner);
  }
}

/**
 * Manual reverse lookup without the Bonfida SDK.
 * Derives the reverse lookup PDA and reads the name from account data.
 */
async function manualReverseLookup(
  connection: Connection,
  owner: PublicKey
): Promise<string | null> {
  try {
    const reverseKey = await getReverseKey(owner);
    const accountInfo = await connection.getAccountInfo(reverseKey);
    if (!accountInfo?.data || accountInfo.data.length < 96) return null;

    // SNS account layout: 96 bytes header, then UTF-8 name data
    const nameData = accountInfo.data.slice(96);
    const name = new TextDecoder()
      .decode(nameData)
      .replace(/\0+$/, "")
      .trim();

    if (!name || name.length === 0) return null;
    return `${name}.sol`;
  } catch {
    return null;
  }
}

/**
 * Derive the reverse lookup PDA for a given owner.
 */
async function getReverseKey(owner: PublicKey): Promise<PublicKey> {
  const hashedName = await getHashedName(owner.toBase58());
  const [reverseKey] = PublicKey.findProgramAddressSync(
    [hashedName, REVERSE_LOOKUP_CLASS.toBuffer(), owner.toBuffer()],
    NAME_PROGRAM_ID
  );
  return reverseKey;
}

/**
 * Hash a name according to SNS convention: SHA-256 of HASH_PREFIX + name.
 */
const HASH_PREFIX = "SPL Name Service";

async function getHashedName(name: string): Promise<Buffer> {
  const input = `${HASH_PREFIX}${name}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest("SHA-256", encoded);
    return Buffer.from(hash);
  }
  // Fallback: use a simple hash (won't match on-chain but avoids crash)
  const bytes = new Uint8Array(32);
  for (let i = 0; i < input.length; i++) {
    bytes[i % 32] ^= input.charCodeAt(i);
  }
  return Buffer.from(bytes);
}

/**
 * Batch-resolve SNS names for multiple pubkeys.
 * Returns a Map of base58 pubkey -> "name.sol" | null.
 */
export async function batchResolveSnsNames(
  connection: Connection,
  owners: PublicKey[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  // Resolve in parallel with a concurrency limit
  const BATCH_SIZE = 5;
  for (let i = 0; i < owners.length; i += BATCH_SIZE) {
    const batch = owners.slice(i, i + BATCH_SIZE);
    const resolved = await Promise.allSettled(
      batch.map((pk) => resolveSnsName(connection, pk))
    );
    batch.forEach((pk, idx) => {
      const result = resolved[idx];
      results.set(
        pk.toBase58(),
        result.status === "fulfilled" ? result.value : null
      );
    });
  }
  return results;
}
