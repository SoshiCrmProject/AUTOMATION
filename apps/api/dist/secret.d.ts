export declare function encryptSecret(plain: string, key: string): {
    ciphertext: string;
    iv: string;
};
export declare function decryptSecret(ciphertext: string, iv: string, key: string): string;
