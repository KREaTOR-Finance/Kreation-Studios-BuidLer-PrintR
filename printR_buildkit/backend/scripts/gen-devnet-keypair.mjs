import fs from "node:fs";
import path from "node:path";
import { Keypair } from "@solana/web3.js";

const outDir = path.resolve(process.cwd(), ".secrets");
const outPath = path.join(outDir, "devnet-keypair.json");

fs.mkdirSync(outDir, { recursive: true });
const kp = Keypair.generate();
fs.writeFileSync(outPath, JSON.stringify(Array.from(kp.secretKey)), "utf8");
console.log("Wrote:", outPath);
console.log("DEVNET PUBKEY:", kp.publicKey.toBase58());
