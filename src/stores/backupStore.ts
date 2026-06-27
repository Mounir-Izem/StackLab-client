import { create } from 'zustand';
import { backupService } from '../services/backupService';
import { writeAndShareExport, pickImportFile } from '../utils/backup';

interface BackupStore {
    isExporting: boolean;
    isImporting: boolean;
    isReplacing: boolean;
    error: string | null;

    exportData: () => Promise<void>;
    importData: () => Promise<void>;
    replaceData: () => Promise<boolean>;
}

export const useBackupStore = create<BackupStore>((set) => ({
    isExporting: false,
    isImporting: false,
    isReplacing: false,
    error: null,

    exportData: async () => {
        set({ isExporting: true, error: null });
        try {
            const data = await backupService.buildExport();
            await writeAndShareExport(data);
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
}));
