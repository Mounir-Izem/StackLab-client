import { Buffer } from 'buffer';
import { z } from 'zod';
import { concatBytes } from '@noble/hashes/utils.js';
import { backupCryptoService, BACKUP_KDF_ITERATIONS } from './backupCryptoService';

function toB64(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64');
}

function fromB64(str: string): Uint8Array {
    return new Uint8Array(Buffer.from(str, 'base64'));
}

export const EncryptedBackupSchema = z.object({
    format: z.literal('stacklab.encryptedBackup'),
    version: z.literal(1),
    createdAt: z.string(),
    appVersion: z.string(),
    kdf: z.object({
        name: z.literal('PBKDF2-SHA256'),
        iterations: z.number().int().min(500),
        salt: z.string(),
        keySize: z.literal(256),
    }),
    cipher: z.object({
        name: z.literal('AES-256-GCM'),
        nonceLength: z.literal(12),
        tagLength: z.literal(16),
    }),
    // payload = base64(nonce[12] || ciphertext || GCM_tag[16])
    payload: z.string(),
});

export type EncryptedBackupFile = z.infer<typeof EncryptedBackupSchema>;

export type BackupFormat = 'encrypted' | 'legacy' | 'unknown';

export function detectBackupFormat(json: string): BackupFormat {
    try {
        const obj = JSON.parse(json) as Record<string, unknown>;
        if (typeof obj !== 'object' || obj === null) return 'unknown';
        if (obj['format'] === 'stacklab.encryptedBackup') return 'encrypted';
        if ('schema_version' in obj && 'exported_at' in obj) return 'legacy';
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

export async function encodeBackupFile(
    plaintext: Uint8Array,
    pin: string,
    appVersion: string,
): Promise<string> {
    const salt = await backupCryptoService.generateSalt();
    const nonce = await backupCryptoService.generateNonce();
    const key = await backupCryptoService.deriveKey(pin, salt, BACKUP_KDF_ITERATIONS);
    const ciphertextWithTag = backupCryptoService.encrypt(plaintext, key, nonce);

    const file: EncryptedBackupFile = {
        format: 'stacklab.encryptedBackup',
        version: 1,
        createdAt: new Date().toISOString(),
        appVersion,
        kdf: {
            name: 'PBKDF2-SHA256',
            iterations: BACKUP_KDF_ITERATIONS,
            salt: toB64(salt),
            keySize: 256,
        },
        cipher: {
            name: 'AES-256-GCM',
            nonceLength: 12,
            tagLength: 16,
        },
        payload: toB64(concatBytes(nonce, ciphertextWithTag)),
    };

    return JSON.stringify(file);
}

// iterations are read from the file itself — forward-compatible if BACKUP_KDF_ITERATIONS changes later
export async function decodeBackupFile(json: string, pin: string): Promise<Uint8Array> {
    const parsed = EncryptedBackupSchema.parse(JSON.parse(json));

    const salt = fromB64(parsed.kdf.salt);
    const payloadBytes = fromB64(parsed.payload);
    const nonce = payloadBytes.slice(0, parsed.cipher.nonceLength);
    const ciphertextWithTag = payloadBytes.slice(parsed.cipher.nonceLength);

    const key = await backupCryptoService.deriveKey(pin, salt, parsed.kdf.iterations);
    return backupCryptoService.decrypt(ciphertextWithTag, key, nonce);
}
