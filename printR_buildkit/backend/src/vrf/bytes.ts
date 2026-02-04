export function bytesToSignedUnit(bytes: Uint8Array): number {
  if (bytes.length < 8) {
    throw new Error("Not enough randomness bytes");
  }

  let u64 = 0n;
  for (let i = 0; i < 8; i++) {
    u64 = (u64 << 8n) + BigInt(bytes[i]);
  }

  const u = Number(u64) / 18446744073709551616;
  return (u * 2) - 1;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export function coerceBytes(value: unknown): Uint8Array | null {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return new Uint8Array(value);
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value) && value.length > 0) return Uint8Array.from(value as number[]);

  if (typeof value === "string") {
    const hex = value.startsWith("0x") ? value.slice(2) : value;
    if (hex.length % 2 === 0 && hex.match(/^[0-9a-fA-F]+$/)) {
      return Uint8Array.from(Buffer.from(hex, "hex"));
    }
  }

  const maybe = value as any;
  if (typeof maybe.toArray === "function") {
    try {
      return Uint8Array.from(maybe.toArray("be", 32));
    } catch {}
  }
  if (typeof maybe.toBuffer === "function") {
    try {
      return new Uint8Array(maybe.toBuffer());
    } catch {}
  }

  return null;
}
