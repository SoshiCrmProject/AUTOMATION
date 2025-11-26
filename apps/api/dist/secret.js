"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
const crypto_1 = __importDefault(require("crypto"));
const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
function encryptSecret(plain, key) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGO, Buffer.from(key, "hex"), iv);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        ciphertext: Buffer.concat([tag, encrypted]).toString("base64"),
        iv: iv.toString("base64")
    };
}
function decryptSecret(ciphertext, iv, key) {
    const ivBuf = Buffer.from(iv, "base64");
    const data = Buffer.from(ciphertext, "base64");
    const tag = data.subarray(0, 16);
    const text = data.subarray(16);
    const decipher = crypto_1.default.createDecipheriv(ALGO, Buffer.from(key, "hex"), ivBuf);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
    return decrypted.toString("utf8");
}
