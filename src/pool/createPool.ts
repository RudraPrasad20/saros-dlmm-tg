// src/pool/createPool.ts
import { Keypair, Transaction, Connection, PublicKey } from "@solana/web3.js";
import { TOKENS } from "../utils/tokens";
import { sarosDLMM } from "../services/provider";
import { BIN_STEP_CONFIGS } from "@saros-finance/dlmm-sdk";

function resolveToken(input: string) {
  const key = input.toLowerCase();
  const token = Object.values(TOKENS).find(
    (t: any) => t.id.toLowerCase() === key || t.symbol.toLowerCase() === key
  );
  if (!token) throw new Error(`Unknown token: ${input}`);
  return token;
}

const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");

function extractPairAddress(pair: any): string {
  if (!pair) throw new Error("createPairWithConfig returned empty pair");

  // 1) Pair is a PublicKey instance
  if (pair instanceof PublicKey) return pair.toBase58();

  // 2) Pair is a string already
  if (typeof pair === "string") return pair;

  // 3) Common object shapes: address, publicKey, pubkey
  const tryKeys = ["address", "publicKey", "pubkey", "id", "mint"];
  for (const k of tryKeys) {
    if (k in pair) {
      const v = pair[k];
      if (v instanceof PublicKey) return v.toBase58();
      if (typeof v === "string") return v;
      if (v?.toBase58 && typeof v.toBase58 === "function") return v.toBase58();
    }
  }

  // 4) If SDK returns { address: { toBase58() {} } } etc., previous branch covers it.
  // Fallback: serialize (not ideal, but prevents crash)
  return JSON.stringify(pair);
}

export async function createPoolInteractive(
  tokenBaseInput: string,
  tokenQuoteInput: string,
  binStepIndex: number = 1,
  ratePrice: number = 1
): Promise<{ tx: Transaction; pair: any; wallet: Keypair; pairAddress: string }> {
  const tokenBase = resolveToken(tokenBaseInput);
  const tokenQuote = resolveToken(tokenQuoteInput);

  const { blockhash } = await connection.getLatestBlockhash({ commitment: "confirmed" });
  console.log(blockhash);

  const wallet = Keypair.generate();

  const { tx, pair } = await sarosDLMM.createPairWithConfig({
    tokenBase: { mintAddress: tokenBase.mintAddress, decimal: tokenBase.decimals },
    tokenQuote: { mintAddress: tokenQuote.mintAddress, decimal: tokenQuote.decimals },
    binStep: BIN_STEP_CONFIGS[binStepIndex]?.binStep || 1,
    ratePrice,
    payer: wallet.publicKey,
  });

  // defensive extraction
  const pairAddress = extractPairAddress(pair);

  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;

  return { tx: tx as unknown as import("@solana/web3.js").Transaction, pair, wallet, pairAddress };

}
