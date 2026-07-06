import { getItemValueDisplayModel } from './itemValueDisplaySemantics';
import type { ItemValueDisplayInput } from './itemValueDisplaySemantics';

function makeInput(overrides: Partial<ItemValueDisplayInput> = {}): ItemValueDisplayInput {
    return {
        role: 'activeHolding',
        quantity: 1,
        currency: 'USD',
        unitMeltValue: null,
        purchasePrice: null,
        purchasePriceBasis: null,
        observedPrice: null,
        observedPriceBasis: null,
        soldPrice: null,
        soldPriceBasis: null,
        ...overrides,
    };
}

function section(model: ReturnType<typeof getItemValueDisplayModel>, kind: string) {
    return model.sections.find(s => s.kind === kind)!;
}

describe('getItemValueDisplayModel — activeHolding', () => {
    test('1. quantity 1, purchasePrice + melt → melt/purchase/P&L complets', () => {
        const model = getItemValueDisplayModel(makeInput({
            quantity: 1, unitMeltValue: 24, purchasePrice: 20, purchasePriceBasis: 'unit',
        }));
        expect(section(model, 'melt')).toMatchObject({ unitAmount: 24, totalAmount: 24, completeness: 'complete' });
        expect(section(model, 'purchase')).toMatchObject({ unitAmount: 20, totalAmount: 20, basis: 'unit', completeness: 'complete' });
        expect(section(model, 'unrealizedPnL')).toMatchObject({ unitAmount: 4, totalAmount: 4, signal: 'favorable', completeness: 'complete' });
        expect(model.warnings).toEqual([]);
    });

    test('2. quantity 5, purchase basis unit → unit/total cohérents', () => {
        const model = getItemValueDisplayModel(makeInput({
            quantity: 5, unitMeltValue: 24, purchasePrice: 100, purchasePriceBasis: 'unit',
        }));
        expect(section(model, 'purchase')).toMatchObject({ unitAmount: 20, totalAmount: 100, basis: 'unit' });
        expect(section(model, 'melt')).toMatchObject({ unitAmount: 24, totalAmount: 120 });
    });

    test('3. quantity 5, purchase basis lotTotal → unit/total cohérents', () => {
        const model = getItemValueDisplayModel(makeInput({
            quantity: 5, unitMeltValue: 24, purchasePrice: 100, purchasePriceBasis: 'lotTotal',
        }));
        expect(section(model, 'purchase')).toMatchObject({ unitAmount: 20, totalAmount: 100, basis: 'lotTotal' });
    });

    test('4. purchasePrice manquant → warning missingPurchasePrice, pas de P&L', () => {
        const model = getItemValueDisplayModel(makeInput({ quantity: 5, unitMeltValue: 24 }));
        expect(section(model, 'purchase').completeness).toBe('missingData');
        expect(section(model, 'unrealizedPnL').completeness).toBe('missingData');
        expect(model.warnings).toContain('missingPurchasePrice');
        expect(model.warnings).toContain('incompletePnL');
    });

    test('5. purchasePrice présent mais basis absent → invalid, pas de P&L', () => {
        const model = getItemValueDisplayModel(makeInput({ quantity: 5, unitMeltValue: 24, purchasePrice: 100, purchasePriceBasis: null }));
        expect(section(model, 'purchase').completeness).toBe('invalid');
        expect(section(model, 'unrealizedPnL').completeness).toBe('missingData');
        expect(model.warnings).toContain('missingPriceBasis');
    });

    test('6. melt manquant → warning missingMeltValue, pas de P&L', () => {
        const model = getItemValueDisplayModel(makeInput({ quantity: 5, purchasePrice: 100, purchasePriceBasis: 'lotTotal' }));
        expect(section(model, 'melt').completeness).toBe('missingData');
        expect(section(model, 'unrealizedPnL').completeness).toBe('missingData');
        expect(model.warnings).toContain('missingMeltValue');
    });

    test('7. P&L positif → favorable', () => {
        const model = getItemValueDisplayModel(makeInput({ unitMeltValue: 24, purchasePrice: 20, purchasePriceBasis: 'unit' }));
        expect(section(model, 'unrealizedPnL').signal).toBe('favorable');
        expect(model.primarySignal).toBe('favorable');
    });

    test('8. P&L négatif → unfavorable', () => {
        const model = getItemValueDisplayModel(makeInput({ unitMeltValue: 18, purchasePrice: 20, purchasePriceBasis: 'unit' }));
        expect(section(model, 'unrealizedPnL').signal).toBe('unfavorable');
        expect(model.primarySignal).toBe('unfavorable');
    });

    test('9. P&L zéro → neutral', () => {
        const model = getItemValueDisplayModel(makeInput({ unitMeltValue: 20, purchasePrice: 20, purchasePriceBasis: 'unit' }));
        expect(section(model, 'unrealizedPnL').signal).toBe('neutral');
    });

    test('10. purchasePrice 0 → vraie valeur, section complète', () => {
        const model = getItemValueDisplayModel(makeInput({ quantity: 5, unitMeltValue: 10, purchasePrice: 0, purchasePriceBasis: 'lotTotal' }));
        expect(section(model, 'purchase')).toMatchObject({ unitAmount: 0, totalAmount: 0, completeness: 'complete' });
        expect(section(model, 'unrealizedPnL').totalAmount).toBe(50); // 10×5 − 0
    });

    test('rôle activeHolding n\'expose jamais observed/premium/sold/realizedPnL (notApplicable)', () => {
        const model = getItemValueDisplayModel(makeInput({ unitMeltValue: 24, purchasePrice: 20, purchasePriceBasis: 'unit' }));
        expect(section(model, 'observed').completeness).toBe('notApplicable');
        expect(section(model, 'premium').completeness).toBe('notApplicable');
        expect(section(model, 'sold').completeness).toBe('notApplicable');
        expect(section(model, 'realizedPnL').completeness).toBe('notApplicable');
    });
});

