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
    purchasePriceBasis: null,
    purchaseCurrency: null,
    purchaseExchangeRate: null,
    purchaseDate: null,
    observedPrice: null,
    observedPriceBasis: null,
    observedCurrency: null,
    observedPriceDate: null,
    soldDate: null,
    soldPrice: null,
    soldPriceBasis: null,
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

    // Phase 10F — soldPrice = 0 est une vraie valeur (ex. don, perte totale
    // enregistrée volontairement) : ne doit jamais être traité comme "pas de
    // prix" (soldPrice null) ni perdre son basis. priceBasisOf() teste `== null`,
    // pas la falsy-ness — ce test garde cette distinction vraie de bout en bout
    // via le service, pas seulement au niveau du domain (déjà couvert par
    // resolvePriceEntry, lotUnitValueSemantics.test.ts).
    test('soldPrice = 0 (vente partielle) → reste 0, jamais null, basis conservé', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 7 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem());

        await itemService.sell('item-uuid-1', 2, 0, false, 'USD', '2026-04-24');

        const created = mockRepo.create.mock.calls[0][0];
        expect(created.soldPrice).toBe(0);
        expect(created.soldPriceBasis).toBe('lotTotal');
    });

    test('soldPrice = 0 (vente totale) → reste 0, jamais null, basis conservé', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 3 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 3, status: 'sold' }));

        await itemService.sell('item-uuid-1', 3, 0, true, 'USD', '2026-04-24');

        const updatePayload = mockRepo.update.mock.calls[0][1];
        expect(updatePayload.soldPrice).toBe(0);
        expect(updatePayload.soldPriceBasis).toBe('unit');
    });
});

