import { create } from 'zustand';
import { settingsService } from '../services/settingsService';
import { BETA_CENTER_CONTENT_VERSION } from '../data/betaCenterContent';
import type { Settings } from '../types/settings.types';

interface SettingsStore {
    settings: Settings | null;
    isLoading: boolean;
    error: string | null;
    showSettings: boolean;
    showBetaCenter: boolean;

    loadSettings: () => Promise<void>;
    updateSettings: (data: Partial<Omit<Settings, 'updatedAt'>>) => Promise<void>;
    openSettings: () => void;
    closeSettings: () => void;
    openBetaCenter: () => void;
    closeBetaCenter: () => void;
    markBetaCenterSeen: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
    settings: null,
    isLoading: false,
    error: null,
    showSettings: false,
    showBetaCenter: false,

    openSettings: () => set({ showSettings: true }),
    closeSettings: () => set({ showSettings: false }),
    openBetaCenter: () => set({ showBetaCenter: true }),
    closeBetaCenter: () => set({ showBetaCenter: false }),

    loadSettings: async () => {
        set({ isLoading: true, error: null });
        try {
            const settings = await settingsService.get();
            set({ settings, isLoading: false });
        } catch {
            set({ isLoading: false, error: 'LOAD_ERROR' });
        }
    },

    updateSettings: async (data) => {
        set({ error: null });
        try {
            const settings = await settingsService.update(data);
            set({ settings });
        } catch {
            set({ error: 'UPDATE_ERROR' });
        }
    },

    markBetaCenterSeen: async () => {
        if (get().settings?.betaCenterLastSeenVersion === BETA_CENTER_CONTENT_VERSION) return;
        await get().updateSettings({ betaCenterLastSeenVersion: BETA_CENTER_CONTENT_VERSION });
    },
}));
