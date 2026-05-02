import { labService } from './labService';
import { labRepository } from '../repositories/labRepository';
import { deckRepository } from '../repositories/deckRepository';
import { itemRepository } from '../repositories/itemRepository';
import type { Lab } from '../types/lab.types';
import type { Item } from '../types/item.types';

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

describe('labService.deleteWithContent — guards', () => {
    test('LAB_HAS_SOLD_ITEMS si un item est sold', async () => {
        mockItemRepo.findByLabId.mockResolvedValue([makeItem({ status: 'sold' })]);

        await expect(labService.deleteWithContent('lab-uuid-1')).rejects.toThrow('LAB_HAS_SOLD_ITEMS');
    });
});

describe('labService.deleteWithContent — suppression', () => {
    test('supprime items, decks et lab dans la transaction', async () => {
        mockItemRepo.findByLabId.mockResolvedValue([makeItem({ id: 'item-1' }), makeItem({ id: 'item-2' })]);
        mockDeckRepo.findByLabId.mockResolvedValue([]);
        mockItemRepo.delete.mockResolvedValue(undefined);
        mockLabRepo.delete.mockResolvedValue(undefined);

        await labService.deleteWithContent('lab-uuid-1');

        expect(mockItemRepo.delete).toHaveBeenCalledWith('item-1');
        expect(mockItemRepo.delete).toHaveBeenCalledWith('item-2');
        expect(mockLabRepo.delete).toHaveBeenCalledWith('lab-uuid-1');
    });

    test('nettoie les photos après la transaction', async () => {
        mockItemRepo.findByLabId.mockResolvedValue([
            makeItem({ photoUrl: 'file://photo1.jpg' }),
            makeItem({ id: 'item-2', photoUrl: 'file://photo2.jpg' }),
        ]);
        mockDeckRepo.findByLabId.mockResolvedValue([]);
        mockItemRepo.delete.mockResolvedValue(undefined);
        mockLabRepo.delete.mockResolvedValue(undefined);

        await labService.deleteWithContent('lab-uuid-1');

        expect(mockFileSystem.File).toHaveBeenCalledWith('file://photo1.jpg');
        expect(mockFileSystem.File).toHaveBeenCalledWith('file://photo2.jpg');
    });

    test('aucune suppression de fichier si pas de photos', async () => {
        mockItemRepo.findByLabId.mockResolvedValue([makeItem({ photoUrl: null })]);
        mockDeckRepo.findByLabId.mockResolvedValue([]);
        mockItemRepo.delete.mockResolvedValue(undefined);
        mockLabRepo.delete.mockResolvedValue(undefined);

        await labService.deleteWithContent('lab-uuid-1');

        expect(mockFileSystem.File).not.toHaveBeenCalled();
    });
});

describe('labService.deleteAndMigrate', () => {
    test('migre les items vers le lab cible avec deckId null', async () => {
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
        mockItemRepo.findByLabId.mockResolvedValue([]);
        mockDeckRepo.findByLabId.mockResolvedValue([]);
        mockLabRepo.delete.mockResolvedValue(undefined);

        await labService.deleteAndMigrate('lab-uuid-1', 'lab-target');

        expect(mockLabRepo.delete).toHaveBeenCalledWith('lab-uuid-1');
    });
});
