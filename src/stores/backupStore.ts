import { create } from 'zustand';
import { backupService } from '../services/backupService';
import { writeAndShareExport, writeAutoBackup, deleteAutoBackup, pickImportFile } from '../utils/backup';
import { useSettingsStore } from './settingsStore';

async function markBackedUpNow(): Promise<void> {
    await useSettingsStore.getState().updateSettings({ lastBackupAt: new Date().toISOString() });
}

interface BackupStore {
    isExporting: boolean;
    isImporting: boolean;
    isReplacing: boolean;
    isDeletingData: boolean;
    error: string | null;

    exportData: () => Promise<void>;
    importData: () => Promise<void>;
    replaceData: () => Promise<boolean>;
    runAutoBackup: () => Promise<void>;
    deleteAllData: () => Promise<boolean>;
    deleteBackupFile: () => Promise<boolean>;
}

export const useBackupStore = create<BackupStore>((set) => ({
    isExporting: false,
    isImporting: false,
    isReplacing: false,
    isDeletingData: false,
    error: null,

    exportData: async () => {
        set({ isExporting: true, error: null });
        try {
            const data = await backupService.buildExport();
            await writeAndShareExport(data);
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
            const data = backupService.validateImport(raw);
            await backupService.importMerge(data);
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
            const data = backupService.validateImport(raw);

            const currentData = await backupService.buildExport();
            try {
                await writeAndShareExport(currentData);
                await markBackedUpNow();
            } catch (forcedExportError) {
                const cancelled = forcedExportError instanceof Error && forcedExportError.message === 'EXPORT_CANCELLED';
                set({ isReplacing: false, error: cancelled ? null : 'EXPORT_ERROR' });
                return false;
            }

            await backupService.importReplace(data);
            set({ isReplacing: false });
            return true;
        } catch (error) {
            const versionMismatch = error instanceof Error && error.message === 'IMPORT_VERSION_MISMATCH';
            set({ isReplacing: false, error: versionMismatch ? 'IMPORT_VERSION_MISMATCH' : 'IMPORT_INVALID_FILE' });
            return false;
        }
    },

    runAutoBackup: async () => {
        try {
            const hasNeverBackedUp = useSettingsStore.getState().settings?.lastBackupAt == null;
            const data = await backupService.buildExport();
            if (hasNeverBackedUp && data.items.length === 0) return;

            await writeAutoBackup(data);
            await markBackedUpNow();
        } catch {
            // Silent by design — the app isn't visible while backgrounded,
            // nothing to show. Next foreground/background cycle retries.
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
            if (deleted) {
                await useSettingsStore.getState().updateSettings({ lastBackupAt: null });
            }
            return deleted;
        } catch {
            set({ error: 'DELETE_BACKUP_ERROR' });
            return false;
        }
    },
}));
