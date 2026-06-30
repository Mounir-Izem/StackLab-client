import { labService } from './labService';
import { labRepository } from '../repositories/labRepository';
import { deckRepository } from '../repositories/deckRepository';
import { itemRepository } from '../repositories/itemRepository';
import type { Lab } from '../types/lab.types';
import type { Item } from '../types/item.types';
import type { Deck } from '../types/deck.types';

jest.mock('../repositories/labRepository');
jest.mock('../repositories/deckRepository');
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

const mockLabRepo = labRepository as jest.Mocked<typeof labRepository>;
const mockDeckRepo = deckRepository as jest.Mocked<typeof deckRepository>;
const mockItemRepo = itemRepository as jest.Mocked<typeof itemRepository>;

import * as FileSystem from 'expo-file-system';
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

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
    deckId: null,
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

describe('labService.create', () => {
    test('position = nombre de labs existants', async () => {
        mockLabRepo.findAll.mockResolvedValue([makeLab(), makeLab({ id: 'lab-2' })]);
        mockLabRepo.create.mockResolvedValue(makeLab({ position: 2 }));

        await labService.create('Mon Lab', 'standard');

        const call = mockLabRepo.create.mock.calls[0][0];
        expect(call.position).toBe(2);
    });

    test('userId null et coverPhotoUrl null à la création', async () => {
        mockLabRepo.findAll.mockResolvedValue([]);
        mockLabRepo.create.mockResolvedValue(makeLab());

        await labService.create('Mon Lab', 'standard');

        const call = mockLabRepo.create.mock.calls[0][0];
        expect(call.userId).toBeNull();
        expect(call.coverPhotoUrl).toBeNull();
    });
});

describe('labService.rename', () => {
    test('délègue à labRepository.update avec { name }', async () => {
        mockLabRepo.update.mockResolvedValue(makeLab({ name: 'Nouveau Nom' }));

        await labService.rename('lab-uuid-1', 'Nouveau Nom');

        expect(mockLabRepo.update).toHaveBeenCalledWith('lab-uuid-1', { name: 'Nouveau Nom' });
    });
});

describe('labService.reorder', () => {
    test('chaque id reçoit son index en position', async () => {
        mockLabRepo.update.mockResolvedValue(makeLab());
        const orderedIds = ['lab-3', 'lab-1', 'lab-2'];

        await labService.reorder(orderedIds);

        expect(mockLabRepo.update).toHaveBeenCalledTimes(3);
        expect(mockLabRepo.update).toHaveBeenNthCalledWith(1, 'lab-3', { position: 0 });
        expect(mockLabRepo.update).toHaveBeenNthCalledWith(2, 'lab-1', { position: 1 });
        expect(mockLabRepo.update).toHaveBeenNthCalledWith(3, 'lab-2', { position: 2 });
    });
});

describe('labService.getInvestedTotalsByLab', () => {
    test('purchasePrice est déjà un total de row, ne doit pas être remultiplié par quantity', async () => {
        mockLabRepo.findByType.mockResolvedValue(null);
        mockItemRepo.findAll.mockResolvedValue([
            makeItem({ labId: 'lab-1', quantity: 8, purchasePrice: 104, purchaseCurrency: 'EUR' }),
        ]);

        const totals = await labService.getInvestedTotalsByLab();

        expect(totals['lab-1']['EUR']).toBe(104);
    });

    test('additionne plusieurs rows dans la même devise sans multiplication', async () => {
        mockLabRepo.findByType.mockResolvedValue(null);
        mockItemRepo.findAll.mockResolvedValue([
            makeItem({ id: 'a', labId: 'lab-1', quantity: 8, purchasePrice: 104, purchaseCurrency: 'EUR' }),
            makeItem({ id: 'b', labId: 'lab-1', quantity: 1, purchasePrice: 50, purchaseCurrency: 'EUR' }),
        ]);

        const totals = await labService.getInvestedTotalsByLab();

        expect(totals['lab-1']['EUR']).toBe(154);
    });

    test('purchasePrice null est exclu du total, pas traité comme 0', async () => {
        mockLabRepo.findByType.mockResolvedValue(null);
        mockItemRepo.findAll.mockResolvedValue([
            makeItem({ id: 'a', labId: 'lab-1', quantity: 3, purchasePrice: null }),
            makeItem({ id: 'b', labId: 'lab-1', quantity: 2, purchasePrice: 20, purchaseCurrency: 'USD' }),
        ]);

        const totals = await labService.getInvestedTotalsByLab();

        expect(totals['lab-1']['USD']).toBe(20);
        expect(Object.keys(totals['lab-1'])).toHaveLength(1);
    });

    test('exclut les items du lab Trash', async () => {
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockItemRepo.findAll.mockResolvedValue([
            makeItem({ labId: 'trash-lab', quantity: 1, purchasePrice: 999, purchaseCurrency: 'USD' }),
        ]);

        const totals = await labService.getInvestedTotalsByLab();

        expect(totals['trash-lab']).toBeUndefined();
    });
});