// Phase 10F — sellMany() (vente en masse, ModifierScreenD) n'avait aucune
// couverture propre : la logique dédouble sell() (même finalSoldPrice /
// soldPriceBasis / prorata) mais n'était jamais exercée directement. Tests
// ciblés uniquement sur ce qui diffère d'un simple appel répété à sell() —
// pas de re-test des guards déjà couverts au-dessus.
describe('itemService.sellMany — prorata et prix', () => {
    test('vente partielle en masse proratise le purchasePrice comme sell() (lot 8/104€, vendre 2 → 26€ + 78€)', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: 104, purchasePriceBasis: 'lotTotal' }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 6 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 2, status: 'sold' }));

        await itemService.sellMany([
            { id: 'item-uuid-1', qty: 2, soldPrice: 50, perUnit: false, soldCurrency: 'USD', soldDate: '2026-04-24' },
        ]);

        const updatePayload = mockRepo.update.mock.calls[0][1];
        const created = mockRepo.create.mock.calls[0][0];
        expect(updatePayload.purchasePrice).toBeCloseTo(78, 2);
        expect(created.purchasePrice).toBeCloseTo(26, 2);
        expect(created.soldPrice).toBe(50);
    });

    test('soldPrice = 0 sur une row → reste 0, jamais null', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 3 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 2, status: 'sold' }));

        await itemService.sellMany([
            { id: 'item-uuid-1', qty: 2, soldPrice: 0, perUnit: false, soldCurrency: 'USD', soldDate: '2026-04-24' },
        ]);

        const created = mockRepo.create.mock.calls[0][0];
        expect(created.soldPrice).toBe(0);
        expect(created.soldPriceBasis).toBe('lotTotal');
    });

    test('plusieurs rows dans une même transaction, chacune avec sa propre base et son propre prorata', async () => {
        mockRepo.findById.mockImplementation((id: string) =>
            Promise.resolve(id === 'item-a'
                ? makeItem({ id: 'item-a', quantity: 10, purchasePrice: 200, purchasePriceBasis: 'lotTotal' })
                : makeItem({ id: 'item-b', quantity: 4, purchasePrice: 40, purchasePriceBasis: 'unit' })));
        mockRepo.update.mockResolvedValue(makeItem());
        mockRepo.create.mockResolvedValue(makeItem());

        await itemService.sellMany([
            { id: 'item-a', qty: 5, soldPrice: 12, perUnit: true, soldCurrency: 'USD', soldDate: '2026-04-24' },
            { id: 'item-b', qty: 1, soldPrice: 15, perUnit: false, soldCurrency: 'USD', soldDate: '2026-04-24' },
        ]);

        expect(mockRepo.create).toHaveBeenCalledTimes(2);
        const soldA = mockRepo.create.mock.calls[0][0];
        const soldB = mockRepo.create.mock.calls[1][0];
        // item-a : perUnit=true, prix 12 × qty 5 = 60
        expect(soldA.soldPrice).toBe(60);
        expect(soldA.purchasePrice).toBeCloseTo(100, 2); // prorata 5/10 de 200
        // item-b : perUnit=false, prix brut 15 (lot)
        expect(soldB.soldPrice).toBe(15);
        expect(soldB.purchasePrice).toBeCloseTo(10, 2); // prorata 1/4 de 40
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

// Phase 10G — aucune couverture n'existait pour restoreFromTrash() alors que
// c'est le chemin réellement exercé par TrashScreenC.tsx (restauration en
// masse) et ItemDetail.tsx (restauration d'un item trashé consulté seul).
// L'implémentation ne touche que labId/deckId — ces tests garantissent que
// quantity/purchasePrice/purchasePriceBasis/status restent bit-à-bit
// inchangés au retour de la corbeille (pas de drift de cost basis).
describe('itemService.restoreFromTrash', () => {
    test('ITEM_NOT_FOUND si item inexistant', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(itemService.restoreFromTrash('bad-id', 'lab-2', null)).rejects.toThrow('ITEM_NOT_FOUND');
    });

    test('ITEM_NOT_IN_TRASH si l\'item n\'est pas dans le lab Trash', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ labId: 'lab-uuid-1' }));
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        await expect(itemService.restoreFromTrash('item-uuid-1', 'lab-2', null)).rejects.toThrow('ITEM_NOT_IN_TRASH');
        expect(mockRepo.update).not.toHaveBeenCalled();
    });

    test('restauration → seuls labId/deckId changent, quantity/purchasePrice/basis/status intacts', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({
            labId: 'trash-lab', quantity: 5, purchasePrice: 104, purchasePriceBasis: 'unit', status: 'active',
        }));
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockRepo.update.mockResolvedValue(makeItem({ labId: 'lab-2' }));

        await itemService.restoreFromTrash('item-uuid-1', 'lab-2', 'deck-9');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { labId: 'lab-2', deckId: 'deck-9' });
    });

    test('restauration d\'un trashedSale (status sold) → status reste sold, réapparaît dans l\'historique des ventes', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({
            labId: 'trash-lab', status: 'sold', soldPrice: 60, soldPriceBasis: 'lotTotal',
        }));
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockRepo.update.mockResolvedValue(makeItem({ labId: 'lab-2', status: 'sold' }));

        await itemService.restoreFromTrash('item-uuid-1', 'lab-2', null);

        // status n'est jamais dans le payload : restoreFromTrash ne le touche
        // pas, il reste 'sold' tel quel côté DB — pas de réactivation en 'active'.
        const payload = mockRepo.update.mock.calls[0][1];
        expect(payload).not.toHaveProperty('status');
        expect(payload).toEqual({ labId: 'lab-2', deckId: null });
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
            status: 'sold', soldDate: '2026-04-24', soldPrice: 60, soldPriceBasis: 'lotTotal', soldCurrency: 'USD',
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
            observedPrice: null, observedPriceBasis: null, observedCurrency: null, observedPriceDate: null,
            purchasePrice: 104, purchasePriceBasis: 'lotTotal', purchaseCurrency: 'USD',
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

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 5, purchasePrice: null, purchasePriceBasis: null, observedPrice: null });
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
        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { quantity: 5, purchasePrice: null, purchasePriceBasis: null, observedPrice: 65 });
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

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { purchasePrice: 104, purchasePriceBasis: 'lotTotal' });
    });

    test('mode per-unit → multiplie par la quantity actuelle du row', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: 104 }));

        await itemService.updatePurchasePrice('item-uuid-1', 13, true);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { purchasePrice: 104, purchasePriceBasis: 'unit' });
    });

    test('null → écrit null, jamais 0', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 8 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 8, purchasePrice: null }));

        await itemService.updatePurchasePrice('item-uuid-1', null, false);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { purchasePrice: null, purchasePriceBasis: null });
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

