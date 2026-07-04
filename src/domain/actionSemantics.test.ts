import {
    getActionPermissions,
    canPerformAction,
    getAllowedActions,
} from './actionSemantics';

describe('getActionPermissions', () => {
    test('activeHolding', () => {
        expect(getActionPermissions('activeHolding')).toEqual({
            view: true,
            edit: true,
            sell: true,
            acquire: false,
            move: true,
            trash: true,
            restore: false,
            deleteForever: false,
            duplicate: true,
        });
    });

    test('wish', () => {
        expect(getActionPermissions('wish')).toEqual({
            view: true,
            edit: true,
            sell: false,
            acquire: true,
            move: false,
            trash: true,
            restore: false,
            deleteForever: false,
            duplicate: true,
        });
    });

    test('soldRecord', () => {
        expect(getActionPermissions('soldRecord')).toEqual({
            view: true,
            edit: false,
            sell: false,
            acquire: false,
            move: false,
            trash: true,
            restore: false,
            deleteForever: false,
            duplicate: false,
        });
    });

    test('trashedHolding', () => {
        expect(getActionPermissions('trashedHolding')).toEqual({
            view: true,
            edit: false,
            sell: false,
            acquire: false,
            move: false,
            trash: false,
            restore: true,
            deleteForever: true,
            duplicate: false,
        });
    });

    test('trashedWish', () => {
        expect(getActionPermissions('trashedWish')).toEqual({
            view: true,
            edit: false,
            sell: false,
            acquire: false,
            move: false,
            trash: false,
            restore: true,
            deleteForever: true,
            duplicate: false,
        });
    });

    test('trashedSale', () => {
        expect(getActionPermissions('trashedSale')).toEqual({
            view: true,
            edit: false,
            sell: false,
            acquire: false,
            move: false,
            trash: false,
            restore: true,
            deleteForever: true,
            duplicate: false,
        });
    });

    test('invalid — tout false', () => {
        expect(getActionPermissions('invalid')).toEqual({
            view: false,
            edit: false,
            sell: false,
            acquire: false,
            move: false,
            trash: false,
            restore: false,
            deleteForever: false,
            duplicate: false,
        });
    });
});

describe('canPerformAction', () => {
    test('activeHolding + sell → true', () => {
        expect(canPerformAction('activeHolding', 'sell')).toBe(true);
    });
    test('activeHolding + acquire → false', () => {
        expect(canPerformAction('activeHolding', 'acquire')).toBe(false);
    });
    test('wish + acquire → true', () => {
        expect(canPerformAction('wish', 'acquire')).toBe(true);
    });
    test('wish + sell → false', () => {
        expect(canPerformAction('wish', 'sell')).toBe(false);
    });
    test('soldRecord + trash → true', () => {
        expect(canPerformAction('soldRecord', 'trash')).toBe(true);
    });
    test('soldRecord + move → false', () => {
        expect(canPerformAction('soldRecord', 'move')).toBe(false);
    });
    test('soldRecord + duplicate → false', () => {
        expect(canPerformAction('soldRecord', 'duplicate')).toBe(false);
    });
    test('trashedHolding + restore → true', () => {
        expect(canPerformAction('trashedHolding', 'restore')).toBe(true);
    });
    test('trashedHolding + deleteForever → true', () => {
        expect(canPerformAction('trashedHolding', 'deleteForever')).toBe(true);
    });
    test('trashedHolding + trash → false', () => {
        expect(canPerformAction('trashedHolding', 'trash')).toBe(false);
    });
    test('invalid + view → false', () => {
        expect(canPerformAction('invalid', 'view')).toBe(false);
    });
});

describe('getAllowedActions — ordre stable', () => {
    test('activeHolding', () => {
        expect(getAllowedActions('activeHolding')).toEqual(
            ['view', 'edit', 'sell', 'move', 'trash', 'duplicate']
        );
    });
    test('wish', () => {
        expect(getAllowedActions('wish')).toEqual(
            ['view', 'edit', 'acquire', 'trash', 'duplicate']
        );
    });
    test('soldRecord', () => {
        expect(getAllowedActions('soldRecord')).toEqual(['view', 'trash']);
    });
    test('trashedHolding', () => {
        expect(getAllowedActions('trashedHolding')).toEqual(['view', 'restore', 'deleteForever']);
    });
    test('trashedWish', () => {
        expect(getAllowedActions('trashedWish')).toEqual(['view', 'restore', 'deleteForever']);
    });
    test('trashedSale', () => {
        expect(getAllowedActions('trashedSale')).toEqual(['view', 'restore', 'deleteForever']);
    });
    test('invalid', () => {
        expect(getAllowedActions('invalid')).toEqual([]);
    });
});
