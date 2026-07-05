import {
    getValuePerspectiveForRole,
    normalizePriceInputToTotal,
    deriveUnitTotalPriceBreakdown,
    deriveMeltValueBreakdown,
    derivePremiumBreakdown,
    deriveObservedPremiumBreakdown,
    getPremiumSignal,
} from './lotUnitValueSemantics';

describe('getValuePerspectiveForRole', () => {
    test('wish → buyerPerspective', () => {
        expect(getValuePerspectiveForRole('wish')).toBe('buyerPerspective');
    });
    test('activeHolding → holdingPerspective', () => {
        expect(getValuePerspectiveForRole('activeHolding')).toBe('holdingPerspective');
    });
    test('soldRecord → historicalSalePerspective', () => {
        expect(getValuePerspectiveForRole('soldRecord')).toBe('historicalSalePerspective');
    });
    test('rôles trash → noPrimarySignal', () => {
        expect(getValuePerspectiveForRole('trashedHolding')).toBe('noPrimarySignal');
        expect(getValuePerspectiveForRole('trashedWish')).toBe('noPrimarySignal');
        expect(getValuePerspectiveForRole('trashedSale')).toBe('noPrimarySignal');
    });
    test('invalid → invalid', () => {
        expect(getValuePerspectiveForRole('invalid')).toBe('invalid');
    });
});

describe('normalizePriceInputToTotal', () => {
    test('Cas A — basis unit : amount × quantity', () => {
        expect(normalizePriceInputToTotal({ amount: 24, basis: 'unit', quantity: 5 })).toBe(120);
    });
    test('Cas B — basis lotTotal : amount inchangé', () => {
        expect(normalizePriceInputToTotal({ amount: 120, basis: 'lotTotal', quantity: 5 })).toBe(120);
    });
    test('Cas O — quantity 1 : unit == lotTotal', () => {
        expect(normalizePriceInputToTotal({ amount: 24, basis: 'unit', quantity: 1 })).toBe(24);
        expect(normalizePriceInputToTotal({ amount: 24, basis: 'lotTotal', quantity: 1 })).toBe(24);
    });
    test('amount null → null', () => {
        expect(normalizePriceInputToTotal({ amount: null, basis: 'unit', quantity: 5 })).toBeNull();
    });
    test('Cas M — amount 0 est une vraie valeur (basis unit)', () => {
        expect(normalizePriceInputToTotal({ amount: 0, basis: 'unit', quantity: 5 })).toBe(0);
    });
    test('basis absent alors qu\'un montant est fourni → null (ne pas deviner)', () => {
        expect(normalizePriceInputToTotal({ amount: 24, basis: null, quantity: 5 })).toBeNull();
    });
    test('Cas P — quantity invalide → null', () => {
        expect(normalizePriceInputToTotal({ amount: 24, basis: 'unit', quantity: 0 })).toBeNull();
        expect(normalizePriceInputToTotal({ amount: 24, basis: 'unit', quantity: -3 })).toBeNull();
        expect(normalizePriceInputToTotal({ amount: 24, basis: 'unit', quantity: 2.5 })).toBeNull();
    });
    test('amount non fini → null', () => {
        expect(normalizePriceInputToTotal({ amount: NaN, basis: 'unit', quantity: 5 })).toBeNull();
        expect(normalizePriceInputToTotal({ amount: Infinity, basis: 'lotTotal', quantity: 5 })).toBeNull();
    });
});

describe('deriveUnitTotalPriceBreakdown', () => {
    test('Cas C — total 120, basis unit, quantity 5 → unit 24 / total 120', () => {
        expect(deriveUnitTotalPriceBreakdown({ totalAmount: 120, basis: 'unit', quantity: 5 })).toEqual({
            unitAmount: 24, totalAmount: 120, basis: 'unit', quantity: 5,
        });
    });
    test('Cas D — total 120, basis lotTotal, quantity 5 → unit 24 / total 120, basis conservé', () => {
        expect(deriveUnitTotalPriceBreakdown({ totalAmount: 120, basis: 'lotTotal', quantity: 5 })).toEqual({
            unitAmount: 24, totalAmount: 120, basis: 'lotTotal', quantity: 5,
        });
    });
    test('Cas O — quantity 1 : unit == total', () => {
        expect(deriveUnitTotalPriceBreakdown({ totalAmount: 24, basis: 'unit', quantity: 1 })).toEqual({
            unitAmount: 24, totalAmount: 24, basis: 'unit', quantity: 1,
        });
    });
    test('total null → null', () => {
        expect(deriveUnitTotalPriceBreakdown({ totalAmount: null, basis: 'unit', quantity: 5 })).toBeNull();
    });
    test('total 0 valide → unit 0 / total 0', () => {
        expect(deriveUnitTotalPriceBreakdown({ totalAmount: 0, basis: 'lotTotal', quantity: 5 })).toEqual({
            unitAmount: 0, totalAmount: 0, basis: 'lotTotal', quantity: 5,
        });
    });
    test('basis absent avec prix non-null → null (ambigu)', () => {
        expect(deriveUnitTotalPriceBreakdown({ totalAmount: 120, basis: null, quantity: 5 })).toBeNull();
    });
    test('quantity invalide → null', () => {
        expect(deriveUnitTotalPriceBreakdown({ totalAmount: 120, basis: 'unit', quantity: 0 })).toBeNull();
    });
});