describe('getItemValueDisplayModel — wish', () => {
    test('11. quantity 1 prime positive', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'wish', quantity: 1, unitMeltValue: 100, observedPrice: 110, observedPriceBasis: 'unit',
        }));
        expect(section(model, 'premium')).toMatchObject({ unitAmount: 10, totalAmount: 10, completeness: 'complete' });
        expect(model.primarySignal).toBe('neutral'); // +10% > +2%
    });

    test('12. quantity 5 observed basis unit', () => {
        // observedPrice est toujours le total normalisé stocké (BUSINESS_LOGIC §7) :
        // un prix saisi "68 €/unité" pour 5 unités est stocké à 340, basis='unit'.
        const model = getItemValueDisplayModel(makeInput({
            role: 'wish', quantity: 5, unitMeltValue: 54.52, observedPrice: 340, observedPriceBasis: 'unit',
        }));
        expect(section(model, 'observed')).toMatchObject({ unitAmount: 68, totalAmount: 340, basis: 'unit' });
        expect(section(model, 'premium').totalAmount).toBeCloseTo(340 - 54.52 * 5, 6);
    });

    test('13. quantity 5 observed basis lotTotal', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'wish', quantity: 5, unitMeltValue: 54.52, observedPrice: 68, observedPriceBasis: 'lotTotal',
        }));
        expect(section(model, 'observed')).toMatchObject({ unitAmount: 13.6, totalAmount: 68, basis: 'lotTotal' });
    });

    test('14. observedPrice manquant → warning missingObservedPrice', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'wish', quantity: 5, unitMeltValue: 54.52 }));
        expect(section(model, 'observed').completeness).toBe('missingData');
        expect(model.warnings).toContain('missingObservedPrice');
        expect(section(model, 'premium').completeness).toBe('missingData');
    });

    test('15. observedPrice présent mais basis absent → invalid/missingPriceBasis', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'wish', quantity: 5, unitMeltValue: 54.52, observedPrice: 340, observedPriceBasis: null }));
        expect(section(model, 'observed').completeness).toBe('invalid');
        expect(section(model, 'premium').completeness).toBe('invalid');
        expect(model.warnings).toContain('missingPriceBasis');
    });

    test('16. prime négative → buyOpportunity', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'wish', unitMeltValue: 100, observedPrice: 99, observedPriceBasis: 'unit' }));
        expect(section(model, 'premium').signal).toBe('buyOpportunity');
        expect(model.primarySignal).toBe('buyOpportunity');
    });

    test('17. prime 0 % → nearMeltOpportunity', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'wish', unitMeltValue: 100, observedPrice: 100, observedPriceBasis: 'unit' }));
        expect(section(model, 'premium').signal).toBe('nearMeltOpportunity');
    });

    test('18. prime +2 % (borne incluse) → nearMeltOpportunity', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'wish', unitMeltValue: 100, observedPrice: 102, observedPriceBasis: 'unit' }));
        expect(section(model, 'premium').signal).toBe('nearMeltOpportunity');
    });

    test('19. prime > +2 % → neutral', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'wish', unitMeltValue: 100, observedPrice: 103, observedPriceBasis: 'unit' }));
        expect(section(model, 'premium').signal).toBe('neutral');
    });

    test('20. melt manquant → prime unavailable + warning', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'wish', observedPrice: 100, observedPriceBasis: 'unit' }));
        expect(section(model, 'melt').completeness).toBe('missingData');
        expect(section(model, 'premium').signal).toBe('unavailable');
        expect(model.warnings).toContain('missingMeltValue');
    });

    test('21. observedPrice 0 → vraie valeur, section complète', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'wish', quantity: 5, unitMeltValue: 20, observedPrice: 0, observedPriceBasis: 'lotTotal' }));
        expect(section(model, 'observed')).toMatchObject({ unitAmount: 0, totalAmount: 0, completeness: 'complete' });
        expect(section(model, 'premium').signal).toBe('buyOpportunity');
    });

    test('rôle wish n\'expose jamais purchase/unrealizedPnL/sold/realizedPnL (notApplicable)', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'wish', unitMeltValue: 100, observedPrice: 99, observedPriceBasis: 'unit' }));
        expect(section(model, 'purchase').completeness).toBe('notApplicable');
        expect(section(model, 'unrealizedPnL').completeness).toBe('notApplicable');
        expect(section(model, 'sold').completeness).toBe('notApplicable');
        expect(section(model, 'realizedPnL').completeness).toBe('notApplicable');
    });
});

