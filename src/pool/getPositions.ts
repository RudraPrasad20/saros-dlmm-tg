// positions.ts
import { PublicKey, Keypair } from "@solana/web3.js";
import { sarosDLMM } from "../services/provider.js";
import prisma from "../db/prismaClient";
import { decryptSecret } from "../utils/crypto.js";

// ✅ function to load a wallet from secret stored in Prisma
export async function loadWalletFromDB(userId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId: userId },
    select: { encryptedSecretKey: true },
  });

  if (!user?.encryptedSecretKey) throw new Error("No wallet found for this user");

  // decrypt using your crypto.ts
  const decrypted = decryptSecret(user.encryptedSecretKey); 
  // decrypted is a Buffer containing the raw secret key bytes

  return Keypair.fromSecretKey(decrypted);
}

export async function getUserPositions(userId: string, pairAddress: string) {
  // load wallet
  const wallet = await loadWalletFromDB(userId);

  // load pair
  const pair = new PublicKey(pairAddress);
  const pairInfo = await sarosDLMM.getPairAccount(pair);

  // fetch positions
  const positions = await sarosDLMM.getUserPositions({
    payer: wallet.publicKey,
    pair,
  });

  if (!positions.length) {
    console.log("No positions found for user");
    return [];
  }

  console.log("✅ User Positions:", positions);
  return positions;
}
