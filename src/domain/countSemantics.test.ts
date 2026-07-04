import {
    getActiveHoldingCountDisplay,
    getWishlistCountDisplay,
    getSoldHistoryCountDisplay,
    getTrashCountDisplay,
    getLabCardCountDisplay,
} from './countSemantics';

// groupedLotCount = nombre d'items avec quantity > 1 — jamais le nombre de
// rows. Un item quantity=1 est une unité individuelle, pas un lot.
describe('getActiveHoldingCountDisplay', () => {
    test('groupedLotCount=0, unitCount=1 (quantities [1]) → units seul', () => {
        expect(getActiveHoldingCountDisplay({ groupedLotCount: 0, unitCount: 1 })).toEqual({
            kind: 'segments',
            segments: [{ unit: 'units', count: 1 }],
        });
    });

    test('groupedLotCount=0, unitCount=3 (quantities [1,1,1]) → units seul', () => {
        const result = getActiveHoldingCountDisplay({ groupedLotCount: 0, unitCount: 3 });
        expect(result).toEqual({
            kind: 'segments',
            segments: [{ unit: 'units', count: 3 }],
        });
        if (result.kind !== 'segments') throw new Error('expected segments');
        expect(typeof result.segments[0].count).toBe('number');
    });

    test('groupedLotCount=1, unitCount=10 (quantities [10]) → 1 lot + 10 unités', () => {
        expect(getActiveHoldingCountDisplay({ groupedLotCount: 1, unitCount: 10 })).toEqual({
            kind: 'segments',
            segments: [
                { unit: 'lots', count: 1 },
                { unit: 'units', count: 10 },
            ],
        });
    });

    test('groupedLotCount=1, unitCount=11 (quantities [10,1]) → 1 lot + 11 unités', () => {
        expect(getActiveHoldingCountDisplay({ groupedLotCount: 1, unitCount: 11 })).toEqual({
            kind: 'segments',
            segments: [
                { unit: 'lots', count: 1 },
                { unit: 'units', count: 11 },
            ],
        });
    });

    test('groupedLotCount=4, unitCount=21 (quantities [10,5,3,2,1]) → 4 lots + 21 unités', () => {
        expect(getActiveHoldingCountDisplay({ groupedLotCount: 4, unitCount: 21 })).toEqual({
            kind: 'segments',
            segments: [
                { unit: 'lots', count: 4 },
                { unit: 'units', count: 21 },
            ],
        });
    });
});

describe('getWishlistCountDisplay', () => {
    test('wishCount=3 → segment wishes=3', () => {
        expect(getWishlistCountDisplay({ wishCount: 3 })).toEqual({
            kind: 'segments',
            segments: [{ unit: 'wishes', count: 3 }],
        });
    });

    test('wishCount=1 → segment wishes=1', () => {
        expect(getWishlistCountDisplay({ wishCount: 1 })).toEqual({
            kind: 'segments',
            segments: [{ unit: 'wishes', count: 1 }],
        });
    });
});

describe('getSoldHistoryCountDisplay', () => {
    test('saleCount=2, soldUnitCount=2 (égaux) → segment sales seul, pas de redondance', () => {
        expect(getSoldHistoryCountDisplay({ saleCount: 2, soldUnitCount: 2 })).toEqual({
            kind: 'segments',
            segments: [{ unit: 'sales', count: 2 }],
        });
    });

    test('saleCount=1, soldUnitCount=1 (égaux, singulier) → segment sales seul', () => {
        expect(getSoldHistoryCountDisplay({ saleCount: 1, soldUnitCount: 1 })).toEqual({
            kind: 'segments',
            segments: [{ unit: 'sales', count: 1 }],
        });
    });

    test('saleCount=2, soldUnitCount=25 (différents) → sales=2 + soldUnits=25', () => {
        expect(getSoldHistoryCountDisplay({ saleCount: 2, soldUnitCount: 25 })).toEqual({
            kind: 'segments',
            segments: [
                { unit: 'sales', count: 2 },
                { unit: 'soldUnits', count: 25 },
            ],
        });
    });
});

describe('getTrashCountDisplay', () => {
    test('objectCount=0 → kind empty, emptyKind trashEmpty', () => {
        expect(getTrashCountDisplay({ objectCount: 0 })).toEqual({
            kind: 'empty',
            emptyKind: 'trashEmpty',
        });
    });

    test('objectCount=5 → segment objects=5', () => {
        expect(getTrashCountDisplay({ objectCount: 5 })).toEqual({
            kind: 'segments',
            segments: [{ unit: 'objects', count: 5 }],
        });
    });
});

describe('getLabCardCountDisplay', () => {
    test('labType=standard, groupedLotCount=2, unitCount=10 → lots + units', () => {
        expect(getLabCardCountDisplay({ labType: 'standard', groupedLotCount: 2, unitCount: 10 })).toEqual({
            kind: 'segments',
            segments: [
                { unit: 'lots', count: 2 },
                { unit: 'units', count: 10 },
            ],
        });
    });

    test('labType=standard, groupedLotCount=0, unitCount=3 → units seul', () => {
        expect(getLabCardCountDisplay({ labType: 'standard', groupedLotCount: 0, unitCount: 3 })).toEqual({
            kind: 'segments',
            segments: [{ unit: 'units', count: 3 }],
        });
    });

    test('labType=wishlist, wishCount=4 → wishes (inchangé)', () => {
        expect(getLabCardCountDisplay({ labType: 'wishlist', wishCount: 4 })).toEqual({
            kind: 'segments',
            segments: [{ unit: 'wishes', count: 4 }],
        });
    });

    test('labType=trash, objectCount=0 → empty trashEmpty (inchangé)', () => {
        expect(getLabCardCountDisplay({ labType: 'trash', objectCount: 0 })).toEqual({
            kind: 'empty',
            emptyKind: 'trashEmpty',
        });
    });

    test('labType=trash, objectCount=3 → objects (inchangé)', () => {
        expect(getLabCardCountDisplay({ labType: 'trash', objectCount: 3 })).toEqual({
            kind: 'segments',
            segments: [{ unit: 'objects', count: 3 }],
        });
    });
});
