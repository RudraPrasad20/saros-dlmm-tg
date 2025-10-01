import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

// Use a fixed server-side secret
const SERVER_SECRET = "my_super_secret_key"; // keep this secret safe

function deriveKey(password: string, salt: Buffer) {
  return scryptSync(password, salt, 32);
}

export function encryptSecret(secret: Buffer) {
  const salt = Buffer.from("fixed_salt_123456"); // fixed salt
  const key = deriveKey(SERVER_SECRET, salt);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // store: iv | authTag | encrypted
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payloadB64: string) {
  const payload = Buffer.from(payloadB64, "base64");
  const salt = Buffer.from("fixed_salt_123456"); // same fixed salt
  const key = deriveKey(SERVER_SECRET, salt);

  const iv = payload.slice(0, IV_LEN);
  const authTag = payload.slice(IV_LEN, IV_LEN + 16);
  const encrypted = payload.slice(IV_LEN + 16);

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted;
}
