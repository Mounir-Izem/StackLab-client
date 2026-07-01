import { create } from 'zustand';
import { backupService } from '../services/backupService';
import { lockService } from '../services/lockService';
import { useLabStore } from './labStore';
import {
    detectBackupFormat,
    encodeBackupFile,
    decodeBackupFile,
} from '../services/backupFileFormat';
import {
    writeAndShareExport,
    writeAutoBackup,
    readAutoBackup,
    deleteAutoBackup,
    pickImportFile,
    buildEncryptedBackupFilename,
} from '../utils/backup';
import { useSettingsStore } from './settingsStore';

// Keep in sync with client/app.json version field.
const APP_VERSION = '1.0.0';

async function markBackedUpNow(): Promise<void> {
    await useSettingsStore.getState().updateSettings({ lastBackupAt: new Date().toISOString() });
}

interface BackupStore {
    isExporting: boolean;
    isImporting: boolean;
    isReplacing: boolean;
    isDeletingData: boolean;
    error: string | null;
    pendingEncryptedImport: string | null;
    pendingImportMode: 'merge' | 'replace' | null;

    exportData: () => Promise<void>;
    importData: () => Promise<void>;
    replaceData: () => Promise<boolean>;
    submitImportPin: (pin: string) => Promise<boolean>;
    cancelImport: () => void;
    reEncryptBackup: (oldPin: string, newPin: string) => Promise<void>;
    runAutoBackup: () => Promise<void>;
    deleteAllData: () => Promise<boolean>;
    deleteBackupFile: () => Promise<boolean>;
}