describe('labService.getActiveSummaryByLab', () => {
    test('compte les cards (rows) et units (somme quantity) des items actifs en lab standard', async () => {
        mockLabRepo.findAll.mockResolvedValue([makeLab({ id: 'lab-1', type: 'standard' })]);
        mockItemRepo.findAll.mockResolvedValue([
            makeItem({ id: 'a', labId: 'lab-1', quantity: 5 }),
            makeItem({ id: 'b', labId: 'lab-1', quantity: 3 }),
        ]);

        const totals = await labService.getActiveSummaryByLab();

        expect(totals['lab-1']).toEqual({ cards: 2, units: 8 });
    });

    test('exclut un item actif qui ne serait pas dans un lab standard (Trash, Wishlist)', async () => {
        mockLabRepo.findAll.mockResolvedValue([
            makeLab({ id: 'lab-1', type: 'standard' }),
            makeLab({ id: 'trash-lab', type: 'trash' }),
        ]);
        mockItemRepo.findAll.mockResolvedValue([
            makeItem({ id: 'a', labId: 'lab-1', quantity: 2 }),
            makeItem({ id: 'b', labId: 'trash-lab', quantity: 9 }),
        ]);

        const totals = await labService.getActiveSummaryByLab();

        expect(totals['trash-lab']).toBeUndefined();
        expect(totals['lab-1']).toEqual({ cards: 1, units: 2 });
    });
});

describe('labService.getWishlistSummary', () => {
    test('compte les items wishlist du lab Wishlist', async () => {
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'wishlist-lab', type: 'wishlist' }));
        mockItemRepo.findAll.mockResolvedValue([
            makeItem({ id: 'a', labId: 'wishlist-lab', status: 'wishlist', quantity: 2 }),
            makeItem({ id: 'b', labId: 'wishlist-lab', status: 'wishlist', quantity: 1 }),
        ]);

        const summary = await labService.getWishlistSummary();

        expect(summary).toEqual({ cards: 2, units: 3 });
    });

    test('lab Wishlist introuvable → 0 partout, jamais une erreur', async () => {
        mockLabRepo.findByType.mockResolvedValue(null);
        mockItemRepo.findAll.mockResolvedValue([makeItem({ status: 'wishlist' })]);

        const summary = await labService.getWishlistSummary();

        expect(summary).toEqual({ cards: 0, units: 0 });
    });
});

describe('labService.getSoldSummary', () => {
    test('additionne proceeds et costBasis par devise pour les items sold hors Trash', async () => {
        mockLabRepo.findByType.mockResolvedValue(null);
        mockItemRepo.findAll.mockResolvedValue([
            makeItem({ id: 'a', status: 'sold', quantity: 2, soldPrice: 120, soldCurrency: 'USD', purchasePrice: 100, purchaseCurrency: 'USD' }),
            makeItem({ id: 'b', status: 'sold', quantity: 1, soldPrice: 50, soldCurrency: 'EUR', purchasePrice: 40, purchaseCurrency: 'EUR' }),
        ]);

        const summary = await labService.getSoldSummary();

        expect(summary.cards).toBe(2);
        expect(summary.units).toBe(3);
        expect(summary.proceedsByCurrency).toEqual({ USD: 120, EUR: 50 });
        expect(summary.costBasisByCurrency).toEqual({ USD: 100, EUR: 40 });
    });

    test('Trash prime sur tout : un item sold déplacé en Trash disparaît du Sold history', async () => {
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockItemRepo.findAll.mockResolvedValue([
            makeItem({ id: 'a', labId: 'lab-1', status: 'sold', soldPrice: 100, purchasePrice: 80 }),
            makeItem({ id: 'b', labId: 'trash-lab', status: 'sold', soldPrice: 999, purchasePrice: 1 }),
        ]);

        const summary = await labService.getSoldSummary();

        expect(summary.cards).toBe(1);
        expect(summary.proceedsByCurrency['USD']).toBe(100);
    });

    test('soldPrice/purchasePrice null exclus du total, jamais traités comme 0', async () => {
        mockLabRepo.findByType.mockResolvedValue(null);
        mockItemRepo.findAll.mockResolvedValue([
            makeItem({ id: 'a', status: 'sold', soldPrice: null, purchasePrice: null }),
        ]);

        const summary = await labService.getSoldSummary();

        expect(summary.cards).toBe(1);
        expect(Object.keys(summary.proceedsByCurrency)).toHaveLength(0);
        expect(Object.keys(summary.costBasisByCurrency)).toHaveLength(0);
    });
});

