import * as Crypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { gcm } from '@noble/ciphers/aes.js';

// crypto.subtle unavailable in Expo Go (polyfill overwrites globalThis.crypto without subtle).
// 300k pure-JS iterations on Hermes = 77-114s and blocks the UI thread.
// Temporary: 10k = ~2.6s, acceptable UX. Restore to 300k when native PBKDF2 is available
// (react-native-quick-crypto via EAS dev build, or when Expo exposes crypto.subtle).
export const BACKUP_KDF_ITERATIONS = 10_000;
export const BACKUP_SALT_LENGTH = 16;
export const BACKUP_NONCE_LENGTH = 12;
export const BACKUP_KEY_LENGTH = 32;

// getRandomBytesAsync uses the native CSPRNG with no dev/debugger fallback
// (unlike the sync getRandomBytes, whose own docs note a Math.random fallback
// under the remote debugger). Salts and nonces must never go through that path.
async function getSecureRandomBytes(byteCount: number): Promise<Uint8Array> {
    let bytes: Uint8Array;
    try {
        bytes = await Crypto.getRandomBytesAsync(byteCount);
    } catch {
        throw new Error('SECURE_RANDOM_UNAVAILABLE');
    }
    if (!(bytes instanceof Uint8Array) || bytes.length !== byteCount) {
        throw new Error('SECURE_RANDOM_UNAVAILABLE');
    }
    return bytes;
}

export const backupCryptoService = {
    async generateSalt(): Promise<Uint8Array> {
        return getSecureRandomBytes(BACKUP_SALT_LENGTH);
    },

    async generateNonce(): Promise<Uint8Array> {
        return getSecureRandomBytes(BACKUP_NONCE_LENGTH);
    },

    // Prefer native SubtleCrypto for PBKDF2 when available (CommonCrypto / Conscrypt).
    // Falls back to @noble/hashes (pure JS) — acceptable for Node.js CI and as a safety net.
    // Note: crypto.subtle is currently unavailable in Expo Go (the expo-crypto polyfill
    // overwrites globalThis.crypto with only getRandomValues, no subtle). At 10k iterations
    // the pure-JS path takes ~3–4s on device, which is acceptable. See BACKUP_KDF_ITERATIONS.
    async deriveKey(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
        const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle;
        try {
            if (subtle) {
                const keyMaterial = await subtle.importKey(
                    'raw',
                    new TextEncoder().encode(pin),
                    'PBKDF2',
                    false,
                    ['deriveBits'],
                );
                const bits = await subtle.deriveBits(
                    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations },
                    keyMaterial,
                    BACKUP_KEY_LENGTH * 8,
                );
                return new Uint8Array(bits);
            }
        } catch {
            // subtle unavailable or failed — fall through to @noble
        }
        return pbkdf2Async(sha256, pin, salt, { c: iterations, dkLen: BACKUP_KEY_LENGTH });
    },

    encrypt(plaintext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
        return gcm(key, nonce).encrypt(plaintext);
    },

    // Wrong key and tampered ciphertext are cryptographically indistinguishable
    // with AEAD (both fail GCM tag verification) — callers must show one generic
    // "wrong PIN or corrupted file" message, never imply which one it was.
    decrypt(ciphertext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
        try {
            return gcm(key, nonce).decrypt(ciphertext);
        } catch {
            throw new Error('BACKUP_DECRYPTION_FAILED');
        }
    },
};