describe('itemService.updateObservedPrice', () => {
    test('mode total → écrit la valeur telle quelle avec currency et date', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'wishlist', quantity: 5 }));
        mockRepo.update.mockResolvedValue(makeItem({ status: 'wishlist', observedPrice: 200, observedCurrency: 'EUR' }));

        await itemService.updateObservedPrice('item-uuid-1', 200, false, 'EUR', '2026-01-01');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', {
            observedPrice: 200,
            observedPriceBasis: 'lotTotal',
            observedCurrency: 'EUR',
            observedPriceDate: '2026-01-01',
        });
    });

    test('mode per-unit → multiplie par la quantity actuelle du row', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'wishlist', quantity: 5 }));
        mockRepo.update.mockResolvedValue(makeItem({ status: 'wishlist', observedPrice: 250 }));

        await itemService.updateObservedPrice('item-uuid-1', 50, true, 'USD', null);

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', {
            observedPrice: 250,
            observedPriceBasis: 'unit',
            observedCurrency: 'USD',
            observedPriceDate: null,
        });
    });

    test('null → efface observedPrice, currency et date', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'wishlist', quantity: 5, observedPrice: 200, observedCurrency: 'EUR' }));
        mockRepo.update.mockResolvedValue(makeItem({ status: 'wishlist', observedPrice: null, observedCurrency: null }));

        await itemService.updateObservedPrice('item-uuid-1', null, false, 'EUR', '2026-01-01');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', {
            observedPrice: null,
            observedPriceBasis: null,
            observedCurrency: null,
            observedPriceDate: null,
        });
    });

    test('ne touche jamais purchasePrice — la clé est absente du payload', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'wishlist', quantity: 5 }));
        mockRepo.update.mockResolvedValue(makeItem({ status: 'wishlist' }));

        await itemService.updateObservedPrice('item-uuid-1', 200, false, 'USD', null);

        const payload = mockRepo.update.mock.calls[0][1];
        expect(payload).not.toHaveProperty('purchasePrice');
    });

    test('ITEM_NOT_FOUND si item inexistant', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(itemService.updateObservedPrice('bad-id', 100, false, 'USD', null)).rejects.toThrow('ITEM_NOT_FOUND');
    });

    test('ITEM_NOT_WISHLIST si item est active', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'active' }));
        await expect(itemService.updateObservedPrice('item-uuid-1', 100, false, 'USD', null)).rejects.toThrow('ITEM_NOT_WISHLIST');
    });

    test('ITEM_NOT_WISHLIST si item est sold', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ status: 'sold' }));
        await expect(itemService.updateObservedPrice('item-uuid-1', 100, false, 'USD', null)).rejects.toThrow('ITEM_NOT_WISHLIST');
    });
});

