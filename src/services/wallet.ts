import { Keypair } from '@solana/web3.js';
import prisma from '../db/prismaClient';
import { encryptSecret, decryptSecret } from '../utils/crypto';

export async function createWalletForUser(telegramId: string, password: string) {
  const kp = Keypair.generate();
  const secret = Buffer.from(kp.secretKey); // 64 bytes
  const { payload, salt } = encryptSecret(secret, password);
  const publicKey = kp.publicKey.toString();

  const user = await prisma.user.create({
    data: {
      telegramId,
      publicKey,
      encryptedSecretKey: payload,
      salt
    }
  });

  return { publicKey, encryptedSecretKey: payload, salt };
}

export async function getUserByTelegramId(telegramId: string) {
  return prisma.user.findUnique({ where: { telegramId } });
}

export async function signTransactionWithUser(telegramId: string, password: string, signFn: (kp: Keypair) => Promise<any>) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) throw new Error('User not found');
  const decrypted = decryptSecret(user.encryptedSecretKey, password);
  // Recreate Keypair
  const kp = Keypair.fromSecretKey(Uint8Array.from(decrypted));
  try {
    const result = await signFn(kp);
    return result;
  } finally {
    // zero-sensitive buffers where possible
    decrypted.fill(0);
  }
}
