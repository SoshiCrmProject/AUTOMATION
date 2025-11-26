import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

export function encryptSecret(plain: string, key: string): { ciphertext: string; iv: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(key, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([tag, encrypted]).toString("base64"),
    iv: iv.toString("base64")
  };
}

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