// Lot B — price basis : le montant stocké reste le total normalisé, le basis
// capture l'intention de saisie déjà transmise par les flags perUnit existants
// (perUnit → 'unit', sinon 'lotTotal' ; prix null → basis null).
describe('itemService — price basis (Lot B)', () => {
    const baseCreateInput = {
        labId: 'lab-uuid-1',
        status: 'active' as const,
        name: 'Maple Leaf',
        metal: 'silver' as const,
        shape: 'coin' as const,
        weightInput: 1,
        weightUnit: 'oz' as const,
        purity: 0.9999,
        quantity: 5,
    };

    test('create actif, prix per-unit → purchasePriceBasis = unit (total normalisé conservé)', async () => {
        mockRepo.create.mockResolvedValue(makeItem());
        await itemService.create({ ...baseCreateInput, purchasePrice: 24, purchasePriceIsPerUnit: true });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBe(120);
        expect(created.purchasePriceBasis).toBe('unit');
    });

    test('create actif, prix lot → purchasePriceBasis = lotTotal', async () => {
        mockRepo.create.mockResolvedValue(makeItem());
        await itemService.create({ ...baseCreateInput, purchasePrice: 120, purchasePriceIsPerUnit: false });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBe(120);
        expect(created.purchasePriceBasis).toBe('lotTotal');
    });

    test('create actif sans prix → purchasePriceBasis null (invariant prix ⟺ basis)', async () => {
        mockRepo.create.mockResolvedValue(makeItem());
        await itemService.create({ ...baseCreateInput });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBeNull();
        expect(created.purchasePriceBasis).toBeNull();
        expect(created.observedPriceBasis).toBeNull();
        expect(created.soldPriceBasis).toBeNull();
    });

    test('create wishlist, prix observé per-unit → observedPriceBasis = unit', async () => {
        mockRepo.create.mockResolvedValue(makeItem());
        await itemService.create({ ...baseCreateInput, status: 'wishlist', observedPrice: 68, observedPriceIsPerUnit: true });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.observedPrice).toBe(340);
        expect(created.observedPriceBasis).toBe('unit');
    });

    test('create wishlist, prix observé lot → observedPriceBasis = lotTotal', async () => {
        mockRepo.create.mockResolvedValue(makeItem());
        await itemService.create({ ...baseCreateInput, status: 'wishlist', observedPrice: 340, observedPriceIsPerUnit: false });
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.observedPrice).toBe(340);
        expect(created.observedPriceBasis).toBe('lotTotal');
    });

    test('sell partiel per-unit → soldPriceBasis = unit sur le sold record, observedPriceBasis nettoyé', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({
            quantity: 7, purchasePrice: 104, purchasePriceBasis: 'unit',
        }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 2, status: 'sold' }));

        await itemService.sell('item-uuid-1', 2, 75, true, 'USD', '2026-04-24');

        const created = mockRepo.create.mock.calls[0][0];
        expect(created.soldPriceBasis).toBe('unit');
        expect(created.observedPriceBasis).toBeNull();
        // Le prorata conserve l'intention de saisie du parent sur le cost basis.
        expect(created.purchasePriceBasis).toBe('unit');
    });

    test('sell partiel, soldPrice null → soldPriceBasis null', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({ quantity: 7 }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 2, status: 'sold' }));

        await itemService.sell('item-uuid-1', 2, null, false, 'USD', '2026-04-24');

        const created = mockRepo.create.mock.calls[0][0];
        expect(created.soldPrice).toBeNull();
        expect(created.soldPriceBasis).toBeNull();
    });

    test('acquire per-unit → purchasePriceBasis = unit sur la part acquise', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({
            status: 'wishlist', quantity: 8, purchasePrice: null,
            observedPrice: 104, observedPriceBasis: 'unit',
        }));
        mockRepo.update.mockResolvedValue(makeItem({ quantity: 5 }));
        mockRepo.create.mockResolvedValue(makeItem({ quantity: 3, status: 'active' }));

        await itemService.acquire('item-uuid-1', 3, 'lab-2', null, 13, 'USD', true);

        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBe(39);
        expect(created.purchasePriceBasis).toBe('unit');
        expect(created.observedPriceBasis).toBeNull();
        // La part Wishlist restante garde son observedPriceBasis (payload update
        // ne touche pas la clé) et n'hérite d'aucun basis d'achat.
        const updatePayload = mockRepo.update.mock.calls[0][1];
        expect(updatePayload.purchasePriceBasis).toBeNull();
        expect(updatePayload).not.toHaveProperty('observedPriceBasis');
    });

    test('duplicate conserve les prix ET leurs basis', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({
            purchasePrice: 120, purchasePriceBasis: 'unit',
            observedPrice: null, observedPriceBasis: null,
        }));
        mockRepo.create.mockResolvedValue(makeItem());

        await itemService.duplicate('item-uuid-1');

        const created = mockRepo.create.mock.calls[0][0];
        expect(created.purchasePrice).toBe(120);
        expect(created.purchasePriceBasis).toBe('unit');
        expect(created.observedPriceBasis).toBeNull();
    });

    test('update() rejette purchasePriceBasis comme purchasePrice (USE_UPDATE_PURCHASE_PRICE)', async () => {
        const data = { purchasePriceBasis: 'unit' } as unknown as Parameters<typeof itemService.update>[1];
        await expect(itemService.update('item-uuid-1', data)).rejects.toThrow('USE_UPDATE_PURCHASE_PRICE');
    });

    test('soft delete vers Trash ne touche pas aux prix ni aux basis', async () => {
        mockRepo.findById.mockResolvedValue(makeItem({
            purchasePrice: 120, purchasePriceBasis: 'unit', photoUrl: null,
        }));
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockRepo.update.mockResolvedValue(makeItem());

        await itemService.delete('item-uuid-1');

        expect(mockRepo.update).toHaveBeenCalledWith('item-uuid-1', { labId: 'trash-lab', deckId: null });
    });
});
