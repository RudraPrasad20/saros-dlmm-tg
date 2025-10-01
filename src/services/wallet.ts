import { Keypair } from "@solana/web3.js";
import prisma from "../db/prismaClient";
import { encryptSecret, decryptSecret } from "../utils/crypto";

export async function createWalletForUser(telegramId: string) {
  const kp = Keypair.generate();
  const secret = Buffer.from(kp.secretKey);

// now you can encrypt it
const encryptedSecretKey = encryptSecret(secret);
  await prisma.user.update({
    where: { telegramId },
    data: { encryptedSecretKey, salt: "fixed_salt_123456" }, // optional
  });
  

  // simplified encryptSecret returns just a string

  const publicKey = kp.publicKey.toString();

  // store in Prisma
  const user = await prisma.user.create({
    data: {
      telegramId,
      publicKey,
      encryptedSecretKey,
    },
  });

  return { publicKey, encryptedSecretKey };
}

export async function getUserByTelegramId(telegramId: string) {
  return prisma.user.findUnique({ where: { telegramId } });
}

// sign a transaction with the user's wallet
export async function signTransactionWithUser(
  telegramId: string,
  signFn: (kp: Keypair) => Promise<any>
) {
  const user = await getUserByTelegramId(telegramId);
  if (!user?.encryptedSecretKey) throw new Error("User not found or wallet missing");

  const decrypted = decryptSecret(user.encryptedSecretKey); // returns Buffer
  const kp = Keypair.fromSecretKey(decrypted);

  try {
    const result = await signFn(kp);
    return result;
  } finally {
    decrypted.fill(0);
  }
}
