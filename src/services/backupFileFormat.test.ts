import { randomBytes } from '@noble/hashes/utils.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

const mockGetRandomBytesAsync = jest.fn((byteCount: number) =>
    Promise.resolve(randomBytes(byteCount))
);

jest.mock('expo-crypto', () => ({
    getRandomBytesAsync: (byteCount: number) => mockGetRandomBytesAsync(byteCount),
}));

import { backupCryptoService, BACKUP_KDF_ITERATIONS, BACKUP_KEY_LENGTH } from './backupCryptoService';
import {
    detectBackupFormat,
    encodeBackupFile,
    decodeBackupFile,
    EncryptedBackupSchema,
} from './backupFileFormat';

// 300k PBKDF2 iterations are tested in backupCryptoService.test.ts.
// Here we test format concerns — override deriveKey to 1k iterations to keep the suite fast.
const FAST_ITERATIONS = 1_000;
let deriveKeySpy: jest.SpyInstance;

beforeEach(() => {
    mockGetRandomBytesAsync.mockImplementation((byteCount: number) =>
        Promise.resolve(randomBytes(byteCount))
    );
    deriveKeySpy = jest
        .spyOn(backupCryptoService, 'deriveKey')
        .mockImplementation((pin: string, salt: Uint8Array) =>
            pbkdf2Async(sha256, pin, salt, { c: FAST_ITERATIONS, dkLen: BACKUP_KEY_LENGTH })
        );
});

afterEach(() => {
    deriveKeySpy.mockRestore();
});

const LEGACY_JSON = JSON.stringify({
    schema_version: 1,
    exported_at: '2026-01-01T00:00:00.000Z',
    labs: [],
    items: [],
});
const PLAINTEXT = new TextEncoder().encode(LEGACY_JSON);
const PIN = '123456';

// base64 helpers (same as backupFileFormat internally uses, via 'buffer' package)
function b64ToU8(str: string): Uint8Array {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}
function u8ToB64(bytes: Uint8Array): string {
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin);
}

describe('detectBackupFormat', () => {
    it('identifies an encrypted .stacklab file', () => {
        expect(detectBackupFormat(JSON.stringify({ format: 'stacklab.encryptedBackup' }))).toBe('encrypted');
    });

    it('identifies a legacy plain-text export', () => {
        expect(detectBackupFormat(LEGACY_JSON)).toBe('legacy');
    });

    it('returns unknown for unrecognised JSON', () => {
        expect(detectBackupFormat(JSON.stringify({ something: 'else' }))).toBe('unknown');
    });

    it('returns unknown for invalid JSON', () => {
        expect(detectBackupFormat('not json at all')).toBe('unknown');
    });
});

describe('EncryptedBackupSchema', () => {
    const validBase = {
        format: 'stacklab.encryptedBackup' as const,
        version: 1 as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        appVersion: '1.0.0',
        kdf: { name: 'PBKDF2-SHA256' as const, iterations: 100_000, salt: 'abc', keySize: 256 as const },
        cipher: { name: 'AES-256-GCM' as const, nonceLength: 12 as const, tagLength: 16 as const },
        payload: 'abc',
    };

    it('accepts a valid shape', () => {
        expect(() => EncryptedBackupSchema.parse(validBase)).not.toThrow();
    });

    it('rejects iterations below 500', () => {
        expect(() => EncryptedBackupSchema.parse({
            ...validBase, kdf: { ...validBase.kdf, iterations: 499 },
        })).toThrow();
    });

    it('rejects a wrong format string', () => {
        expect(() => EncryptedBackupSchema.parse({ ...validBase, format: 'stacklab.plainBackup' })).toThrow();
    });

    it('rejects a wrong cipher name', () => {
        expect(() => EncryptedBackupSchema.parse({
            ...validBase, cipher: { ...validBase.cipher, name: 'AES-128-GCM' },
        })).toThrow();
    });
});