describe('getItemValueDisplayModel — soldRecord', () => {
    test('22. quantity 1 gain réalisé', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'soldRecord', quantity: 1, purchasePrice: 20, purchasePriceBasis: 'unit', soldPrice: 25, soldPriceBasis: 'unit',
        }));
        expect(section(model, 'realizedPnL')).toMatchObject({ unitAmount: 5, totalAmount: 5, signal: 'favorable', completeness: 'complete' });
    });

    test('23. quantity 5 sold basis unit', () => {
        // soldPrice est le total normalisé stocké : "26 €/unité" pour 5 unités → 130 stocké.
        const model = getItemValueDisplayModel(makeInput({
            role: 'soldRecord', quantity: 5, purchasePrice: 100, purchasePriceBasis: 'lotTotal', soldPrice: 130, soldPriceBasis: 'unit',
        }));
        expect(section(model, 'sold')).toMatchObject({ unitAmount: 26, totalAmount: 130, basis: 'unit' });
    });

    test('24. quantity 5 sold basis lotTotal', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'soldRecord', quantity: 5, purchasePrice: 100, purchasePriceBasis: 'lotTotal', soldPrice: 130, soldPriceBasis: 'lotTotal',
        }));
        expect(section(model, 'sold')).toMatchObject({ unitAmount: 26, totalAmount: 130, basis: 'lotTotal' });
        expect(section(model, 'realizedPnL').totalAmount).toBe(30);
    });

    test('25. realized P&L positif → favorable', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'soldRecord', purchasePrice: 20, purchasePriceBasis: 'unit', soldPrice: 30, soldPriceBasis: 'unit',
        }));
        expect(section(model, 'realizedPnL').signal).toBe('favorable');
        expect(model.primarySignal).toBe('favorable');
    });

    test('26. realized P&L négatif → unfavorable', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'soldRecord', purchasePrice: 20, purchasePriceBasis: 'unit', soldPrice: 15, soldPriceBasis: 'unit',
        }));
        expect(section(model, 'realizedPnL').signal).toBe('unfavorable');
    });

    test('27. purchasePrice (cost basis) manquant → warning missingPurchasePrice, pas de realized P&L', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'soldRecord', soldPrice: 30, soldPriceBasis: 'unit' }));
        expect(section(model, 'purchase').completeness).toBe('missingData');
        expect(section(model, 'realizedPnL').completeness).toBe('missingData');
        expect(model.warnings).toContain('missingPurchasePrice');
    });

    test('28. soldPrice manquant → warning missingSoldPrice', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'soldRecord', purchasePrice: 20, purchasePriceBasis: 'unit' }));
        expect(section(model, 'sold').completeness).toBe('missingData');
        expect(model.warnings).toContain('missingSoldPrice');
    });

    test('29. soldPrice 0 → vraie valeur, section complète', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'soldRecord', quantity: 3, purchasePrice: 30, purchasePriceBasis: 'lotTotal', soldPrice: 0, soldPriceBasis: 'lotTotal',
        }));
        expect(section(model, 'sold')).toMatchObject({ unitAmount: 0, totalAmount: 0, completeness: 'complete' });
        expect(section(model, 'realizedPnL').totalAmount).toBe(-30);
    });

    test('soldRecord n\'expose jamais melt/observed/premium/unrealizedPnL (melt live volontairement exclu — NBS §5 : une vente passée ne s\'interprète pas avec le spot actuel ; un futur sale-time snapshot serait un ValueKind distinct)', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'soldRecord', purchasePrice: 20, purchasePriceBasis: 'unit', soldPrice: 25, soldPriceBasis: 'unit' }));
        expect(section(model, 'melt').completeness).toBe('notApplicable');
        expect(section(model, 'observed').completeness).toBe('notApplicable');
        expect(section(model, 'premium').completeness).toBe('notApplicable');
        expect(section(model, 'unrealizedPnL').completeness).toBe('notApplicable');
    });
});

