import { resolveQuantityDraft } from './quantityInput';

describe('resolveQuantityDraft', () => {
    test('draft vide → 1 (jamais 0 ni NaN)', () => {
        expect(resolveQuantityDraft('')).toBe(1);
    });

    test('valeur "5" acceptée', () => {
        expect(resolveQuantityDraft('5')).toBe(5);
    });

    test('valeur "25" (deux chiffres) acceptée', () => {
        expect(resolveQuantityDraft('25')).toBe(25);
    });

    test('valeur "0" → 1 (jamais 0)', () => {
        expect(resolveQuantityDraft('0')).toBe(1);
    });

    test('valeur négative → 1', () => {
        expect(resolveQuantityDraft('-3')).toBe(1);
    });

    test('valeur non numérique → 1', () => {
        expect(resolveQuantityDraft('abc')).toBe(1);
    });

    test('max fourni, valeur dans la limite → valeur inchangée', () => {
        expect(resolveQuantityDraft('5', 10)).toBe(5);
    });

    test('max fourni, valeur dépasse la limite → plafonnée au max', () => {
        expect(resolveQuantityDraft('25', 10)).toBe(10);
    });

    test('max fourni, draft vide → 1 (le plafond ne change pas le plancher)', () => {
        expect(resolveQuantityDraft('', 10)).toBe(1);
    });
});