describe('deriveMeltValueBreakdown', () => {
    test('unit 54.52, quantity 5 → total 272.60', () => {
        const result = deriveMeltValueBreakdown({ unitMeltValue: 54.52, quantity: 5 });
        expect(result).not.toBeNull();
        expect(result!.unitMeltValue).toBe(54.52);
        expect(result!.totalMeltValue).toBeCloseTo(272.6, 6);
        expect(result!.quantity).toBe(5);
    });
    test('unit null → null', () => {
        expect(deriveMeltValueBreakdown({ unitMeltValue: null, quantity: 5 })).toBeNull();
    });
    test('Cas N — unit 0 → total 0 (pas d\'erreur, division gérée ailleurs)', () => {
        expect(deriveMeltValueBreakdown({ unitMeltValue: 0, quantity: 5 })).toEqual({
            unitMeltValue: 0, totalMeltValue: 0, quantity: 5,
        });
    });
    test('quantity invalide → null', () => {
        expect(deriveMeltValueBreakdown({ unitMeltValue: 54.52, quantity: -1 })).toBeNull();
    });
});

describe('deriveObservedPremiumBreakdown', () => {
    test('Cas E — observé 340 (basis unit), melt unit 54.52, qty 5 → prime positive cohérente', () => {
        const b = deriveObservedPremiumBreakdown({
            observedTotalPrice: 340, observedPriceBasis: 'unit', unitMeltValue: 54.52, quantity: 5,
        });
        expect(b).not.toBeNull();
        expect(b!.unitObservedPrice).toBe(68);
        expect(b!.totalObservedPrice).toBe(340);
        expect(b!.unitMeltValue).toBe(54.52);
        expect(b!.totalMeltValue).toBeCloseTo(272.6, 6);
        expect(b!.unitPremiumAmount).toBeCloseTo(13.48, 6);
        expect(b!.totalPremiumAmount).toBeCloseTo(67.4, 6);
        // percent unité == percent total sur batch homogène
        expect(b!.unitPremiumPercent).toBeCloseTo(b!.totalPremiumPercent!, 10);
        expect(b!.totalPremiumPercent!).toBeGreaterThan(0.02); // > 2 %
    });

    test('Cas F — observé 68 (basis lotTotal), melt unit 54.52, qty 5 → prime négative', () => {
        const b = deriveObservedPremiumBreakdown({
            observedTotalPrice: 68, observedPriceBasis: 'lotTotal', unitMeltValue: 54.52, quantity: 5,
        });
        expect(b).not.toBeNull();
        expect(b!.unitObservedPrice).toBeCloseTo(13.6, 6);
        expect(b!.totalObservedPrice).toBe(68);
        expect(b!.unitPremiumAmount).toBeCloseTo(-40.92, 6);
        expect(b!.totalPremiumAmount).toBeCloseTo(-204.6, 6);
        expect(b!.totalPremiumPercent!).toBeLessThan(0);
    });

    test('Cas J — basis absent → null (pas de prime calculée)', () => {
        expect(deriveObservedPremiumBreakdown({
            observedTotalPrice: 340, observedPriceBasis: null, unitMeltValue: 54.52, quantity: 5,
        })).toBeNull();
    });

    test('Cas K — prix absent → null', () => {
        expect(deriveObservedPremiumBreakdown({
            observedTotalPrice: null, observedPriceBasis: 'unit', unitMeltValue: 54.52, quantity: 5,
        })).toBeNull();
    });

    test('Cas L — melt absent → null', () => {
        expect(deriveObservedPremiumBreakdown({
            observedTotalPrice: 340, observedPriceBasis: 'unit', unitMeltValue: null, quantity: 5,
        })).toBeNull();
    });

    test('Cas M — prix 0 : prime négative valide, 0 ≠ null', () => {
        const b = deriveObservedPremiumBreakdown({
            observedTotalPrice: 0, observedPriceBasis: 'lotTotal', unitMeltValue: 20, quantity: 5,
        });
        expect(b).not.toBeNull();
        expect(b!.totalObservedPrice).toBe(0);
        expect(b!.totalPremiumAmount).toBe(-100); // 0 - (20×5)
        expect(b!.totalPremiumPercent).toBe(-1);
    });

    test('Cas N — melt 0 : montants définis, pourcentages null (pas de division)', () => {
        const b = deriveObservedPremiumBreakdown({
            observedTotalPrice: 50, observedPriceBasis: 'lotTotal', unitMeltValue: 0, quantity: 5,
        });
        expect(b).not.toBeNull();
        expect(b!.totalPremiumAmount).toBe(50);
        expect(b!.unitPremiumPercent).toBeNull();
        expect(b!.totalPremiumPercent).toBeNull();
    });

    test('Cas P — quantity invalide → null', () => {
        expect(deriveObservedPremiumBreakdown({
            observedTotalPrice: 340, observedPriceBasis: 'unit', unitMeltValue: 54.52, quantity: 0,
        })).toBeNull();
    });
});

