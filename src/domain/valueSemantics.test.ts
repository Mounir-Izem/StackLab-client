import {
    getValuePermissions,
    canShowValue,
    getPrimaryValueKind,
    getAllowedValueKinds,
    convertCurrencyAmount,
    getObservedPremium,
} from './valueSemantics';

describe('getValuePermissions', () => {
    test('activeHolding', () => {
        expect(getValuePermissions('activeHolding')).toEqual({
            meltValue: true,
            purchasePrice: true,
            unrealizedPnL: true,
            observedPrice: false,
            observedPremium: false,
            soldPrice: false,
            realizedPnL: false,
        });
    });

    test('wish', () => {
        expect(getValuePermissions('wish')).toEqual({
            observedPrice: true,
            observedPremium: true,
            meltValue: true,
            purchasePrice: false,
            soldPrice: false,
            unrealizedPnL: false,
            realizedPnL: false,
        });
    });

    test('soldRecord', () => {
        expect(getValuePermissions('soldRecord')).toEqual({
            soldPrice: true,
            purchasePrice: true,
            realizedPnL: true,
            observedPremium: false,
            observedPrice: false,
            unrealizedPnL: false,
            meltValue: false,
        });
    });

    test('trash roles → tout false', () => {
        const allFalse = {
            meltValue: false,
            purchasePrice: false,
            observedPrice: false,
            soldPrice: false,
            observedPremium: false,
            unrealizedPnL: false,
            realizedPnL: false,
        };
        expect(getValuePermissions('trashedHolding')).toEqual(allFalse);
        expect(getValuePermissions('trashedWish')).toEqual(allFalse);
        expect(getValuePermissions('trashedSale')).toEqual(allFalse);
    });

    test('invalid → tout false', () => {
        expect(getValuePermissions('invalid')).toEqual({
            meltValue: false,
            purchasePrice: false,
            observedPrice: false,
            soldPrice: false,
            observedPremium: false,
            unrealizedPnL: false,
            realizedPnL: false,
        });
    });
});

describe('canShowValue', () => {
    test('wish + observedPremium → true', () => {
        expect(canShowValue('wish', 'observedPremium')).toBe(true);
    });

    test('activeHolding + observedPremium → false', () => {
        expect(canShowValue('activeHolding', 'observedPremium')).toBe(false);
    });

    test('soldRecord + observedPremium → false', () => {
        expect(canShowValue('soldRecord', 'observedPremium')).toBe(false);
    });
});

describe('getPrimaryValueKind', () => {
    test('activeHolding → meltValue', () => {
        expect(getPrimaryValueKind('activeHolding')).toBe('meltValue');
    });
    test('wish → observedPrice', () => {
        expect(getPrimaryValueKind('wish')).toBe('observedPrice');
    });
    test('soldRecord → soldPrice', () => {
        expect(getPrimaryValueKind('soldRecord')).toBe('soldPrice');
    });
    test('trashedHolding → null', () => {
        expect(getPrimaryValueKind('trashedHolding')).toBeNull();
    });
    test('trashedWish → null', () => {
        expect(getPrimaryValueKind('trashedWish')).toBeNull();
    });
    test('trashedSale → null', () => {
        expect(getPrimaryValueKind('trashedSale')).toBeNull();
    });
    test('invalid → null', () => {
        expect(getPrimaryValueKind('invalid')).toBeNull();
    });
});

describe('getAllowedValueKinds', () => {
    test('activeHolding → meltValue, purchasePrice, unrealizedPnL', () => {
        expect(getAllowedValueKinds('activeHolding').sort()).toEqual(
            ['meltValue', 'purchasePrice', 'unrealizedPnL'].sort()
        );
    });
    test('wish → observedPrice, meltValue, observedPremium', () => {
        expect(getAllowedValueKinds('wish').sort()).toEqual(
            ['observedPrice', 'meltValue', 'observedPremium'].sort()
        );
    });
    test('soldRecord → soldPrice, purchasePrice, realizedPnL', () => {
        expect(getAllowedValueKinds('soldRecord').sort()).toEqual(
            ['soldPrice', 'purchasePrice', 'realizedPnL'].sort()
        );
    });
    test('trash / invalid roles → []', () => {
        expect(getAllowedValueKinds('trashedHolding')).toEqual([]);
        expect(getAllowedValueKinds('trashedWish')).toEqual([]);
        expect(getAllowedValueKinds('trashedSale')).toEqual([]);
        expect(getAllowedValueKinds('invalid')).toEqual([]);
    });
});

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

    test('taux from manquant → null', () => {
        expect(convertCurrencyAmount(100, 'EUR', 'USD', {})).toBeNull();
    });

    test('taux to manquant → null', () => {
        expect(convertCurrencyAmount(100, 'USD', 'EUR', {})).toBeNull();
    });

    test('USD implicite, rates null → montant inchangé', () => {
        expect(convertCurrencyAmount(100, 'USD', 'USD', null)).toBe(100);
    });

    test('amount non fini (NaN) → null', () => {
        expect(convertCurrencyAmount(NaN, 'USD', 'USD', null)).toBeNull();
    });

    test('amount non fini (Infinity) → null', () => {
        expect(convertCurrencyAmount(Infinity, 'USD', 'EUR', { EUR: 1.1 })).toBeNull();
    });
});