describe('getItemValueDisplayModel — rôles Trash', () => {
    test('30. trashedHolding → sections historiques (via activeHolding), primarySignal noPrimarySignal, aucun signal de section', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'trashedHolding', unitMeltValue: 24, purchasePrice: 20, purchasePriceBasis: 'unit',
        }));
        expect(model.primarySignal).toBe('noPrimarySignal');
        expect(section(model, 'melt').completeness).toBe('complete'); // historique conservé
        expect(section(model, 'unrealizedPnL').completeness).toBe('complete'); // calculable
        expect(section(model, 'unrealizedPnL').signal).toBeNull(); // mais jamais affiché comme favorable/unfavorable
    });

    test('31. trashedWish → sections historiques (via wish), primarySignal noPrimarySignal, jamais buyOpportunity affiché', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'trashedWish', unitMeltValue: 100, observedPrice: 99, observedPriceBasis: 'unit',
        }));
        expect(model.primarySignal).toBe('noPrimarySignal');
        expect(section(model, 'premium').completeness).toBe('complete');
        expect(section(model, 'premium').signal).toBeNull(); // serait 'buyOpportunity' hors Trash
    });

    test('32. trashedSale → sections historiques (via soldRecord), primarySignal noPrimarySignal', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'trashedSale', purchasePrice: 20, purchasePriceBasis: 'unit', soldPrice: 25, soldPriceBasis: 'unit',
        }));
        expect(model.primarySignal).toBe('noPrimarySignal');
        expect(section(model, 'realizedPnL').completeness).toBe('complete');
        expect(section(model, 'realizedPnL').signal).toBeNull();
        // melt live non applicable pour soldRecord (donc pour trashedSale aussi) — décision, pas un bug (cf. NBS §5).
        expect(section(model, 'melt').completeness).toBe('notApplicable');
    });

    test('33. Trash ne produit jamais de card primary section (aucune métrique agrégée)', () => {
        const model = getItemValueDisplayModel(makeInput({
            role: 'trashedHolding', unitMeltValue: 24, purchasePrice: 20, purchasePriceBasis: 'unit',
        }));
        expect(model.cardPrimarySections).toEqual([]);
    });
});

