import { create } from 'zustand';
import { fetchSpotPrices } from '../services/spotService';
import type { SpotPrices } from '../services/spotService';
import type { Currency } from '../types/settings.types';

const TTL_MS = 5 * 60 * 1000;

interface SpotStore {
    spot: SpotPrices | null;
    isLoading: boolean;
    error: 'UNAVAILABLE' | 'TIMEOUT' | null;
    lastFetchAt: number | null;

    fetchPrices: (currency: Currency) => Promise<void>;
}

export const useSpotStore = create<SpotStore>((set, get) => ({
    spot: null,
    isLoading: false,
    error: null,
    lastFetchAt: null,

    fetchPrices: async (currency) => {
        const { lastFetchAt, isLoading } = get();
        if (isLoading) return;
        if (lastFetchAt && Date.now() - lastFetchAt < TTL_MS) return;

        set({ isLoading: true, error: null });
        const result = await fetchSpotPrices(currency);

        if (result.ok) {
            set({ spot: result.data, isLoading: false, lastFetchAt: Date.now(), error: null });
        } else {
            set({
                spot: result.lastKnown ?? get().spot,
                isLoading: false,
                error: result.error,
                lastFetchAt: Date.now(),
            });
        }
    },
}));