describe('labService.getTrashSummary', () => {
    test('compte tous les items du lab Trash, quel que soit leur status', async () => {
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockItemRepo.findByLabId.mockResolvedValue([
            makeItem({ id: 'a', labId: 'trash-lab', status: 'sold', quantity: 2 }),
            makeItem({ id: 'b', labId: 'trash-lab', status: 'active', quantity: 1 }),
        ]);

        const summary = await labService.getTrashSummary();

        expect(summary).toEqual({ cards: 2, units: 3 });
        expect(mockItemRepo.findByLabId).toHaveBeenCalledWith('trash-lab');
    });

    test('lab Trash introuvable → 0 partout, jamais une erreur', async () => {
        mockLabRepo.findByType.mockResolvedValue(null);

        const summary = await labService.getTrashSummary();

        expect(summary).toEqual({ cards: 0, units: 0 });
    });
});

// deleteWithContent supprime un Lab (pas ses items) : tout le contenu du lab part
// en Trash (jamais détruit), seuls le lab et son arbre de decks sont réellement
// supprimés en base. La suppression définitive d'un item (avec nettoyage photo)
// est un acte séparé, géré par itemService.delete() quand l'item est déjà en Trash
// (voir itemService.test.ts — describe 'itemService.delete — guards').
describe('labService.deleteWithContent — guards', () => {
    test('LAB_NOT_FOUND si le lab n\'existe pas', async () => {
        mockLabRepo.findById.mockResolvedValue(null);

        await expect(labService.deleteWithContent('lab-uuid-1')).rejects.toThrow('LAB_NOT_FOUND');
    });

    test('CANNOT_DELETE_SYSTEM_LAB si le lab est un lab système', async () => {
        mockLabRepo.findById.mockResolvedValue(makeLab({ isSystem: true }));

        await expect(labService.deleteWithContent('lab-uuid-1')).rejects.toThrow('CANNOT_DELETE_SYSTEM_LAB');
    });

    test('TRASH_LAB_NOT_FOUND si le lab Trash système est introuvable', async () => {
        mockLabRepo.findById.mockResolvedValue(makeLab());
        mockLabRepo.findByType.mockResolvedValue(null);

        await expect(labService.deleteWithContent('lab-uuid-1')).rejects.toThrow('TRASH_LAB_NOT_FOUND');
    });

    test('un item sold n\'empêche plus la suppression du lab — il part en Trash comme les autres', async () => {
        mockLabRepo.findById.mockResolvedValue(makeLab());
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockItemRepo.findByLabId.mockResolvedValue([makeItem({ status: 'sold' })]);
        mockDeckRepo.findByLabId.mockResolvedValue([]);
        mockItemRepo.update.mockResolvedValue(makeItem());
        mockLabRepo.delete.mockResolvedValue(undefined);

        await expect(labService.deleteWithContent('lab-uuid-1')).resolves.not.toThrow();
        expect(mockItemRepo.update).toHaveBeenCalledWith('item-uuid-1', { labId: 'trash-lab', deckId: null });
    });
});

