import {
    toTroyOz,
    generateFamilyKey,
    calcFineWeightOz,
    calcMeltValue,
    calcCurrentValue,
    calcUnrealizedPnL,
    calcUnrealizedPnLPct,
    calcWishlistGap,
} from './calculations';

describe('toTroyOz', () => {
    test('oz → oz (identité)', () => {
        expect(toTroyOz(1, 'oz')).toBe(1);
    });
    test('1g → 0.0321507 oz', () => {
        expect(toTroyOz(1, 'g')).toBeCloseTo(0.0321507, 6);
    });
    test('1kg → 32.1507 oz', () => {
        expect(toTroyOz(1, 'kg')).toBeCloseTo(32.1507, 4);
    });
});

describe('generateFamilyKey', () => {
    test('génère un slug lisible', () => {
        expect(generateFamilyKey('Maple Leaf', 'silver')).toBe('maple-leaf-silver');
    });
    test('supprime les accents', () => {
        expect(generateFamilyKey('Aigle Américain', 'gold')).toBe('aigle-americain-gold');
    });
    test('supprime les caractères spéciaux', () => {
        expect(generateFamilyKey('PAMP Suisse (1oz)', 'gold')).toBe('pamp-suisse-1oz-gold');
    });
    test('espaces multiples → tiret unique', () => {
        expect(generateFamilyKey('Maple   Leaf', 'silver')).toBe('maple-leaf-silver');
    });
});

describe('calcFineWeightOz', () => {
    test('Maple Leaf .9999 1oz', () => {
        expect(calcFineWeightOz(1.0, 0.9999)).toBeCloseTo(0.9999, 4);
    });
    test('Krugerrand .9167 1oz', () => {
        expect(calcFineWeightOz(1.0, 0.9167)).toBeCloseTo(0.9167, 4);
    });
    test('poids nul → 0', () => {
        expect(calcFineWeightOz(0, 0.9999)).toBe(0);
    });
});

describe('calcMeltValue', () => {
    test('fine oz × spot', () => {
        expect(calcMeltValue(0.9999, 35.0)).toBeCloseTo(34.9965, 4);
    });
    test('spot nul → 0', () => {
        expect(calcMeltValue(1.0, 0)).toBe(0);
    });
});

describe('calcCurrentValue', () => {
    test('7 Maple Leafs 1oz .9999 spot 35', () => {
        expect(calcCurrentValue(1.0, 7, 0.9999, 35.0)).toBeCloseTo(7 * 0.9999 * 35.0, 2);
    });
    test('quantity 1 → identique à calcMeltValue', () => {
        expect(calcCurrentValue(1.0, 1, 0.9999, 35.0)).toBeCloseTo(calcMeltValue(calcFineWeightOz(1.0, 0.9999), 35.0), 6);
    });
});

describe('calcUnrealizedPnL', () => {
    test('P&L positif si valeur > prix achat', () => {
        expect(calcUnrealizedPnL(35.0, 30.0)).toBeCloseTo(5.0, 6);
    });
    test('P&L négatif si valeur < prix achat', () => {
        expect(calcUnrealizedPnL(25.0, 30.0)).toBeCloseTo(-5.0, 6);
    });
    test('P&L nul si valeur = prix achat', () => {
        expect(calcUnrealizedPnL(30.0, 30.0)).toBe(0);
    });
    test('null si purchasePriceConverted est null', () => {
        expect(calcUnrealizedPnL(35.0, null)).toBeNull();
    });
});

describe('calcUnrealizedPnLPct', () => {
    test('pourcentage positif', () => {
        expect(calcUnrealizedPnLPct(5.0, 30.0)).toBeCloseTo(16.6667, 4);
    });
    test('pourcentage négatif', () => {
        expect(calcUnrealizedPnLPct(-5.0, 30.0)).toBeCloseTo(-16.6667, 4);
    });
    test('null si purchasePriceConverted = 0 (évite division par zéro)', () => {
        expect(calcUnrealizedPnLPct(5.0, 0)).toBeNull();
    });
});

describe('calcWishlistGap', () => {
    test('gap positif = premium au-dessus du melt (attendre)', () => {
        expect(calcWishlistGap(48.0, 34.82)).toBeCloseTo(13.18, 2);
    });
    test('gap négatif = prix constaté sous le melt (opportunité)', () => {
        expect(calcWishlistGap(30.0, 34.82)).toBeCloseTo(-4.82, 2);
    });
    test('gap nul si prix constaté = valeur melt', () => {
        expect(calcWishlistGap(34.82, 34.82)).toBe(0);
    });
});
