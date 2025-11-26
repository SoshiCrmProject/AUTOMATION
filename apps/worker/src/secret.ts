import crypto from "crypto";

const ALGO = "aes-256-gcm";

export function decryptSecret(ciphertext: string, iv: string, key: string): string {
  const ivBuf = Buffer.from(iv, "base64");
  const data = Buffer.from(ciphertext, "base64");
  const tag = data.subarray(0, 16);
  const text = data.subarray(16);
  const decipher = crypto.createDecipheriv(ALGO, Buffer.from(key, "hex"), ivBuf);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
  return decrypted.toString("utf8");
}