describe('getItemValueDisplayModel — invalid', () => {
    test('34. quantity 0 → modèle invalid', () => {
        const model = getItemValueDisplayModel(makeInput({ quantity: 0 }));
        expect(model.primarySignal).toBe('invalid');
        expect(model.warnings).toEqual(['invalidQuantity']);
        expect(model.sections).toEqual([]);
    });

    test('35. quantity négative → modèle invalid', () => {
        const model = getItemValueDisplayModel(makeInput({ quantity: -3 }));
        expect(model.primarySignal).toBe('invalid');
        expect(model.warnings).toEqual(['invalidQuantity']);
    });

    test('36. role invalid → modèle invalid, warning invalidReference', () => {
        const model = getItemValueDisplayModel(makeInput({ role: 'invalid', quantity: 3 }));
        expect(model.primarySignal).toBe('invalid');
        expect(model.warnings).toEqual(['invalidReference']);
        expect(model.sections).toEqual([]);
    });

    test('37. basis absent + prix présent (quantity > 1) → jamais de calcul silencieux, sur les trois rôles', () => {
        const active = getItemValueDisplayModel(makeInput({ quantity: 5, purchasePrice: 100, purchasePriceBasis: null }));
        expect(section(active, 'purchase').completeness).toBe('invalid');
        const wish = getItemValueDisplayModel(makeInput({ role: 'wish', quantity: 5, observedPrice: 100, observedPriceBasis: null }));
        expect(section(wish, 'observed').completeness).toBe('invalid');
        const sold = getItemValueDisplayModel(makeInput({ role: 'soldRecord', quantity: 5, soldPrice: 100, soldPriceBasis: null }));
        expect(section(sold, 'sold').completeness).toBe('invalid');
    });
});

describe('getItemValueDisplayModel — hints card/detail', () => {
    test('38. quantity 1 → shouldShowUnitAndTotal false, primaryAmountKind unit', () => {
        const model = getItemValueDisplayModel(makeInput({ quantity: 1, unitMeltValue: 24, purchasePrice: 20, purchasePriceBasis: 'unit' }));
        expect(model.isGroupedBatch).toBe(false);
        expect(model.shouldShowUnitAndTotal).toBe(false);
        expect(model.primaryAmountKind).toBe('unit');
    });

    test('39. quantity > 1 → shouldShowUnitAndTotal true, primaryAmountKind total', () => {
        const model = getItemValueDisplayModel(makeInput({ quantity: 5, unitMeltValue: 24, purchasePrice: 100, purchasePriceBasis: 'unit' }));
        expect(model.isGroupedBatch).toBe(true);
        expect(model.shouldShowUnitAndTotal).toBe(true);
        expect(model.primaryAmountKind).toBe('total');
    });

    test('40. card primary section = section héros du rôle (melt pour active, observed+premium pour wish, sold pour soldRecord)', () => {
        const active = getItemValueDisplayModel(makeInput({ quantity: 5, unitMeltValue: 24, purchasePrice: 100, purchasePriceBasis: 'unit' }));
        expect(active.primarySectionKind).toBe('melt');
        expect(active.cardPrimarySections).toEqual(['melt']);

        const wish = getItemValueDisplayModel(makeInput({ role: 'wish', quantity: 5, unitMeltValue: 54.52, observedPrice: 340, observedPriceBasis: 'unit' }));
        expect(wish.primarySectionKind).toBe('observed');
        expect(wish.cardPrimarySections).toEqual(['observed', 'premium']);

        const sold = getItemValueDisplayModel(makeInput({ role: 'soldRecord', quantity: 5, purchasePrice: 100, purchasePriceBasis: 'unit', soldPrice: 130, soldPriceBasis: 'unit' }));
        expect(sold.primarySectionKind).toBe('sold');
        expect(sold.cardPrimarySections).toEqual(['sold']);
    });

    test('detailSections exclut les kinds notApplicable', () => {
        const model = getItemValueDisplayModel(makeInput({ unitMeltValue: 24, purchasePrice: 20, purchasePriceBasis: 'unit' }));
        expect(model.detailSections).toEqual(['melt', 'purchase', 'unrealizedPnL']);
    });
});
