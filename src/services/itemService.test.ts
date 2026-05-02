import { itemService } from './itemService';
import { itemRepository } from '../repositories/itemRepository';
import type { Item } from '../types/item.types';

jest.mock('../repositories/itemRepository');
jest.mock('../db/database', () => ({
    withTransaction: jest.fn((fn: () => Promise<unknown>) => fn()),
}));
jest.mock('expo-file-system', () => ({
    File: jest.fn().mockImplementation(() => ({
        exists: true,
        delete: jest.fn(),
    })),
}));

const mockRepo = itemRepository as jest.Mocked<typeof itemRepository>;

const makeItem = (overrides: Partial<Item> = {}): Item => ({
    id: 'item-uuid-1',
    labId: 'lab-uuid-1',
    deckId: null,
    status: 'active' as const,
    name: 'Maple Leaf',
    familyKey: 'maple-leaf-silver',
    metal: 'silver' as const,
    mintName: null,
    shape: 'coin' as const,
    shapeDescription: null,
    weightOz: 1.0,
    weightUnitInput: 'oz' as const,
    purity: 0.9999,
    year: 2022,
    strikeFinish: 'BU' as const,
    condition: null,
    features: [],
    packaging: [],
    gradingCompany: null,
    gradeValue: null,
    notes: null,
    quantity: 7,
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

describe('itemService.sell — guards', () => {
    test('ITEM_NOT_FOUND si item inexistant', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(itemService.sell('bad-id', 1, null, false, 'USD', '2026-04-24')).rejects.toThrow('ITEM_NOT_FOUND');
    });

    test('ITEM_NOT_SELLABLE si status !== active', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'sold' }));
        await expect(itemService.sell('item-uuid-1', 1, null, false, 'USD', '2026-04-24')).rejects.toThrow('ITEM_NOT_SELLABLE');
    });

    test('INVALID_QTY si qty < 1', async () => {
        mockRepo.findById.mockResolvedValue(makeItem());
        await expect(itemService.sell('item-uuid-1', 0, null, false, 'USD', '2026-04-24')).rejects.toThrow('INVALID_QTY');
    });

    test('QTY_EXCEEDS_STOCK si qty > quantity', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 3 }));
        await expect(itemService.sell('item-uuid-1', 5, null, false, 'USD', '2026-04-24')).rejects.toThrow('QTY_EXCEEDS_STOCK');
    });
});

describe('itemService.sell — vente totale', () => {
    test('qty = quantity → update seul, pas de create', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 3 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 3, status: 'sold' }));

        await itemService.sell('item-uuid-1', 3, null, false, 'USD', '2026-04-24');

        expect(mockRepo.update).toHaveBeenCalledTimes(1);
        expect(mockRepo.create).not.toHaveBeenCalled();
    });
});

describe('itemService.sell — vente partielle', () => {
    test('qty < quantity → update + create', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 7 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 2, status: 'sold' }));

        await itemService.sell('item-uuid-1', 2, null, false, 'USD', '2026-04-24');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 5 });
        expect(mockRepo.create).toHaveBeenCalledTimes(1);
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.quantity).toBe(2);
        expect(created.status).toBe('sold');
    });
});

describe('itemService.sell — calcul prix', () => {
    test('perUnit = true → soldPrice = prix × qty', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 7 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem());

        await itemService.sell('item-uuid-1', 2, 75.0, true, 'USD', '2026-04-24');

        const created = mockRepo.create.mock.calls[0][0];
        expect(created.soldPrice).toBeCloseTo(150.0, 2);
    });

    test('perUnit = false → soldPrice = prix brut (lot)', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 7 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem());

        await itemService.sell('item-uuid-1', 2, 150.0, false, 'USD', '2026-04-24');

        const created = mockRepo.create.mock.calls[0][0];
        expect(created.soldPrice).toBeCloseTo(150.0, 2);
    });

    test('soldPrice null → soldPrice null dans le sold item', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 7 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem());

        await itemService.sell('item-uuid-1', 2, null, false, 'USD', '2026-04-24');

        const created = mockRepo.create.mock.calls[0][0];
        expect(created.soldPrice).toBeNull();
    });
});

describe('itemService.move — guards', () => {
    test('ITEM_NOT_FOUND si item inexistant', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(itemService.move('bad-id', 1, 'lab-2', null)).rejects.toThrow('ITEM_NOT_FOUND');
    });

    test('INVALID_QTY si qty < 1', async () => {
        mockRepo.findById.mockResolvedValue(makeItem());
        await expect(itemService.move('item-uuid-1', 0, 'lab-2', null)).rejects.toThrow('INVALID_QTY');
    });

    test('QTY_EXCEEDS_STOCK si qty > quantity', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 3 }));
        await expect(itemService.move('item-uuid-1', 5, 'lab-2', null)).rejects.toThrow('QTY_EXCEEDS_STOCK');
    });
});

describe('itemService.move — déplacement', () => {
    test('déplacement total → update seul', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 3 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 3, labId: 'lab-2' }));

        await itemService.move('item-uuid-1', 3, 'lab-2', null);

        expect(mockRepo.update).toHaveBeenCalledTimes(1);
        expect(mockRepo.create).not.toHaveBeenCalled();
    });

    test('déplacement partiel → update + create à destination', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 7 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 4 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 3, labId: 'lab-2' }));

        await itemService.move('item-uuid-1', 3, 'lab-2', 'deck-2');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 4 });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.quantity).toBe(3);
        expect(created.labId).toBe('lab-2');
        expect(created.deckId).toBe('deck-2');
    });
});

describe('itemService.extract — guards', () => {
    test('ITEM_NOT_FOUND si item inexistant', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(itemService.extract('bad-id', 1)).rejects.toThrow('ITEM_NOT_FOUND');
    });

    test('INVALID_QTY si qty < 1', async () => {
        mockRepo.findById.mockResolvedValue(makeItem());
        await expect(itemService.extract('item-uuid-1', 0)).rejects.toThrow('INVALID_QTY');
    });

    test('EXTRACT_REQUIRES_PARTIAL_QTY si qty >= quantity', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 3 }));
        await expect(itemService.extract('item-uuid-1', 3)).rejects.toThrow('EXTRACT_REQUIRES_PARTIAL_QTY');
    });

    test('extraction valide → update + create au même emplacement', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 7, deckId: 'deck-1' }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 6 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 1 }));

        await itemService.extract('item-uuid-1', 1);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 6 });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.quantity).toBe(1);
        expect(created.labId).toBe('lab-uuid-1');
        expect(created.deckId).toBe('deck-1');
        expect(created.id).not.toBe('item-uuid-1');
    });
});

describe('itemService.delete — guards', () => {
    test('ITEM_NOT_FOUND si item inexistant', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(itemService.delete('bad-id')).rejects.toThrow('ITEM_NOT_FOUND');
    });

    test('CANNOT_DELETE_SOLD_ITEM si status = sold', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'sold' }));
        await expect(itemService.delete('item-uuid-1')).rejects.toThrow('CANNOT_DELETE_SOLD_ITEM');
    });

    test('suppression totale sans qty → delete appelé', async () => {
        mockRepo.findById.mockResolvedValue(makeItem());
        mockRepo.delete.mockResolvedValue(undefined);

        await itemService.delete('item-uuid-1');

        expect(mockRepo.delete).toHaveBeenCalledWith('item-uuid-1');
        expect(mockRepo.update).not.toHaveBeenCalled();
    });

    test('suppression partielle avec qty → update quantity', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 7 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));

        await itemService.delete('item-uuid-1', 2);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 5 });
        expect(mockRepo.delete).not.toHaveBeenCalled();
    });
});
