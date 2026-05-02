import { create } from 'zustand';
import { deckService } from '../services/deckService';
import type { Deck } from '../types/deck.types';

interface DeckStore {
    decks: Deck[];
    currentLabId: string | null;
    isLoading: boolean;
    error: string | null;

    loadDecks: (labId: string) => Promise<void>;
    createDeck: (name: string, labId: string, parentId?: string) => Promise<void>;
    renameDeck: (id: string, name: string) => Promise<void>;
    moveDeck: (id: string, newParentId: string | null, newLabId: string) => Promise<void>;
    deleteDeck: (id: string) => Promise<void>;
}

export const useDeckStore = create<DeckStore>((set, get) => ({
    decks: [],
    currentLabId: null,
    isLoading: false,
    error: null,

    loadDecks: async (labId) => {
        set({ isLoading: true, error: null, currentLabId: labId });
        try {
            const decks = await deckService.getByLabId(labId);
            set({ decks, isLoading: false });
        } catch {
            set({ isLoading: false, error: 'LOAD_ERROR' });
        }
    },

    createDeck: async (name, labId, parentId) => {
        set({ error: null });
        try {
            const deck = await deckService.create(name, labId, parentId);
            set(state => ({ decks: [...state.decks, deck] }));
        } catch {
            set({ error: 'CREATE_ERROR' });
        }
    },

    renameDeck: async (id, name) => {
        set({ error: null });
        try {
            const updated = await deckService.rename(id, name);
            set(state => ({
                decks: state.decks.map(d => d.id === id ? updated : d),
            }));
        } catch {
            set({ error: 'RENAME_ERROR' });
        }
    },

    moveDeck: async (id, newParentId, newLabId) => {
        set({ error: null });
        try {
            await deckService.move(id, newParentId, newLabId);
            const { currentLabId } = get();
            if (currentLabId) {
                const decks = await deckService.getByLabId(currentLabId);
                set({ decks });
            }
        } catch {
            set({ error: 'MOVE_ERROR' });
        }
    },

    deleteDeck: async (id) => {
        set({ error: null });
        try {
            await deckService.delete(id);
            const { currentLabId } = get();
            if (currentLabId) {
                const decks = await deckService.getByLabId(currentLabId);
                set({ decks });
            }
        } catch {
            set({ error: 'DELETE_ERROR' });
        }
    },
}));
