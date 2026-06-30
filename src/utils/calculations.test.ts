import {
    toTroyOz,
    generateFamilyKey,
    calcFineWeightOz,
    calcMeltValue,
    calcCurrentValue,
    calcUnrealizedPnL,
    calcUnrealizedPnLPct,
    calcWishlistGap,
    proratePurchasePrice,
    sumByCurrency,
    calcRealizedPnL,
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

describe('proratePurchasePrice', () => {
    test('100€ / 3, extraction de 1 → 33.33 + 66.67 = 100', () => {
        const { extracted, remaining } = proratePurchasePrice(100, 1, 3);
        expect(extracted).toBeCloseTo(33.33, 2);
        expect(remaining).toBeCloseTo(66.67, 2);
        expect((extracted as number) + (remaining as number)).toBeCloseTo(100, 8);
    });

    test('10€ / 6, extraction de 1 → 1.67 + 8.33 = 10', () => {
        const { extracted, remaining } = proratePurchasePrice(10, 1, 6);
        expect(extracted).toBeCloseTo(1.67, 2);
        expect(remaining).toBeCloseTo(8.33, 2);
        expect((extracted as number) + (remaining as number)).toBeCloseTo(10, 8);
    });

    test('99.99€ / 8, extraction de 3 → somme exacte', () => {
        const { extracted, remaining } = proratePurchasePrice(99.99, 3, 8);
        expect((extracted as number) + (remaining as number)).toBeCloseTo(99.99, 8);
    });

    test('104€ / 8, extraction de 2 → 26 + 78 = 104 (exemple métier sell partiel)', () => {
        const { extracted, remaining } = proratePurchasePrice(104, 2, 8);
        expect(extracted).toBe(26);
        expect(remaining).toBe(78);
    });

    test('null → reste null des deux côtés, jamais 0', () => {
        const { extracted, remaining } = proratePurchasePrice(null, 1, 3);
        expect(extracted).toBeNull();
        expect(remaining).toBeNull();
    });

    test('0 est une valeur légitime, prorata 0/0', () => {
        const { extracted, remaining } = proratePurchasePrice(0, 1, 3);
        expect(extracted).toBe(0);
        expect(remaining).toBe(0);
    });

    test('extraction de la totalité (takeQty === fromQty) → tout extrait, rien ne reste', () => {
        const { extracted, remaining } = proratePurchasePrice(104, 8, 8);
        expect(extracted).toBe(104);
        expect(remaining).toBe(0);
    });

    test('somme exacte sur une série de montants/quantités variés', () => {
        const cases: Array<[number, number, number]> = [
            [104, 2, 8], [13.37, 1, 7], [1000, 999, 1000], [0.03, 1, 2], [250, 4, 9],
        ];
        for (const [total, take, from] of cases) {
            const { extracted, remaining } = proratePurchasePrice(total, take, from);
            const sum = Math.round(((extracted as number) + (remaining as number)) * 100);
            expect(sum).toBe(Math.round(total * 100));
        }
    });
});

describe('sumByCurrency', () => {
    test('devise unique = devise d\'affichage → pas de conversion', () => {
        expect(sumByCurrency({ USD: 100 }, 'USD', {})).toBe(100);
    });

    test('plusieurs devises converties et additionnées', () => {
        const total = sumByCurrency({ USD: 100, EUR: 50 }, 'USD', { EUR: 1.1 });
        expect(total).toBeCloseTo(100 + 50 * 1.1, 6);
    });

    test('objet vide → null', () => {
        expect(sumByCurrency({}, 'USD', {})).toBeNull();
    });

    test('devise non-USD sans rates dispo → null (pas de conversion inventée)', () => {
        expect(sumByCurrency({ EUR: 50 }, 'USD', {})).toBeNull();
    });
});

describe('calcRealizedPnL', () => {
    test('proceeds > cost basis → P&L positif', () => {
        expect(calcRealizedPnL(120, 100)).toBe(20);
    });

    test('proceeds < cost basis → P&L négatif', () => {
        expect(calcRealizedPnL(80, 100)).toBe(-20);
    });

    test('proceeds null → null (jamais 0 par défaut)', () => {
        expect(calcRealizedPnL(null, 100)).toBeNull();
    });

    test('costBasis null → null (jamais 0 par défaut)', () => {
        expect(calcRealizedPnL(120, null)).toBeNull();
    });
});
