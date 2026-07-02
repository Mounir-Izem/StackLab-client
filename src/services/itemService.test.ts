import { itemService } from './itemService';
import { itemRepository } from '../repositories/itemRepository';
import { labRepository } from '../repositories/labRepository';
import type { Item } from '../types/item.types';
import type { Lab } from '../types/lab.types';

jest.mock('../repositories/itemRepository');
jest.mock('../repositories/labRepository');
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
const mockLabRepo = labRepository as jest.Mocked<typeof labRepository>;

const makeLab = (overrides: Partial<Lab> = {}): Lab => ({
    id: 'lab-uuid-1',
    userId: null,
    name: 'Mon Lab',
    coverPhotoUrl: null,
    type: 'standard',
    isSystem: false,
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

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

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 5, purchasePrice: null });
        expect(mockRepo.create).toHaveBeenCalledTimes(1);
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.quantity).toBe(2);
        expect(created.status).toBe('sold');
    });
});

describe('itemService.sell — prorata du cost basis', () => {
    test('lot 8/104€, vente de 2 → vendu 26€, restant 78€', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: 104 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 6 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 2, status: 'sold' }));

        await itemService.sell('item-uuid-1', 2, 50, false, 'USD', '2026-04-24');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 6, purchasePrice: 78 });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBe(26);
    });

    test('purchasePrice null → reste null des deux côtés', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: null }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 6 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 2, status: 'sold' }));

        await itemService.sell('item-uuid-1', 2, 50, false, 'USD', '2026-04-24');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 6, purchasePrice: null });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBeNull();
    });

    test('purchasePrice = 0 → reste 0, jamais null', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: 0 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 6 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 2, status: 'sold' }));

        await itemService.sell('item-uuid-1', 2, 50, false, 'USD', '2026-04-24');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 6, purchasePrice: 0 });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBe(0);
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

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 4, purchasePrice: null });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.quantity).toBe(3);
        expect(created.labId).toBe('lab-2');
        expect(created.deckId).toBe('deck-2');
    });

    test('move partiel proratise le purchasePrice (lot 8/104€, déplacer 3 → 39€ + 65€)', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: 104 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 3, labId: 'lab-2' }));

        await itemService.move('item-uuid-1', 3, 'lab-2', null);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 5, purchasePrice: 65 });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBe(39);
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

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 6, purchasePrice: null });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.quantity).toBe(1);
        expect(created.labId).toBe('lab-uuid-1');
        expect(created.deckId).toBe('deck-1');
        expect(created.id).not.toBe('item-uuid-1');
    });

    test('extraction proratise le purchasePrice (lot 6/10€, extraire 1 → 1.67€ + 8.33€)', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 6, purchasePrice: 10 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 1 }));

        await itemService.extract('item-uuid-1', 1);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 5, purchasePrice: 8.33 });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBe(1.67);
    });
});

describe('itemService.delete — guards', () => {
    test('ITEM_NOT_FOUND si item inexistant', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(itemService.delete('bad-id')).rejects.toThrow('ITEM_NOT_FOUND');
    });

    test('un item sold peut être soft-deleted vers Trash (pas de guard) — sold history doit pouvoir être nettoyé', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'sold' }));
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockRepo.update.mockResolvedValue(makeItem({ status: 'sold' }));

        await itemService.delete('item-uuid-1');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { labId: 'trash-lab', deckId: null });
    });

    test('suppression totale sans qty, item déjà dans Trash → delete définitif appelé', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ labId: 'trash-lab' }));
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockRepo.delete.mockResolvedValue(undefined);

        await itemService.delete('item-uuid-1');

        expect(mockRepo.delete).toHaveBeenCalledWith('item-uuid-1');
        expect(mockRepo.update).not.toHaveBeenCalled();
    });

    test('suppression partielle avec qty → update quantity', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 7 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));

        await itemService.delete('item-uuid-1', 2);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 5, purchasePrice: null });
        expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    test('suppression partielle proratise le purchasePrice restant (lot 8/104€, retirer 2 → reste 78€)', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: 104 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 6 }));

        await itemService.delete('item-uuid-1', 2);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 6, purchasePrice: 78 });
    });
});

