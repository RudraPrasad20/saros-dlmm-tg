import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // AES-GCM recommended

function deriveKey(password: string, salt: Buffer): Buffer {
  // scrypt parameters: N=16384, r=8, p=1 by default for scryptSync
  return scryptSync(password, salt, 32);
}

export function encryptSecret(secret: Buffer, password: string) {
  const salt = randomBytes(16);
  const key = deriveKey(password, salt);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // store: salt | iv | authTag | encrypted
  return {
    payload: Buffer.concat([salt, iv, authTag, encrypted]).toString('base64'),
    salt: salt.toString('base64')
  };
}

export function decryptSecret(payloadB64: string, password: string) {
  const payload = Buffer.from(payloadB64, 'base64');
  const salt = payload.slice(0, 16);
  const iv = payload.slice(16, 16 + IV_LEN);
  const authTag = payload.slice(16 + IV_LEN, 16 + IV_LEN + 16);
  const encrypted = payload.slice(16 + IV_LEN + 16);
  const key = deriveKey(password, salt);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted;
}
