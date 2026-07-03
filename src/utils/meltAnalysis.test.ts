import { getMeltBadge, convertCurrencyAmount, NEAR_MELT_THRESHOLD } from './meltAnalysis';

const RATES = { EUR: 1.09, GBP: 1.27 };

describe('convertCurrencyAmount', () => {
    it('returns amount unchanged for same currency', () => {
        expect(convertCurrencyAmount(100, 'USD', 'USD', RATES)).toBe(100);
    });

    it('converts EUR to USD', () => {
        expect(convertCurrencyAmount(100, 'EUR', 'USD', RATES)).toBeCloseTo(109);
    });

    it('converts USD to EUR', () => {
        expect(convertCurrencyAmount(109, 'USD', 'EUR', RATES)).toBeCloseTo(100);
    });

    it('converts EUR to GBP via USD', () => {
        // 100 EUR × 1.09 = 109 USD → 109 / 1.27 ≈ 85.83 GBP
        expect(convertCurrencyAmount(100, 'EUR', 'GBP', RATES)).toBeCloseTo(85.83, 1);
    });

    it('returns null for unknown from-currency', () => {
        expect(convertCurrencyAmount(100, 'CHF', 'USD', RATES)).toBeNull();
    });

    it('returns null for unknown to-currency', () => {
        expect(convertCurrencyAmount(100, 'USD', 'CHF', RATES)).toBeNull();
    });

    it('returns null for both currencies unknown', () => {
        expect(convertCurrencyAmount(100, 'CHF', 'JPY', RATES)).toBeNull();
    });
});

describe('getMeltBadge', () => {
    function badge(price: number, meltTotal: number, priceCurrency = 'USD') {
        return getMeltBadge({ price, priceCurrency, displayCurrency: 'USD', meltTotal, rates: RATES });
    }

    // Core cases specified in the spec
    it('under melt: observed 94 vs melt 100', () => {
        expect(badge(94, 100)).toBe('under');
    });

    it('near melt: observed 100 vs melt 100 (exactly equal)', () => {
        expect(badge(100, 100)).toBe('near');
    });

    it('near melt: observed 104 vs melt 100', () => {
        expect(badge(104, 100)).toBe('near');
    });

    it('null: observed 106 vs melt 100 (above 5% threshold)', () => {
        expect(badge(106, 100)).toBeNull();
    });

    it('null: meltTotal is 0', () => {
        expect(badge(100, 0)).toBeNull();
    });

    it('null: currency conversion impossible', () => {
        expect(getMeltBadge({ price: 100, priceCurrency: 'CHF', displayCurrency: 'USD', meltTotal: 100, rates: RATES })).toBeNull();
    });

    // Boundary: exactly at threshold
    it('near melt: observed exactly at meltTotal * (1 + threshold)', () => {
        const atThreshold = (m: number) => m * (1 + NEAR_MELT_THRESHOLD);
        expect(badge(atThreshold(100), 100)).toBe('near');
    });

    it('null: observed just above threshold', () => {
        expect(badge(105.01, 100)).toBeNull();
    });

    // Currency conversion
    it('null when priceDisplay > meltTotal * 1.05 after conversion', () => {
        // 100 EUR × 1.09 = 109 USD, melt 100 USD → 109 > 105 → null
        expect(getMeltBadge({ price: 100, priceCurrency: 'EUR', displayCurrency: 'USD', meltTotal: 100, rates: RATES })).toBeNull();
    });

    it('near melt after currency conversion', () => {
        // 94 EUR × 1.09 = 102.46 USD, melt 100 USD → 102.46 <= 105 → near
        expect(getMeltBadge({ price: 94, priceCurrency: 'EUR', displayCurrency: 'USD', meltTotal: 100, rates: RATES })).toBe('near');
    });

    it('under melt after currency conversion', () => {
        // 80 EUR × 1.09 = 87.2 USD, melt 100 USD → 87.2 < 100 → under
        expect(getMeltBadge({ price: 80, priceCurrency: 'EUR', displayCurrency: 'USD', meltTotal: 100, rates: RATES })).toBe('under');
    });

    it('same currency: no conversion needed', () => {
        expect(getMeltBadge({ price: 98, priceCurrency: 'EUR', displayCurrency: 'EUR', meltTotal: 100, rates: RATES })).toBe('under');
    });
});
