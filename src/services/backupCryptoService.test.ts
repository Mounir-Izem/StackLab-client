import { randomBytes } from '@noble/hashes/utils.js';

const mockGetRandomBytesAsync = jest.fn((byteCount: number) =>
    Promise.resolve(randomBytes(byteCount))
);

jest.mock('expo-crypto', () => ({
    getRandomBytesAsync: (byteCount: number) => mockGetRandomBytesAsync(byteCount),
}));

import {
    backupCryptoService,
    BACKUP_KDF_ITERATIONS,
    BACKUP_SALT_LENGTH,
    BACKUP_NONCE_LENGTH,
    BACKUP_KEY_LENGTH,
} from './backupCryptoService';

describe('backupCryptoService', () => {
    beforeEach(() => {
        mockGetRandomBytesAsync.mockImplementation((byteCount: number) =>
            Promise.resolve(randomBytes(byteCount))
        );
    });

    it('generates a salt and nonce of the expected length', async () => {
        const salt = await backupCryptoService.generateSalt();
        const nonce = await backupCryptoService.generateNonce();
        expect(salt.length).toBe(BACKUP_SALT_LENGTH);
        expect(nonce.length).toBe(BACKUP_NONCE_LENGTH);
    });

    it('derives a 256-bit key from a PIN and salt', async () => {
        const salt = new Uint8Array(BACKUP_SALT_LENGTH).fill(1);
        const key = await backupCryptoService.deriveKey('123456', salt, 1000);
        expect(key.length).toBe(BACKUP_KEY_LENGTH);
    });

    it('derives different keys for different PINs with the same salt', async () => {
        const salt = new Uint8Array(BACKUP_SALT_LENGTH).fill(1);
        const keyA = await backupCryptoService.deriveKey('123456', salt, 1000);
        const keyB = await backupCryptoService.deriveKey('654321', salt, 1000);
        expect(Array.from(keyA)).not.toEqual(Array.from(keyB));
    });

    it('roundtrips encrypt -> decrypt to the original plaintext', async () => {
        const salt = await backupCryptoService.generateSalt();
        const nonce = await backupCryptoService.generateNonce();
        const key = await backupCryptoService.deriveKey('123456', salt, 1000);
        const plaintext = new TextEncoder().encode(JSON.stringify({ hello: 'stacklab', n: 42 }));

        const ciphertext = backupCryptoService.encrypt(plaintext, key, nonce);
        const decrypted = backupCryptoService.decrypt(ciphertext, key, nonce);

        expect(new TextDecoder().decode(decrypted)).toBe(JSON.stringify({ hello: 'stacklab', n: 42 }));
    });

    it('fails cleanly on decrypt with the wrong key (wrong PIN)', async () => {
        const salt = await backupCryptoService.generateSalt();
        const nonce = await backupCryptoService.generateNonce();
        const rightKey = await backupCryptoService.deriveKey('123456', salt, 1000);
        const wrongKey = await backupCryptoService.deriveKey('000000', salt, 1000);
        const plaintext = new TextEncoder().encode('secret');

        const ciphertext = backupCryptoService.encrypt(plaintext, rightKey, nonce);

        expect(() => backupCryptoService.decrypt(ciphertext, wrongKey, nonce))
            .toThrow('BACKUP_DECRYPTION_FAILED');
    });

    it('fails cleanly on decrypt when the ciphertext has been tampered with', async () => {
        const salt = await backupCryptoService.generateSalt();
        const nonce = await backupCryptoService.generateNonce();
        const key = await backupCryptoService.deriveKey('123456', salt, 1000);
        const plaintext = new TextEncoder().encode('secret');

        const ciphertext = backupCryptoService.encrypt(plaintext, key, nonce);
        const tampered = ciphertext.slice();
        tampered[0] ^= 0xff;

        expect(() => backupCryptoService.decrypt(tampered, key, nonce))
            .toThrow('BACKUP_DECRYPTION_FAILED');
    });

    it('throws SECURE_RANDOM_UNAVAILABLE and never proceeds if native random rejects', async () => {
        mockGetRandomBytesAsync.mockImplementationOnce(() => Promise.reject(new Error('native module unavailable')));
        await expect(backupCryptoService.generateSalt()).rejects.toThrow('SECURE_RANDOM_UNAVAILABLE');
    });

    it('throws SECURE_RANDOM_UNAVAILABLE if native random returns the wrong length', async () => {
        mockGetRandomBytesAsync.mockImplementationOnce(() => Promise.resolve(new Uint8Array(4)));
        await expect(backupCryptoService.generateNonce()).rejects.toThrow('SECURE_RANDOM_UNAVAILABLE');
    });

    it('exposes a single named iteration-count constant, not a hardcoded literal', () => {
        // Temporarily 10_000 (pure-JS Hermes: 300k = 77s UI freeze). Restore to 300_000
        // when react-native-quick-crypto or native crypto.subtle becomes available.
        expect(BACKUP_KDF_ITERATIONS).toBe(10_000);
        expect(BACKUP_KDF_ITERATIONS).toBeGreaterThanOrEqual(500);
    });
});