describe('labService.deleteWithContent — suppression', () => {
    test('déplace tous les items vers Trash (statuts mélangés) et supprime le lab', async () => {
        mockLabRepo.findById.mockResolvedValue(makeLab());
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockItemRepo.findByLabId.mockResolvedValue([
            makeItem({ id: 'item-1', status: 'active' }),
            makeItem({ id: 'item-2', status: 'sold' }),
        ]);
        mockDeckRepo.findByLabId.mockResolvedValue([]);
        mockItemRepo.update.mockResolvedValue(makeItem());
        mockLabRepo.delete.mockResolvedValue(undefined);

        await labService.deleteWithContent('lab-uuid-1');

        expect(mockItemRepo.update).toHaveBeenCalledWith('item-1', { labId: 'trash-lab', deckId: null });
        expect(mockItemRepo.update).toHaveBeenCalledWith('item-2', { labId: 'trash-lab', deckId: null });
        expect(mockItemRepo.delete).not.toHaveBeenCalled();
        expect(mockLabRepo.delete).toHaveBeenCalledWith('lab-uuid-1');
    });

    test('supprime l\'arborescence de decks du lab', async () => {
        mockLabRepo.findById.mockResolvedValue(makeLab());
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockItemRepo.findByLabId.mockResolvedValue([]);
        mockDeckRepo.findByLabId.mockResolvedValueOnce([makeDeck({ id: 'deck-1' })]).mockResolvedValueOnce([]);
        mockDeckRepo.delete.mockResolvedValue(undefined);
        mockLabRepo.delete.mockResolvedValue(undefined);

        await labService.deleteWithContent('lab-uuid-1');

        expect(mockDeckRepo.delete).toHaveBeenCalledWith('deck-1');
    });

    test('ne supprime jamais les photos — les items survivent intacts dans Trash, suppression définitive hors scope', async () => {
        mockLabRepo.findById.mockResolvedValue(makeLab());
        mockLabRepo.findByType.mockResolvedValue(makeLab({ id: 'trash-lab', type: 'trash' }));
        mockItemRepo.findByLabId.mockResolvedValue([makeItem({ photoUrl: 'file://photo1.jpg' })]);
        mockDeckRepo.findByLabId.mockResolvedValue([]);
        mockItemRepo.update.mockResolvedValue(makeItem());
        mockLabRepo.delete.mockResolvedValue(undefined);

        await labService.deleteWithContent('lab-uuid-1');

        expect(mockFileSystem.File).not.toHaveBeenCalled();
        expect(mockItemRepo.delete).not.toHaveBeenCalled();
    });
});

// Les 3 labs système (standard principal "My Stack", Wishlist, Trash) sont créés avec
// isSystem: true par ensureSystemLabs() et ne doivent jamais être supprimables — seuls
// de futurs labs standard additionnels (payants) pourront l'être. Le guard porte sur
// isSystem, pas sur type, donc il protège les 3 indifféremment de leur nature.
describe('labService — protection des 3 labs système (non supprimables)', () => {
    test.each([
        ['standard principal', 'standard'],
        ['Wishlist', 'wishlist'],
        ['Trash', 'trash'],
    ] as const)('deleteWithContent refuse le lab système %s', async (_label, type) => {
        mockLabRepo.findById.mockResolvedValue(makeLab({ isSystem: true, type }));

        await expect(labService.deleteWithContent('lab-uuid-1')).rejects.toThrow('CANNOT_DELETE_SYSTEM_LAB');
        expect(mockLabRepo.delete).not.toHaveBeenCalled();
    });

    test.each([
        ['standard principal', 'standard'],
        ['Wishlist', 'wishlist'],
        ['Trash', 'trash'],
    ] as const)('deleteAndMigrate refuse le lab système %s', async (_label, type) => {
        mockLabRepo.findById.mockResolvedValue(makeLab({ isSystem: true, type }));

        await expect(labService.deleteAndMigrate('lab-uuid-1', 'lab-target')).rejects.toThrow('CANNOT_DELETE_SYSTEM_LAB');
        expect(mockLabRepo.delete).not.toHaveBeenCalled();
    });
});

describe('labService.deleteAndMigrate', () => {
    test('LAB_NOT_FOUND si le lab source n\'existe pas', async () => {
        mockLabRepo.findById.mockResolvedValue(null);

        await expect(labService.deleteAndMigrate('lab-uuid-1', 'lab-target')).rejects.toThrow('LAB_NOT_FOUND');
    });

    test('migre les items vers le lab cible avec deckId null', async () => {
        mockLabRepo.findById.mockResolvedValue(makeLab());
        mockItemRepo.findByLabId.mockResolvedValue([
            makeItem({ id: 'item-1' }),
            makeItem({ id: 'item-2', deckId: 'deck-1' }),
        ]);
        mockDeckRepo.findByLabId.mockResolvedValue([]);
        mockItemRepo.update.mockResolvedValue(makeItem());
        mockLabRepo.delete.mockResolvedValue(undefined);

        await labService.deleteAndMigrate('lab-uuid-1', 'lab-target');

        expect(mockItemRepo.update).toHaveBeenCalledWith('item-1', { labId: 'lab-target', deckId: null });
        expect(mockItemRepo.update).toHaveBeenCalledWith('item-2', { labId: 'lab-target', deckId: null });
    });

    test('supprime le lab source après migration', async () => {
        mockLabRepo.findById.mockResolvedValue(makeLab());
        mockItemRepo.findByLabId.mockResolvedValue([]);
        mockDeckRepo.findByLabId.mockResolvedValue([]);
        mockLabRepo.delete.mockResolvedValue(undefined);

        await labService.deleteAndMigrate('lab-uuid-1', 'lab-target');

        expect(mockLabRepo.delete).toHaveBeenCalledWith('lab-uuid-1');
    });
});
