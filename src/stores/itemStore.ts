import { create } from 'zustand';
import { itemService } from '../services/itemService';
import type { ItemCreateInput } from '../services/itemService';
import type { Item } from '../types/item.types';
import type { Currency } from '../types/settings.types';

interface ItemStore {
    items: Item[];
    soldItems: Item[];
    currentLabId: string | null;
    isLoading: boolean;
    error: string | null;

    loadItems: (labId: string) => Promise<void>;
    loadSoldItems: () => Promise<void>;
    createItem: (data: ItemCreateInput) => Promise<void>;
    updateItem: (id: string, data: Partial<Omit<Item, 'id' | 'familyKey' | 'createdAt' | 'updatedAt' | 'purchasePrice'>>) => Promise<void>;
    updatePurchasePrice: (id: string, purchasePrice: number | null, purchasePriceIsPerUnit: boolean) => Promise<void>;
    updateObservedPrice: (id: string, observedPrice: number | null, observedPriceIsPerUnit: boolean, observedCurrency: Currency | null, observedPriceDate: string | null) => Promise<void>;
    sellItem: (id: string, qty: number, soldPrice: number | null, perUnit: boolean, soldCurrency: Currency, soldDate: string) => Promise<void>;
    moveItem: (id: string, qty: number, targetLabId: string, targetDeckId: string | null) => Promise<void>;
    extractItem: (id: string, qty: number) => Promise<void>;
    duplicateItem: (id: string) => Promise<void>;
    deleteItem: (id: string, qty?: number) => Promise<void>;
    restoreFromTrash: (id: string, targetLabId: string, targetDeckId: string | null) => Promise<void>;
    acquireItem: (id: string, qty: number, targetLabId: string, targetDeckId: string | null, purchasePrice?: number | null, purchaseCurrency?: Currency | null, purchasePriceIsPerUnit?: boolean) => Promise<void>;
    sellManyItems: (sells: Array<{ id: string; qty: number; soldPrice: number | null; perUnit: boolean; soldCurrency: Currency; soldDate: string }>) => Promise<void>;

}

export const useItemStore = create<ItemStore>((set, get) => ({
    items: [],
    soldItems: [],
    currentLabId: null,
    isLoading: false,
    error: null,

    loadItems: async (labId) => {
        set({ isLoading: true, error: null, currentLabId: labId });
        try {
            const items = await itemService.getByLabId(labId);
            set({ items, isLoading: false });
        } catch {
            set({ isLoading: false, error: 'LOAD_ERROR' });
        }
    },

    loadSoldItems: async () => {
        set({ isLoading: true, error: null });
        try {
            const soldItems = await itemService.getSoldItems();
            set({ soldItems, isLoading: false });
        } catch {
            set({ isLoading: false, error: 'LOAD_ERROR' });
        }
    },

    createItem: async (data) => {
        set({ error: null });
        try {
            const item = await itemService.create(data);
            set(state => ({ items: [...state.items, item] }));
        } catch {
            set({ error: 'CREATE_ERROR' });
        }
    },

    updateItem: async (id, data) => {
        set({ error: null });
        try {
            const updated = await itemService.update(id, data);
            set(state => ({
                items: state.items.map(i => i.id === id ? updated : i),
            }));
        } catch {
            set({ error: 'UPDATE_ERROR' });
        }
    },

    updatePurchasePrice: async (id, purchasePrice, purchasePriceIsPerUnit) => {
        set({ error: null });
        try {
            const updated = await itemService.updatePurchasePrice(id, purchasePrice, purchasePriceIsPerUnit);
            set(state => ({
                items: state.items.map(i => i.id === id ? updated : i),
            }));
        } catch {
            set({ error: 'UPDATE_ERROR' });
        }
    },

    updateObservedPrice: async (id, observedPrice, observedPriceIsPerUnit, observedCurrency, observedPriceDate) => {
        set({ error: null });
        try {
            const updated = await itemService.updateObservedPrice(id, observedPrice, observedPriceIsPerUnit, observedCurrency, observedPriceDate);
            set(state => ({
                items: state.items.map(i => i.id === id ? updated : i),
            }));
        } catch {
            set({ error: 'UPDATE_ERROR' });
        }
    },

    sellItem: async (id, qty, soldPrice, perUnit, soldCurrency, soldDate) => {
        set({ error: null });
        try {
            await itemService.sell(id, qty, soldPrice, perUnit, soldCurrency, soldDate);
            const { currentLabId } = get();
            if (currentLabId) {
                set({ items: await itemService.getByLabId(currentLabId) });
            }
        } catch {
            set({ error: 'SELL_ERROR' });
        }
    },

    moveItem: async (id, qty, targetLabId, targetDeckId) => {
        set({ error: null });
        try {
            await itemService.move(id, qty, targetLabId, targetDeckId);
            const { currentLabId } = get();
            if (currentLabId) {
                set({ items: await itemService.getByLabId(currentLabId) });
            }
        } catch {
            set({ error: 'MOVE_ERROR' });
        }
    },

    extractItem: async (id, qty) => {
        set({ error: null });
        try {
            await itemService.extract(id, qty);
            const { currentLabId } = get();
            if (currentLabId) {
                set({ items: await itemService.getByLabId(currentLabId) });
            }
        } catch {
            set({ error: 'EXTRACT_ERROR' });
        }
    },

    duplicateItem: async (id) => {
        set({ error: null });
        try {
            await itemService.duplicate(id);
            const { currentLabId } = get();
            if (currentLabId) {
                set({ items: await itemService.getByLabId(currentLabId) });
            }
        } catch {
            set({ error: 'DUPLICATE_ERROR' });
        }
    },

    deleteItem: async (id, qty) => {
        set({ error: null });
        try {
            await itemService.delete(id, qty);
            const { currentLabId } = get();
            if (currentLabId) {
                set({ items: await itemService.getByLabId(currentLabId) });
            }
        } catch {
            set({ error: 'DELETE_ERROR' });
        }
    },

    restoreFromTrash: async (id, targetLabId, targetDeckId) => {
        set({ error: null });
        try {
            await itemService.restoreFromTrash(id, targetLabId, targetDeckId);
            const { currentLabId } = get();
            if (currentLabId) {
                set({ items: await itemService.getByLabId(currentLabId) });
            }
        } catch {
            set({ error: 'RESTORE_ERROR' });
        }
    },

    acquireItem: async (id, qty, targetLabId, targetDeckId, purchasePrice, purchaseCurrency, purchasePriceIsPerUnit) => {
        set({ error: null });
        try {
            await itemService.acquire(id, qty, targetLabId, targetDeckId, purchasePrice, purchaseCurrency, purchasePriceIsPerUnit);
            const { currentLabId } = get();
            if (currentLabId) {
                set({ items: await itemService.getByLabId(currentLabId) });
            }
        } catch {
            set({ error: 'ACQUIRE_ERROR' });
        }
    },

    sellManyItems: async (sells) => {
        set({ error: null });
        try {
            await itemService.sellMany(sells);
            const { currentLabId } = get();
            if (currentLabId) {
                set({ items: await itemService.getByLabId(currentLabId) });
            }
        } catch {
            set({ error: 'SELL_MANY_ERROR' });
        }
    },
}));
