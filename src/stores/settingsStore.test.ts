// Phase 10O — settingsStore.error (UPDATE_ERROR/LOAD_ERROR) est capturé par
// le store mais n'était jamais lu par SettingsModal avant ce lot (bannière
// d'erreur câblée uniquement sur backupStore.error). Ces tests couvrent le
// store pur (pas de rendu React) : ils garantissent que le contrat que
// SettingsModal consomme maintenant (error se pose sur échec, se réinitialise
// au prochain essai, settings ne change pas sur échec) reste correct.
jest.mock('../services/settingsService', () => ({
    settingsService: {
        get: jest.fn(),
        update: jest.fn(),
    },
}));

import { useSettingsStore } from './settingsStore';
import { settingsService } from '../services/settingsService';
import type { Settings } from '../types/settings.types';

const mockGet = settingsService.get as jest.Mock;
const mockUpdate = settingsService.update as jest.Mock;

const baseSettings: Settings = {
    currency: 'USD',
    weightUnit: 'oz',
    cloudSync: false,
    autoBackupEnabled: false,
    backupReminder: true,
    backupBannerDismissed: false,
    lastBackupAt: null,
    appLockEnabled: false,
    appLockAutoWipeEnabled: false,
    appLockPromptShown: false,
    screenProtectionEnabled: false,
    hideValues: false,
    subscriptionStatus: 'free',
    subscriptionExpiry: null,
    onboardingCompleted: true,
    onboardingStep: 0,
    language: 'system',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({ settings: null, isLoading: false, error: null, showSettings: false });
});

describe('settingsStore.updateSettings — gestion d\'erreur', () => {
    test('échec de mise à jour pose error=UPDATE_ERROR et conserve les settings précédents', async () => {
        useSettingsStore.setState({ settings: baseSettings });
        mockUpdate.mockRejectedValue(new Error('DB_WRITE_FAILED'));

        await useSettingsStore.getState().updateSettings({ currency: 'EUR' });

        const state = useSettingsStore.getState();
        expect(state.error).toBe('UPDATE_ERROR');
        expect(state.settings).toEqual(baseSettings);
    });

    test('un nouvel essai réussi efface l\'erreur précédente', async () => {
        useSettingsStore.setState({ settings: baseSettings, error: 'UPDATE_ERROR' });
        const updated = { ...baseSettings, currency: 'EUR' as const };
        mockUpdate.mockResolvedValue(updated);

        await useSettingsStore.getState().updateSettings({ currency: 'EUR' });

        const state = useSettingsStore.getState();
        expect(state.error).toBeNull();
        expect(state.settings).toEqual(updated);
    });
});

describe('settingsStore.loadSettings — gestion d\'erreur', () => {
    test('échec de chargement pose error=LOAD_ERROR', async () => {
        mockGet.mockRejectedValue(new Error('SETTINGS_NOT_FOUND'));

        await useSettingsStore.getState().loadSettings();

        const state = useSettingsStore.getState();
        expect(state.error).toBe('LOAD_ERROR');
        expect(state.settings).toBeNull();
        expect(state.isLoading).toBe(false);
    });

    test('chargement réussi efface l\'erreur précédente', async () => {
        useSettingsStore.setState({ error: 'LOAD_ERROR' });
        mockGet.mockResolvedValue(baseSettings);

        await useSettingsStore.getState().loadSettings();

        const state = useSettingsStore.getState();
        expect(state.error).toBeNull();
        expect(state.settings).toEqual(baseSettings);
    });
});