describe('getObservedPremium', () => {
    test('même devise, prime positive', () => {
        expect(getObservedPremium({
            role: 'wish',
            observedPrice: 120,
            observedCurrency: 'EUR',
            currentMeltValue: 100,
            displayCurrency: 'EUR',
            rates: null,
        })).toEqual({ amount: 20, percent: 0.2, currency: 'EUR' });
    });

    test('même devise, prime négative (sous valeur métal)', () => {
        expect(getObservedPremium({
            role: 'wish',
            observedPrice: 90,
            observedCurrency: 'EUR',
            currentMeltValue: 100,
            displayCurrency: 'EUR',
            rates: {},
        })).toEqual({ amount: -10, percent: -0.1, currency: 'EUR' });
    });

    test('role guard — activeHolding → null même avec données valides', () => {
        expect(getObservedPremium({
            role: 'activeHolding',
            observedPrice: 120,
            observedCurrency: 'EUR',
            currentMeltValue: 100,
            displayCurrency: 'EUR',
            rates: null,
        })).toBeNull();
    });

    test('role guard — soldRecord → null même avec données valides', () => {
        expect(getObservedPremium({
            role: 'soldRecord',
            observedPrice: 120,
            observedCurrency: 'EUR',
            currentMeltValue: 100,
            displayCurrency: 'EUR',
            rates: null,
        })).toBeNull();
    });

    test('observedPrice null → null', () => {
        expect(getObservedPremium({
            role: 'wish',
            observedPrice: null,
            observedCurrency: 'EUR',
            currentMeltValue: 100,
            displayCurrency: 'EUR',
            rates: null,
        })).toBeNull();
    });

    test('observedCurrency null → null', () => {
        expect(getObservedPremium({
            role: 'wish',
            observedPrice: 120,
            observedCurrency: null,
            currentMeltValue: 100,
            displayCurrency: 'EUR',
            rates: null,
        })).toBeNull();
    });

    test('currentMeltValue null → null', () => {
        expect(getObservedPremium({
            role: 'wish',
            observedPrice: 120,
            observedCurrency: 'EUR',
            currentMeltValue: null,
            displayCurrency: 'EUR',
            rates: null,
        })).toBeNull();
    });

    test('currentMeltValue 0 → null', () => {
        expect(getObservedPremium({
            role: 'wish',
            observedPrice: 120,
            observedCurrency: 'EUR',
            currentMeltValue: 0,
            displayCurrency: 'EUR',
            rates: null,
        })).toBeNull();
    });

    test('currentMeltValue négatif → null', () => {
        expect(getObservedPremium({
            role: 'wish',
            observedPrice: 120,
            observedCurrency: 'EUR',
            currentMeltValue: -50,
            displayCurrency: 'EUR',
            rates: null,
        })).toBeNull();
    });

    test('cross-currency USD → EUR', () => {
        const result = getObservedPremium({
            role: 'wish',
            observedPrice: 110,
            observedCurrency: 'USD',
            currentMeltValue: 100,
            displayCurrency: 'EUR',
            rates: { EUR: 1.1 },
        });
        expect(result).not.toBeNull();
        expect(result!.amount).toBeCloseTo(0, 6);
        expect(result!.percent).toBeCloseTo(0, 6);
        expect(result!.currency).toBe('EUR');
    });

    test('cross-currency EUR → USD', () => {
        const result = getObservedPremium({
            role: 'wish',
            observedPrice: 100,
            observedCurrency: 'EUR',
            currentMeltValue: 110,
            displayCurrency: 'USD',
            rates: { EUR: 1.1 },
        });
        expect(result).not.toBeNull();
        expect(result!.amount).toBeCloseTo(0, 6);
        expect(result!.percent).toBeCloseTo(0, 6);
        expect(result!.currency).toBe('USD');
    });

    test('taux manquant pour la conversion → null', () => {
        expect(getObservedPremium({
            role: 'wish',
            observedPrice: 100,
            observedCurrency: 'EUR',
            currentMeltValue: 100,
            displayCurrency: 'USD',
            rates: {},
        })).toBeNull();
    });
});
