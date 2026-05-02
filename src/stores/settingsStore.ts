import { create } from 'zustand';
import { settingsService } from '../services/settingsService';
import type { Settings } from '../types/settings.types';

interface SettingsStore {
    settings: Settings | null;
    isLoading: boolean;
    error: string | null;
    showSettings: boolean;

    loadSettings: () => Promise<void>;
    updateSettings: (data: Partial<Omit<Settings, 'updatedAt'>>) => Promise<void>;
    openSettings: () => void;
    closeSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
    settings: null,
    isLoading: false,
    error: null,
    showSettings: false,

    openSettings: () => set({ showSettings: true }),
    closeSettings: () => set({ showSettings: false }),

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
}));
