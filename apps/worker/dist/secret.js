"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptSecret = decryptSecret;
const crypto_1 = __importDefault(require("crypto"));
const ALGO = "aes-256-gcm";
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
