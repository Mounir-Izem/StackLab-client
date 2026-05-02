import { deckService } from './deckService';
import { deckRepository } from '../repositories/deckRepository';
import { itemRepository } from '../repositories/itemRepository';
import type { Deck } from '../types/deck.types';
import type { Item } from '../types/item.types';

jest.mock('../repositories/deckRepository');
jest.mock('../repositories/itemRepository');
jest.mock('../db/database', () => ({
    withTransaction: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

const mockDeckRepo = deckRepository as jest.Mocked<typeof deckRepository>;
const mockItemRepo = itemRepository as jest.Mocked<typeof itemRepository>;

const makeDeck = (overrides: Partial<Deck> = {}): Deck => ({
    id: 'deck-uuid-1',
    labId: 'lab-uuid-1',
    parentId: null,
    name: 'Mon Deck',
    coverPhotoUrl: null,
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

const makeItem = (overrides: Partial<Item> = {}): Item => ({
    id: 'item-uuid-1',
    labId: 'lab-uuid-1',
    deckId: 'deck-uuid-1',
    status: 'active',
    name: 'Maple Leaf',
    familyKey: 'maple-leaf-silver',
    metal: 'silver',
    mintName: null,
    shape: 'coin',
    shapeDescription: null,
    weightOz: 1.0,
    weightUnitInput: 'oz',
    purity: 0.9999,
    year: null,
    strikeFinish: null,
    condition: null,
    features: [],
    packaging: [],
    gradingCompany: null,
    gradeValue: null,
    notes: null,
    quantity: 1,
    purchasePrice: null,
    purchaseCurrency: null,
    purchaseExchangeRate: null,
    purchaseDate: null,
    observedPrice: null,
    observedCurrency: null,
    observedPriceDate: null,
    soldDate: null,
    soldPrice: null,
    soldCurrency: null,
    photoUrl: null,
    location: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('deckService.create', () => {
    test('sans parentId → position = nb de decks racines du lab', async () => {
        mockDeckRepo.findByLabId.mockResolvedValue([
            makeDeck({ id: 'd-1', parentId: null }),
            makeDeck({ id: 'd-2', parentId: null }),
            makeDeck({ id: 'd-3', parentId: 'd-1' }),
        ]);
        mockDeckRepo.create.mockResolvedValue(makeDeck());

        await deckService.create('Nouveau Deck', 'lab-uuid-1');

        const call = mockDeckRepo.create.mock.calls[0][0];
        expect(call.position).toBe(2);
        expect(call.parentId).toBeNull();
    });

    test('avec parentId → position = nb de siblings', async () => {
        mockDeckRepo.findByParentId.mockResolvedValue([
            makeDeck({ id: 'd-1', parentId: 'parent-1' }),
        ]);
        mockDeckRepo.create.mockResolvedValue(makeDeck());

        await deckService.create('Sous-Deck', 'lab-uuid-1', 'parent-1');

        const call = mockDeckRepo.create.mock.calls[0][0];
        expect(call.position).toBe(1);
        expect(call.parentId).toBe('parent-1');
    });

    test('coverPhotoUrl null à la création', async () => {
        mockDeckRepo.findByLabId.mockResolvedValue([]);
        mockDeckRepo.create.mockResolvedValue(makeDeck());

        await deckService.create('Mon Deck', 'lab-uuid-1');

        const call = mockDeckRepo.create.mock.calls[0][0];
        expect(call.coverPhotoUrl).toBeNull();
    });
});

describe('deckService.rename', () => {
    test('délègue à deckRepository.update avec { name }', async () => {
        mockDeckRepo.update.mockResolvedValue(makeDeck({ name: 'Nouveau Nom' }));

        await deckService.rename('deck-uuid-1', 'Nouveau Nom');

        expect(mockDeckRepo.update).toHaveBeenCalledWith('deck-uuid-1', { name: 'Nouveau Nom' });
    });
});

describe('deckService.move — guards', () => {
    test('DECK_NOT_FOUND si deck inexistant', async () => {
        mockDeckRepo.findById.mockResolvedValue(null);

        await expect(deckService.move('bad-id', null, 'lab-uuid-1')).rejects.toThrow('DECK_NOT_FOUND');
    });
});

describe('deckService.move — même lab', () => {
    test('aucune migration items ni descendants', async () => {
        mockDeckRepo.findById.mockResolvedValue(makeDeck({ labId: 'lab-uuid-1' }));
        mockDeckRepo.update.mockResolvedValue(makeDeck());

        await deckService.move('deck-uuid-1', null, 'lab-uuid-1');

        expect(mockItemRepo.findByDeckIdRecursive).not.toHaveBeenCalled();
        expect(mockItemRepo.update).not.toHaveBeenCalled();
    });

    test('met à jour parentId et labId du deck', async () => {
        mockDeckRepo.findById.mockResolvedValue(makeDeck({ labId: 'lab-uuid-1' }));
        mockDeckRepo.update.mockResolvedValue(makeDeck());

        await deckService.move('deck-uuid-1', 'new-parent', 'lab-uuid-1');

        expect(mockDeckRepo.update).toHaveBeenCalledWith('deck-uuid-1', { parentId: 'new-parent', labId: 'lab-uuid-1' });
    });
});

describe('deckService.move — lab différent', () => {
    test('migre les items et descendants vers le nouveau lab', async () => {
        mockDeckRepo.findById.mockResolvedValue(makeDeck({ labId: 'lab-uuid-1' }));
        mockItemRepo.findByDeckIdRecursive.mockResolvedValue([
            makeItem({ id: 'item-1' }),
            makeItem({ id: 'item-2' }),
        ]);
        mockDeckRepo.findByLabId.mockResolvedValue([
            makeDeck({ id: 'deck-uuid-1', parentId: null }),
            makeDeck({ id: 'child-deck', parentId: 'deck-uuid-1' }),
        ]);
        mockItemRepo.update.mockResolvedValue(makeItem());
        mockDeckRepo.update.mockResolvedValue(makeDeck());

        await deckService.move('deck-uuid-1', null, 'lab-uuid-2');

        expect(mockItemRepo.update).toHaveBeenCalledWith('item-1', { labId: 'lab-uuid-2' });
        expect(mockItemRepo.update).toHaveBeenCalledWith('item-2', { labId: 'lab-uuid-2' });
        expect(mockDeckRepo.update).toHaveBeenCalledWith('child-deck', { labId: 'lab-uuid-2' });
        expect(mockDeckRepo.update).toHaveBeenCalledWith('deck-uuid-1', { parentId: null, labId: 'lab-uuid-2' });
    });
});

describe('deckService.delete — guards', () => {
    test('DECK_NOT_FOUND si deck inexistant', async () => {
        mockDeckRepo.findById.mockResolvedValue(null);

        await expect(deckService.delete('bad-id')).rejects.toThrow('DECK_NOT_FOUND');
    });
});

describe('deckService.delete — suppression', () => {
    test('items remontés au parentId du deck', async () => {
        mockDeckRepo.findById.mockResolvedValue(makeDeck({ parentId: 'parent-deck' }));
        mockItemRepo.findByDeckId.mockResolvedValue([makeItem({ id: 'item-1' }), makeItem({ id: 'item-2' })]);
        mockDeckRepo.findByParentId.mockResolvedValue([]);
        mockItemRepo.update.mockResolvedValue(makeItem());
        mockDeckRepo.delete.mockResolvedValue(undefined);

        await deckService.delete('deck-uuid-1');

        expect(mockItemRepo.update).toHaveBeenCalledWith('item-1', { deckId: 'parent-deck' });
        expect(mockItemRepo.update).toHaveBeenCalledWith('item-2', { deckId: 'parent-deck' });
    });

    test('sous-decks remontés au parentId du deck', async () => {
        mockDeckRepo.findById.mockResolvedValue(makeDeck({ parentId: 'parent-deck' }));
        mockItemRepo.findByDeckId.mockResolvedValue([]);
        mockDeckRepo.findByParentId.mockResolvedValue([makeDeck({ id: 'sub-1' }), makeDeck({ id: 'sub-2' })]);
        mockDeckRepo.update.mockResolvedValue(makeDeck());
        mockDeckRepo.delete.mockResolvedValue(undefined);

        await deckService.delete('deck-uuid-1');

        expect(mockDeckRepo.update).toHaveBeenCalledWith('sub-1', { parentId: 'parent-deck' });
        expect(mockDeckRepo.update).toHaveBeenCalledWith('sub-2', { parentId: 'parent-deck' });
    });

    test('deck supprimé après migration', async () => {
        mockDeckRepo.findById.mockResolvedValue(makeDeck());
        mockItemRepo.findByDeckId.mockResolvedValue([]);
        mockDeckRepo.findByParentId.mockResolvedValue([]);
        mockDeckRepo.delete.mockResolvedValue(undefined);

        await deckService.delete('deck-uuid-1');

        expect(mockDeckRepo.delete).toHaveBeenCalledWith('deck-uuid-1');
    });
});
