import { create } from 'zustand';
import { labService } from '../services/labService';
import type { Lab, LabType } from '../types/lab.types';

interface LabStore {
    labs: Lab[];
    labItemCounts: Record<string, number>;
    labOzTotals: Record<string, { gold: number; silver: number }>;
    labInvestedTotals: Record<string, Record<string, number>>;
    isLoading: boolean;
    error: string | null;

    loadLabs: () => Promise<void>;
    renameLab: (id: string, name: string) => Promise<void>;
    createLab: (name: string, type: LabType) => Promise<void>;
    reorderLabs: (orderedIds: string[]) => Promise<void>;
}

export const useLabStore = create<LabStore>((set) => ({
    labs: [],
    labItemCounts: {},
    labOzTotals: {},
    labInvestedTotals: {},
    isLoading: false,
    error: null,

    loadLabs: async () => {
        set({ isLoading: true, error: null });
        try {
            const [labs, labItemCounts, labOzTotals, labInvestedTotals] = await Promise.all([
                labService.getAll(),
                labService.getItemCountsByLab(),
                labService.getOzTotalsByLab(),
                labService.getInvestedTotalsByLab(),
            ]);
            set({ labs, labItemCounts, labOzTotals, labInvestedTotals, isLoading: false });
        } catch {
            set({ isLoading: false, error: 'LOAD_ERROR' });
        }
    },

    renameLab: async (id, name) => {
        set({ error: null });
        try {
            const updated = await labService.rename(id, name);
            set(state => ({
                labs: state.labs.map(l => l.id === id ? updated : l),
            }));
        } catch {
            set({ error: 'RENAME_ERROR' });
        }
    },

    createLab: async (name, type) => {
        set({ error: null });
        try {
            const lab = await labService.create(name, type);
            set(state => ({
                labs: [...state.labs, lab],
                labItemCounts: { ...state.labItemCounts, [lab.id]: 0 },
                labOzTotals: { ...state.labOzTotals, [lab.id]: { gold: 0, silver: 0 } },
                labInvestedTotals: { ...state.labInvestedTotals, [lab.id]: {} },
            }));
        } catch {
            set({ error: 'CREATE_ERROR' });
        }
    },

    reorderLabs: async (orderedIds) => {
        set({ error: null });
        try {
            await labService.reorder(orderedIds);
            set(state => ({
                labs: orderedIds
                    .map(id => state.labs.find(l => l.id === id))
                    .filter((l): l is Lab => l !== undefined),
            }));
        } catch {
            set({ error: 'REORDER_ERROR' });
        }
    },
}));
