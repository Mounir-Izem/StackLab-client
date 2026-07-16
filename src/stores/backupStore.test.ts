// Phase 10K — régression sur le bug "spinner bloqué" : submitImportPin()
// laissait pendingEncryptedImport/pendingImportMode intacts sur une erreur
// fatale (fichier corrompu / version incompatible), donc PinInputModal
// restait ouverte avec isLoading bloqué à true (le bouton Annuler est masqué
// tant que isLoading). Testable directement : useBackupStore est un store
// Zustand pur (pas de rendu React), il suffit de mocker ses dépendances
// modules (backupFileFormat/backupService/lockService/labStore/settingsStore/
// utils/backup) pour appeler submitImportPin() et lire getState() ensuite —
// aucun rendu de composant nécessaire.
jest.mock('../services/backupFileFormat', () => ({
    decodeBackupFile: jest.fn(),
    detectBackupFormat: jest.fn(),
    encodeBackupFile: jest.fn(),
}));
jest.mock('../services/backupService', () => ({
    backupService: {
        validateImport: jest.fn(),
        importMerge: jest.fn(),
        importReplace: jest.fn(),
        buildExport: jest.fn(),
    },
}));
jest.mock('../services/lockService', () => ({
    lockService: {
        getPin: jest.fn(),
        setPin: jest.fn(),
    },
}));
jest.mock('./labStore', () => ({
    useLabStore: { getState: () => ({ loadLabs: jest.fn() }) },
}));
jest.mock('./settingsStore', () => ({
    useSettingsStore: { getState: () => ({ updateSettings: jest.fn() }) },
}));
jest.mock('../utils/backup', () => ({
    writeAndShareExport: jest.fn(),
    writeAutoBackup: jest.fn(),
    readAutoBackup: jest.fn(),
    deleteAutoBackup: jest.fn(),
    pickImportFile: jest.fn(),
    buildEncryptedBackupFilename: jest.fn(),
}));

import { useBackupStore } from './backupStore';
import { decodeBackupFile } from '../services/backupFileFormat';

const mockDecodeBackupFile = decodeBackupFile as jest.Mock;

function seedPendingImport() {
    useBackupStore.setState({
        pendingEncryptedImport: '{"format":"stacklab.encryptedBackup"}',
        pendingImportMode: 'merge',
        error: null,
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    useBackupStore.setState({
        isExporting: false, isImporting: false, isReplacing: false, isDeletingData: false,
        error: null, pendingEncryptedImport: null, pendingImportMode: null,
    });
});

describe('backupStore.submitImportPin — nettoyage sur erreur fatale', () => {
    test('IMPORT_WRONG_PIN conserve pendingEncryptedImport/pendingImportMode (retry possible)', async () => {
        seedPendingImport();
        mockDecodeBackupFile.mockRejectedValue(new Error('BACKUP_DECRYPTION_FAILED'));

        const success = await useBackupStore.getState().submitImportPin('000000');

        expect(success).toBe(false);
        const state = useBackupStore.getState();
        expect(state.error).toBe('IMPORT_WRONG_PIN');
        expect(state.pendingEncryptedImport).not.toBeNull();
        expect(state.pendingImportMode).toBe('merge');
    });

    test('IMPORT_VERSION_MISMATCH vide pendingEncryptedImport/pendingImportMode (ferme la modale)', async () => {
        seedPendingImport();
        mockDecodeBackupFile.mockRejectedValue(new Error('IMPORT_VERSION_MISMATCH'));

        const success = await useBackupStore.getState().submitImportPin('123456');

        expect(success).toBe(false);
        const state = useBackupStore.getState();
        expect(state.error).toBe('IMPORT_VERSION_MISMATCH');
        expect(state.pendingEncryptedImport).toBeNull();
        expect(state.pendingImportMode).toBeNull();
    });

    test('erreur inconnue (fichier invalide) vide pendingEncryptedImport/pendingImportMode', async () => {
        seedPendingImport();
        mockDecodeBackupFile.mockRejectedValue(new Error('SOME_OTHER_ERROR'));

        const success = await useBackupStore.getState().submitImportPin('123456');

        expect(success).toBe(false);
        const state = useBackupStore.getState();
        expect(state.error).toBe('IMPORT_INVALID_FILE');
        expect(state.pendingEncryptedImport).toBeNull();
        expect(state.pendingImportMode).toBeNull();
    });
});
