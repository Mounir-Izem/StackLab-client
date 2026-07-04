import {
    getItemRole,
    isActiveHolding,
    isWish,
    isSoldRecord,
    isTrashedHolding,
    isTrashedWish,
    isTrashedSale,
    isTrashRole,
    isInvalidRole,
    type BusinessItemRole,
} from './itemSemantics';
import type { ItemStatus } from '../types/item.types';
import type { LabType } from '../types/lab.types';

describe('getItemRole', () => {
    const cases: [LabType, ItemStatus, BusinessItemRole][] = [
        ['standard', 'active', 'activeHolding'],
        ['standard', 'sold', 'soldRecord'],
        ['standard', 'wishlist', 'invalid'],

        ['wishlist', 'wishlist', 'wish'],
        ['wishlist', 'active', 'invalid'],
        ['wishlist', 'sold', 'invalid'],

        ['trash', 'active', 'trashedHolding'],
        ['trash', 'wishlist', 'trashedWish'],
        ['trash', 'sold', 'trashedSale'],
    ];

    test.each(cases)('lab.type=%s + item.status=%s → %s', (labType, itemStatus, expected) => {
        expect(getItemRole({ status: itemStatus }, { type: labType })).toBe(expected);
    });
});

describe('helpers', () => {
    test('isActiveHolding', () => {
        expect(isActiveHolding('activeHolding')).toBe(true);
        expect(isActiveHolding('wish')).toBe(false);
    });

    test('isWish', () => {
        expect(isWish('wish')).toBe(true);
        expect(isWish('activeHolding')).toBe(false);
    });

    test('isSoldRecord', () => {
        expect(isSoldRecord('soldRecord')).toBe(true);
        expect(isSoldRecord('trashedSale')).toBe(false);
    });

    test('isTrashedHolding', () => {
        expect(isTrashedHolding('trashedHolding')).toBe(true);
        expect(isTrashedHolding('trashedWish')).toBe(false);
    });

    test('isTrashedWish', () => {
        expect(isTrashedWish('trashedWish')).toBe(true);
        expect(isTrashedWish('trashedSale')).toBe(false);
    });

    test('isTrashedSale', () => {
        expect(isTrashedSale('trashedSale')).toBe(true);
        expect(isTrashedSale('trashedHolding')).toBe(false);
    });

    test('isTrashRole', () => {
        expect(isTrashRole('trashedHolding')).toBe(true);
        expect(isTrashRole('trashedWish')).toBe(true);
        expect(isTrashRole('trashedSale')).toBe(true);
        expect(isTrashRole('activeHolding')).toBe(false);
        expect(isTrashRole('wish')).toBe(false);
        expect(isTrashRole('soldRecord')).toBe(false);
        expect(isTrashRole('invalid')).toBe(false);
    });

    test('isInvalidRole', () => {
        expect(isInvalidRole('invalid')).toBe(true);
        expect(isInvalidRole('activeHolding')).toBe(false);
    });
});