describe('encodeBackupFile', () => {
    it('produces a valid JSON string parseable by EncryptedBackupSchema', async () => {
        const json = await encodeBackupFile(PLAINTEXT, PIN, '1.2.3');
        const obj = JSON.parse(json);
        expect(() => EncryptedBackupSchema.parse(obj)).not.toThrow();
        expect(obj.format).toBe('stacklab.encryptedBackup');
        expect(obj.appVersion).toBe('1.2.3');
        expect(obj.kdf.name).toBe('PBKDF2-SHA256');
        expect(obj.kdf.keySize).toBe(256);
        expect(obj.cipher.nonceLength).toBe(12);
        expect(obj.cipher.tagLength).toBe(16);
    });

    it('embeds BACKUP_KDF_ITERATIONS in the file metadata', async () => {
        const json = await encodeBackupFile(PLAINTEXT, PIN, '1.2.3');
        expect(JSON.parse(json).kdf.iterations).toBe(BACKUP_KDF_ITERATIONS);
    });

    it('produces a unique payload and salt on every call', async () => {
        const a = await encodeBackupFile(PLAINTEXT, PIN, '1.2.3');
        const b = await encodeBackupFile(PLAINTEXT, PIN, '1.2.3');
        expect(JSON.parse(a).payload).not.toBe(JSON.parse(b).payload);
        expect(JSON.parse(a).kdf.salt).not.toBe(JSON.parse(b).kdf.salt);
    });
});

describe('decodeBackupFile', () => {
    it('roundtrips: encode then decode returns the original plaintext', async () => {
        const json = await encodeBackupFile(PLAINTEXT, PIN, '1.2.3');
        const decoded = await decodeBackupFile(json, PIN);
        expect(new TextDecoder().decode(decoded)).toBe(LEGACY_JSON);
    });

    it('throws BACKUP_DECRYPTION_FAILED on wrong PIN', async () => {
        const json = await encodeBackupFile(PLAINTEXT, PIN, '1.2.3');
        await expect(decodeBackupFile(json, '000000')).rejects.toThrow('BACKUP_DECRYPTION_FAILED');
    });

    it('throws BACKUP_DECRYPTION_FAILED on tampered payload', async () => {
        const json = await encodeBackupFile(PLAINTEXT, PIN, '1.2.3');
        const obj = JSON.parse(json);
        const bytes = b64ToU8(obj.payload);
        bytes[20] ^= 0xff;
        obj.payload = u8ToB64(bytes);
        await expect(decodeBackupFile(JSON.stringify(obj), PIN)).rejects.toThrow('BACKUP_DECRYPTION_FAILED');
    });

    it('rejects an unknown format string', async () => {
        await expect(decodeBackupFile('{"format":"stacklab.plainBackup"}', PIN)).rejects.toThrow();
    });

    it('uses kdf.iterations from the file, not the hardcoded constant', async () => {
        const json = await encodeBackupFile(PLAINTEXT, PIN, '1.2.3');
        const obj = JSON.parse(json);

        // Patch to a distinct valid value — proves decodeBackupFile reads from the file,
        // not from BACKUP_KDF_ITERATIONS.
        const PATCHED_ITERATIONS = 150_000;
        obj.kdf.iterations = PATCHED_ITERATIONS;

        const capturedIterations: number[] = [];
        deriveKeySpy.mockImplementation((pin: string, salt: Uint8Array, iterations: number) => {
            capturedIterations.push(iterations);
            // spy still uses FAST_ITERATIONS internally so encode/decode keys match
            return pbkdf2Async(sha256, pin, salt, { c: FAST_ITERATIONS, dkLen: BACKUP_KEY_LENGTH });
        });

        const decoded = await decodeBackupFile(JSON.stringify(obj), PIN);
        expect(new TextDecoder().decode(decoded)).toBe(LEGACY_JSON);
        expect(capturedIterations[0]).toBe(PATCHED_ITERATIONS);
        expect(capturedIterations[0]).not.toBe(BACKUP_KDF_ITERATIONS);
    });
});