export const useBackupStore = create<BackupStore>((set, get) => ({
    isExporting: false,
    isImporting: false,
    isReplacing: false,
    isDeletingData: false,
    error: null,
    pendingEncryptedImport: null,
    pendingImportMode: null,

    exportData: async () => {
        set({ isExporting: true, error: null });
        try {
            const appLockEnabled = useSettingsStore.getState().settings?.appLockEnabled;
            if (!appLockEnabled) {
                set({ isExporting: false, error: 'EXPORT_REQUIRES_APP_LOCK' });
                return;
            }
            const pin = await lockService.getPin();
            if (!pin) {
                set({ isExporting: false, error: 'EXPORT_REQUIRES_APP_LOCK' });
                return;
            }
            const data = await backupService.buildExport();
            const plaintext = new TextEncoder().encode(JSON.stringify(data));
            await new Promise(resolve => setTimeout(resolve, 100));
            const encryptedJson = await encodeBackupFile(plaintext, pin, APP_VERSION);
            const filename = buildEncryptedBackupFilename(data.exported_at);
            await writeAndShareExport(encryptedJson, filename);
            await markBackedUpNow();
            set({ isExporting: false });
        } catch (error) {
            const cancelled = error instanceof Error && error.message === 'EXPORT_CANCELLED';
            set({ isExporting: false, error: cancelled ? null : 'EXPORT_ERROR' });
        }
    },

    importData: async () => {
        set({ isImporting: true, error: null });
        try {
            const raw = await pickImportFile();
            if (raw === null) {
                set({ isImporting: false });
                return;
            }
            const format = detectBackupFormat(raw);
            if (format === 'unknown') {
                set({ isImporting: false, error: 'IMPORT_INVALID_FILE' });
                return;
            }
            if (format === 'encrypted') {
                set({ isImporting: false, pendingEncryptedImport: raw, pendingImportMode: 'merge' });
                return;
            }
            const data = backupService.validateImport(JSON.parse(raw));
            await backupService.importMerge(data);
            await useLabStore.getState().loadLabs();
            set({ isImporting: false });
        } catch (error) {
            const versionMismatch = error instanceof Error && error.message === 'IMPORT_VERSION_MISMATCH';
            set({ isImporting: false, error: versionMismatch ? 'IMPORT_VERSION_MISMATCH' : 'IMPORT_INVALID_FILE' });
        }
    },

    replaceData: async () => {
        set({ isReplacing: true, error: null });
        try {
            const raw = await pickImportFile();
            if (raw === null) {
                set({ isReplacing: false });
                return false;
            }
            const format = detectBackupFormat(raw);
            if (format === 'unknown') {
                set({ isReplacing: false, error: 'IMPORT_INVALID_FILE' });
                return false;
            }

            const appLockEnabled = useSettingsStore.getState().settings?.appLockEnabled;
            if (!appLockEnabled) {
                set({ isReplacing: false, error: 'REPLACE_REQUIRES_APP_LOCK' });
                return false;
            }

            const pin = await lockService.getPin();
            if (!pin) {
                set({ isReplacing: false, error: 'REPLACE_REQUIRES_APP_LOCK' });
                return false;
            }

            const currentData = await backupService.buildExport();
            const encryptedCurrent = await encodeBackupFile(
                new TextEncoder().encode(JSON.stringify(currentData)), pin, APP_VERSION
            );
            await writeAutoBackup(encryptedCurrent);
            await markBackedUpNow();

            if (format === 'encrypted') {
                try {
                    const decrypted = await decodeBackupFile(raw, pin);
                    const data = backupService.validateImport(JSON.parse(new TextDecoder().decode(decrypted)));
                    await backupService.importReplace(data);
                    set({ isReplacing: false });
                    return true;
                } catch {
                    set({ isReplacing: false, pendingEncryptedImport: raw, pendingImportMode: 'replace' });
                    return false;
                }
            }

            const data = backupService.validateImport(JSON.parse(raw));
            await backupService.importReplace(data);
            await useLabStore.getState().loadLabs();
            set({ isReplacing: false });
            return true;
        } catch (error) {
            const versionMismatch = error instanceof Error && error.message === 'IMPORT_VERSION_MISMATCH';
            set({ isReplacing: false, error: versionMismatch ? 'IMPORT_VERSION_MISMATCH' : 'IMPORT_INVALID_FILE' });
            return false;
        }
    },

    submitImportPin: async (pin: string) => {
        const { pendingEncryptedImport, pendingImportMode } = get();
        if (!pendingEncryptedImport || !pendingImportMode) return false;
        set({ error: null });
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            const decrypted = await decodeBackupFile(pendingEncryptedImport, pin);
            const data = backupService.validateImport(JSON.parse(new TextDecoder().decode(decrypted)));
            if (pendingImportMode === 'merge') {
                await backupService.importMerge(data);
            } else {
                await backupService.importReplace(data);
            }
            await useLabStore.getState().loadLabs();
            set({ pendingEncryptedImport: null, pendingImportMode: null });
            return true;
        } catch (error) {
            const versionMismatch = error instanceof Error && error.message === 'IMPORT_VERSION_MISMATCH';
            const wrongPin = error instanceof Error && error.message === 'BACKUP_DECRYPTION_FAILED';
            set({
                error: wrongPin
                    ? 'IMPORT_WRONG_PIN'
                    : versionMismatch ? 'IMPORT_VERSION_MISMATCH' : 'IMPORT_INVALID_FILE',
            });
            return false;
        }
    },

    cancelImport: () => {
        set({ pendingEncryptedImport: null, pendingImportMode: null, error: null });
    },

    reEncryptBackup: async (oldPin: string, newPin: string) => {
        try {
            const raw = await readAutoBackup();
            if (!raw) return;
            const format = detectBackupFormat(raw);
            if (format !== 'encrypted') return;
            const decrypted = await decodeBackupFile(raw, oldPin);
            const reEncrypted = await encodeBackupFile(decrypted, newPin, APP_VERSION);
            await writeAutoBackup(reEncrypted);
        } catch {
            // Old backup file is untouched — we only overwrite on success.
            set({ error: 'BACKUP_REENCRYPT_FAILED' });
        }
    },

    runAutoBackup: async () => {
        try {
            const settings = useSettingsStore.getState().settings;
            if (!settings?.autoBackupEnabled || !settings?.appLockEnabled) return;
            const pin = await lockService.getPin();
            if (!pin) return;
            const data = await backupService.buildExport();
            if (data.items.length === 0 && settings.lastBackupAt == null) return;
            const encrypted = await encodeBackupFile(
                new TextEncoder().encode(JSON.stringify(data)), pin, APP_VERSION
            );
            await writeAutoBackup(encrypted);
            await markBackedUpNow();
        } catch {
            // Silent by design — nothing to show while backgrounded; retries next cycle.
        }
    },

    deleteAllData: async () => {
        set({ isDeletingData: true, error: null });
        try {
            await backupService.deleteAllData();
            set({ isDeletingData: false });
            return true;
        } catch {
            set({ isDeletingData: false, error: 'DELETE_DATA_ERROR' });
            return false;
        }
    },

    deleteBackupFile: async () => {
        try {
            const deleted = await deleteAutoBackup();
            if (deleted) await useSettingsStore.getState().updateSettings({ lastBackupAt: null });
            return deleted;
        } catch {
            set({ error: 'DELETE_BACKUP_ERROR' });
            return false;
        }
    },
}));
