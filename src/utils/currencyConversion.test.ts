import { convertCurrencyAmount } from './currencyConversion';

describe('convertCurrencyAmount', () => {
    test('même devise → montant inchangé', () => {
        expect(convertCurrencyAmount(100, 'EUR', 'EUR', {})).toBe(100);
    });

    test('USD → EUR (rates.EUR = 1.1)', () => {
        expect(convertCurrencyAmount(110, 'USD', 'EUR', { EUR: 1.1 })).toBeCloseTo(100, 6);
    });

    test('EUR → USD (rates.EUR = 1.1)', () => {
        expect(convertCurrencyAmount(100, 'EUR', 'USD', { EUR: 1.1 })).toBeCloseTo(110, 6);
    });

    test('EUR → GBP (rates.EUR = 1.1, rates.GBP = 1.25)', () => {
        // 100 EUR * 1.1 = 110 USD ; 110 USD / 1.25 = 88 GBP
        expect(convertCurrencyAmount(100, 'EUR', 'GBP', { EUR: 1.1, GBP: 1.25 })).toBeCloseTo(88, 6);
    });

    test('taux source manquant → null', () => {
        expect(convertCurrencyAmount(100, 'EUR', 'USD', {})).toBeNull();
    });

    test('taux destination manquant → null', () => {
        expect(convertCurrencyAmount(100, 'USD', 'EUR', {})).toBeNull();
    });

    test('USD implicite, rates null → montant inchangé', () => {
        expect(convertCurrencyAmount(100, 'USD', 'USD', null)).toBe(100);
    });

    test('USD implicite, rates undefined → montant inchangé', () => {
        expect(convertCurrencyAmount(100, 'USD', 'USD', undefined)).toBe(100);
    });

    test('montant non fini (NaN) → null', () => {
        expect(convertCurrencyAmount(NaN, 'USD', 'USD', null)).toBeNull();
    });

    test('montant non fini (Infinity) → null', () => {
        expect(convertCurrencyAmount(Infinity, 'USD', 'EUR', { EUR: 1.1 })).toBeNull();
    });
});
