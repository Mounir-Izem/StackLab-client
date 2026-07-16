import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { fetchSpotPrices } from '../services/spotService';
import type { SpotPrices } from '../services/spotService';

const TTL_MS = 5 * 60 * 1000;

interface SpotStore {
    spot: SpotPrices | null;
    rates: Record<string, number>;
    isLoading: boolean;
    error: 'UNAVAILABLE' | 'TIMEOUT' | null;
    lastFetchAt: number | null;

    fetchPrices: () => Promise<void>;
    refresh: () => Promise<void>;
}

async function doFetch(
    set: (partial: Partial<SpotStore>) => void,
    get: () => SpotStore,
): Promise<void> {
    const netState = await NetInfo.fetch();
    // Phase 10K — offline sans cache (ex. premier lancement) laissait spot/error/
    // isLoading tous à leur valeur initiale : SpotHome n'affichait ni spinner, ni
    // message, ni prix — un vide sous les sélecteurs devise/unité. error réutilise
    // le code existant 'UNAVAILABLE' (seul SpotHome le consomme, cf. audit) pour
    // déclencher son état "indisponible" déjà construit, sans nouvelle UI.
    if (!netState.isConnected) {
        set({ isLoading: false, error: 'UNAVAILABLE' });
        return;
    }

    set({ isLoading: true, error: null });
    const result = await fetchSpotPrices();

    if (result.ok) {
        set({
            spot: result.data,
            rates: result.data.rates,
            isLoading: false,
            lastFetchAt: Date.now(),
            error: null,
        });
    } else {
        set({
            spot: result.lastKnown ?? get().spot,
            isLoading: false,
            error: result.error,
            lastFetchAt: Date.now(),
        });
    }
}

export const useSpotStore = create<SpotStore>((set, get) => ({
    spot: null,
    rates: {},
    isLoading: false,
    error: null,
    lastFetchAt: null,

    fetchPrices: async () => {
        const { lastFetchAt, isLoading } = get();
        if (isLoading) return;
        if (lastFetchAt && Date.now() - lastFetchAt < TTL_MS) return;
        await doFetch(set, get);
    },

    refresh: async () => {
        if (get().isLoading) return;
        set({ lastFetchAt: null });
        await doFetch(set, get);
    },
}));
