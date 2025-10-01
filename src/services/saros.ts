// src/services/saros.ts
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { sarosDLMM } from "./provider"; // your instantiated Saros SDK service

const RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL);

const saros = sarosDLMM;

export interface SwapQuote {
  amountOut: bigint;
  priceImpact: number;
  fee: bigint;
  poolId: string;
}

const TOKEN_MINTS: Record<string, { mint: string; decimals: number }> = {
  SOL: { mint: "So11111111111111111111111111111111111111112", decimals: 9 },
  USDC: { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
  USDT: { mint: "Es9vMFrzaCERmJFr4Y7cHuaQSvq7SLWjtKh6zUZze7XA", decimals: 6 },
  JUP: { mint: "JUPyEiTgC1uoXFLRzL6zZFxYQq1W3aG3W2rbmS6jwxCL", decimals: 6 },
  PYUSD: { mint: "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM", decimals: 6 },
};

function resolveMintInfo(input: string) {
  const key = input.toUpperCase();
  return TOKEN_MINTS[key] ?? { mint: input, decimals: 6 };
}

export interface SwapQuote {
  outputAmount: number;
  priceImpact: number;
  fees: number;
  poolId: string;
  raw: any;
  pair?: string;
  tokenBase?: string;
  tokenQuote?: string;
  amountRaw?: bigint;
  amountHuman?: number;
  tokenBaseDecimal: number;
  tokenQuoteDecimal: number;
  swapForY: boolean;
  isExactInput: boolean;
}

export async function getPools() {
  return saros.fetchPoolAddresses();
}

export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: number
) {
  const inInfo = resolveMintInfo(inputMint);
  const outInfo = resolveMintInfo(outputMint);

  const inputPub = new PublicKey(inInfo.mint);
  const outputPub = new PublicKey(outInfo.mint);

  // fetch pool addresses and search for a pool that has these mints
  const poolAddresses: string[] = await saros.fetchPoolAddresses();
  if (!poolAddresses || poolAddresses.length === 0)
    throw new Error("No pools available");

  let foundPoolAddr: string | null = null;
  let foundMetadata: any = null;

  for (const addr of poolAddresses) {
    try {
      const meta = await saros.fetchPoolMetadata(addr);
      const baseMint = meta?.baseMint;
      const quoteMint = meta?.quoteMint;
      if (!baseMint || !quoteMint) continue;
      if (
        (baseMint === inInfo.mint && quoteMint === outInfo.mint) ||
        (baseMint === outInfo.mint && quoteMint === inInfo.mint)
      ) {
        foundPoolAddr = addr;
        foundMetadata = meta;
        break;
      }
    } catch (e) {
      throw new Error(
        "getSwapQuote needs to be implemented with proper parameters"
      );
      continue;
    }
  }

  if (!foundPoolAddr || !foundMetadata) {
    throw new Error("No matching pool found for given token pair");
  }

  const baseDecimals =
    foundMetadata?.extra?.tokenBaseDecimal ?? inInfo.decimals;
  const quoteDecimals =
    foundMetadata?.extra?.tokenQuoteDecimal ?? outInfo.decimals;

  const swapForY = foundMetadata.baseMint === inInfo.mint;
  const isExactInput = true;

  const amountRaw = BigInt(
    Math.floor(
      amount * Math.pow(10, swapForY ? baseDecimals : outInfo.decimals)
    )
  );

  const sdk: any = saros as any;
  const pairPub = new PublicKey(foundPoolAddr);
  const params = {
    pair: pairPub,
    tokenBase: new PublicKey(foundMetadata.baseMint),
    tokenQuote: new PublicKey(foundMetadata.quoteMint),
    amount: amountRaw,
    swapForY,
    isExactInput,
    tokenBaseDecimal: baseDecimals,
    tokenQuoteDecimal: quoteDecimals,
    slippage: 50,
  };

  const tryMethods = [
    "getTokenOutput",
    "getQuote",
    "getSwapQuote",
    "getEstimation",
    "quote",
  ];
  for (const m of tryMethods) {
    if (typeof sdk[m] === "function") {
      const sdkQuote = await sdk[m](params);
      let amountOutRaw: any =
        sdkQuote?.amountOut ??
        sdkQuote?.amount_out ??
        sdkQuote?.outputAmount ??
        sdkQuote?.outputAmountRaw ??
        sdkQuote?.out ??
        sdkQuote?.amount;

      let outputAmount: number;
      try {
        if (typeof amountOutRaw === "bigint") {
          outputAmount = Number(amountOutRaw) / Math.pow(10, quoteDecimals);
        } else if (
          typeof amountOutRaw === "string" &&
          /^\d+$/.test(amountOutRaw)
        ) {
          outputAmount =
            Number(BigInt(amountOutRaw)) / Math.pow(10, quoteDecimals);
        } else if (typeof amountOutRaw === "number") {
          outputAmount = amountOutRaw / Math.pow(10, quoteDecimals);
        } else {
          outputAmount =
            Number(sdkQuote?.output ?? sdkQuote?.amountOut ?? 0) /
            Math.pow(10, quoteDecimals);
        }
      } catch {
        outputAmount = 0;
      }

      return {
        outputAmount,
        priceImpact: Number(
          sdkQuote?.priceImpact ?? sdkQuote?.price_impact ?? 0
        ),
        fees: Number(sdkQuote?.fees ?? sdkQuote?.fee ?? 0),
        poolId: foundPoolAddr,
        raw: sdkQuote,
        pair: foundPoolAddr,
        tokenBase: foundMetadata.baseMint,
        tokenQuote: foundMetadata.quoteMint,
        amountRaw,
        amountHuman: amount,
        tokenBaseDecimal: baseDecimals,
        tokenQuoteDecimal: quoteDecimals,
        swapForY,
        isExactInput,
      } as SwapQuote;
    }
  }
  try {
    const baseReserveRaw = Number(foundMetadata.baseReserve);
    const quoteReserveRaw = Number(foundMetadata.quoteReserve);

    if (
      !isFinite(baseReserveRaw) ||
      !isFinite(quoteReserveRaw) ||
      baseReserveRaw <= 0 ||
      quoteReserveRaw <= 0
    ) {
      throw new Error("Pool reserves unavailable for fallback estimate");
    }
    const amountRawNum = Number(amountRaw);
    const outRaw =
      (amountRawNum * quoteReserveRaw) / (baseReserveRaw + amountRawNum);
    const outputAmount = outRaw / Math.pow(10, quoteDecimals);

    return {
      outputAmount,
      priceImpact: 0,
      fees: 0,
      poolId: foundPoolAddr,
      raw: { fallback: true, baseReserveRaw, quoteReserveRaw },
      pair: foundPoolAddr,
      tokenBase: foundMetadata.baseMint,
      tokenQuote: foundMetadata.quoteMint,
      amountRaw,
      amountHuman: amount,
      tokenBaseDecimal: baseDecimals,
      tokenQuoteDecimal: quoteDecimals,
      swapForY,
      isExactInput,
    } as SwapQuote;
  } catch (e) {
    throw new Error("Unable to produce quote: " + (e as Error).message);
  }
}

export async function buildSwapTransaction(
  userPublicKey: string,
  swapParams: any
): Promise<Transaction> {
  return ((await saros.swap({
    tokenMintX: new PublicKey(swapParams.tokenMintX),
    tokenMintY: new PublicKey(swapParams.tokenMintY),
    amount: BigInt(swapParams.amount),
    otherAmountOffset: BigInt(swapParams.otherAmountOffset || 0),
    swapForY: swapParams.swapForY,
    isExactInput: swapParams.isExactInput,
    pair: new PublicKey(swapParams.pair),
    hook: new PublicKey(swapParams.hook),
    payer: new PublicKey(userPublicKey),
  })) as unknown) as Transaction;
}