describe('itemService — edge case quantity = 1', () => {
    test('extract refuse toute extraction (EXTRACT_REQUIRES_PARTIAL_QTY), aucun prorata déclenché', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 1, purchasePrice: 50 }));
        await expect(itemService.extract('item-uuid-1', 1)).rejects.toThrow('EXTRACT_REQUIRES_PARTIAL_QTY');
        expect(mockRepo.update).not.toHaveBeenCalled();
        expect(mockRepo.create).not.toHaveBeenCalled();
    });

    test('sell total (qty=1) → pas de prorata, purchasePrice transféré tel quel sur le statut sold', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 1, purchasePrice: 50 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 1, status: 'sold' }));

        await itemService.sell('item-uuid-1', 1, 60, false, 'USD', '2026-04-24');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', {
            status: 'sold', soldDate: '2026-04-24', soldPrice: 60, soldCurrency: 'USD',
        });
        expect(mockRepo.create).not.toHaveBeenCalled();
    });
});

describe('itemService.acquire', () => {
    test('acquisition totale, mode total → purchasePrice transmis tel quel', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'wishlist', quantity: 5, purchasePrice: null }));
        mockRepo.update.mockResolvedValue(makeItem({ status: 'active' }));

        await itemService.acquire('item-uuid-1', 5, 'lab-2', null, 104, 'USD', false);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', {
            status: 'active', labId: 'lab-2', deckId: null,
            observedPrice: null, observedCurrency: null, observedPriceDate: null,
            purchasePrice: 104, purchaseCurrency: 'USD',
        });
    });

    test('acquisition totale, mode per-unit → purchasePrice = prix unitaire × qty', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'wishlist', quantity: 8, purchasePrice: null }));
        mockRepo.update.mockResolvedValue(makeItem({ status: 'active' }));

        await itemService.acquire('item-uuid-1', 8, 'lab-2', null, 13, 'USD', true);

        const call = mockRepo.update.mock.calls[0][1];
        expect(call.purchasePrice).toBe(104);
    });

    test('acquisition partielle → la part acquise reçoit le prix, la part Wishlist restante repasse à null', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'wishlist', quantity: 8, purchasePrice: null }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 3, status: 'active' }));

        await itemService.acquire('item-uuid-1', 3, 'lab-2', null, 39, 'USD', false);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 5, purchasePrice: null, observedPrice: null });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBe(39);
        expect(created.status).toBe('active');
    });

    test('acquisition partielle avec observedPrice → prorata sur la part Wishlist restante', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'wishlist', quantity: 8, purchasePrice: null, observedPrice: 104 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 3, status: 'active' }));

        await itemService.acquire('item-uuid-1', 3, 'lab-2', null, 39, 'USD', false);

        // ×8 observedPrice 104 → acquire ×3 → remaining ×5 observedPrice 65
        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 5, purchasePrice: null, observedPrice: 65 });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.observedPrice).toBeNull();
        expect(created.status).toBe('active');
    });

    test('purchasePrice non fourni → null, jamais 0', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'wishlist', quantity: 5, purchasePrice: null }));
        mockRepo.update.mockResolvedValue(makeItem({ status: 'active' }));

        await itemService.acquire('item-uuid-1', 5, 'lab-2', null);

        const call = mockRepo.update.mock.calls[0][1];
        expect(call.purchasePrice).toBeNull();
    });
});

describe('itemService.updatePurchasePrice', () => {
    test('mode total → écrit la valeur telle quelle', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: 104 }));

        await itemService.updatePurchasePrice('item-uuid-1', 104, false);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { purchasePrice: 104 });
    });

    test('mode per-unit → multiplie par la quantity actuelle du row', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: 104 }));

        await itemService.updatePurchasePrice('item-uuid-1', 13, true);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { purchasePrice: 104 });
    });

    test('null → écrit null, jamais 0', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: null }));

        await itemService.updatePurchasePrice('item-uuid-1', null, false);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { purchasePrice: null });
    });

    test('ITEM_NOT_FOUND si item inexistant', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(itemService.updatePurchasePrice('bad-id', 100, false)).rejects.toThrow('ITEM_NOT_FOUND');
    });
});

describe('itemService.update — garde-fou purchasePrice', () => {
    test('rejette toute tentative de passer purchasePrice via update()', async () => {
        mockRepo.findById.mockResolvedValue(makeItem());
        const data = { name: 'New name', purchasePrice: 999 } as unknown as Parameters<typeof itemService.update>[1];
        await expect(itemService.update('item-uuid-1', data)).rejects.toThrow('USE_UPDATE_PURCHASE_PRICE');
    });
});