describe('derivePremiumBreakdown — cohérence de référentiel', () => {
    test('quantités divergentes entre price et melt → null', () => {
        const priceBreakdown = deriveUnitTotalPriceBreakdown({ totalAmount: 120, basis: 'unit', quantity: 5 });
        const meltBreakdown = deriveMeltValueBreakdown({ unitMeltValue: 20, quantity: 4 });
        expect(derivePremiumBreakdown({ priceBreakdown, meltBreakdown })).toBeNull();
    });
    test('un breakdown null → null', () => {
        const meltBreakdown = deriveMeltValueBreakdown({ unitMeltValue: 20, quantity: 5 });
        expect(derivePremiumBreakdown({ priceBreakdown: null, meltBreakdown })).toBeNull();
    });
});

describe('getPremiumSignal', () => {
    test('Cas H — prime négative → buyOpportunity', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 99, observedPriceBasis: 'lotTotal', unitMeltValue: 100, quantity: 1,
        })).toBe('buyOpportunity');
    });

    test('Cas F — prime fortement négative → buyOpportunity', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 68, observedPriceBasis: 'lotTotal', unitMeltValue: 54.52, quantity: 5,
        })).toBe('buyOpportunity');
    });

    test('Cas G — prime +1 % → nearMeltOpportunity', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 101, observedPriceBasis: 'lotTotal', unitMeltValue: 100, quantity: 1,
        })).toBe('nearMeltOpportunity');
    });

    test('prime exactement 0 % → nearMeltOpportunity', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 100, observedPriceBasis: 'lotTotal', unitMeltValue: 100, quantity: 1,
        })).toBe('nearMeltOpportunity');
    });

    test('prime exactement +2 % → nearMeltOpportunity (borne incluse)', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 102, observedPriceBasis: 'lotTotal', unitMeltValue: 100, quantity: 1,
        })).toBe('nearMeltOpportunity');
    });

    test('Cas I — prime +3 % → neutral', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 103, observedPriceBasis: 'lotTotal', unitMeltValue: 100, quantity: 1,
        })).toBe('neutral');
    });

    test('Cas E — prime > +2 % (batch de 5) → neutral', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 340, observedPriceBasis: 'unit', unitMeltValue: 54.52, quantity: 5,
        })).toBe('neutral');
    });

    test('Cas K — prix manquant → unavailable', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: null, observedPriceBasis: 'unit', unitMeltValue: 100, quantity: 5,
        })).toBe('unavailable');
    });

    test('Cas L — melt manquant → unavailable', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 340, observedPriceBasis: 'unit', unitMeltValue: null, quantity: 5,
        })).toBe('unavailable');
    });

    test('Cas J — basis absent (prix présent) → invalid', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 340, observedPriceBasis: null, unitMeltValue: 54.52, quantity: 5,
        })).toBe('invalid');
    });

    test('Cas P — quantity invalide → invalid', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 340, observedPriceBasis: 'unit', unitMeltValue: 54.52, quantity: 0,
        })).toBe('invalid');
    });

    test('Cas N — melt 0 → unavailable (prime non classable, pas de division)', () => {
        expect(getPremiumSignal({
            role: 'wish', observedTotalPrice: 50, observedPriceBasis: 'lotTotal', unitMeltValue: 0, quantity: 5,
        })).toBe('unavailable');
    });

    test('rôle non-wish (activeHolding) → unavailable (pas de signal marché pour cette perspective)', () => {
        expect(getPremiumSignal({
            role: 'activeHolding', observedTotalPrice: 99, observedPriceBasis: 'lotTotal', unitMeltValue: 100, quantity: 1,
        })).toBe('unavailable');
    });

    test('rôle soldRecord → unavailable', () => {
        expect(getPremiumSignal({
            role: 'soldRecord', observedTotalPrice: 99, observedPriceBasis: 'lotTotal', unitMeltValue: 100, quantity: 1,
        })).toBe('unavailable');
    });

    test('rôle trashedWish → unavailable (no primary signal)', () => {
        expect(getPremiumSignal({
            role: 'trashedWish', observedTotalPrice: 99, observedPriceBasis: 'lotTotal', unitMeltValue: 100, quantity: 1,
        })).toBe('unavailable');
    });
});
