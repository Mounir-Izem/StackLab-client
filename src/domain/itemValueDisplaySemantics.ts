// Couche centrale d'affichage des valeurs d'un item (Lot C.1). Compose les
// briques pures existantes (itemSemantics, valueSemantics, lotUnitValueSemantics)
// en un modèle unique que les écrans (Lots E/F/G) consommeront — sans jamais
// recalculer, réinterpréter ou décider eux-mêmes du référentiel unité/total,
// des permissions par rôle, ou des signaux.
//
// Ce module ne connaît ni la DB, ni les services, ni React, ni les styles, ni
// l'i18n. Il ne convertit aucune devise : tous les montants reçus (prix, melt)
// doivent déjà être exprimés dans la même devise d'affichage (même convention
// que lotUnitValueSemantics — la conversion reste à la charge de l'appelant via
// valueSemantics.convertCurrencyAmount()).
//
// Convention de pourcentage : ratio (0.2 = +20 %, -0.1 = -10 %), jamais des
// points de pourcentage — identique à valueSemantics et lotUnitValueSemantics.

import type { Currency } from '../types/settings.types';
import type { PriceBasis } from '../types/item.types';
import type { BusinessItemRole } from './itemSemantics';
import { isTrashRole } from './itemSemantics';
import { canShowValue, getPrimaryValueKind } from './valueSemantics';
import type { ValueKind } from './valueSemantics';
import {
    isValidQuantity,
    deriveUnitTotalPriceBreakdown,
    deriveMeltValueBreakdown,
    deriveObservedPremiumBreakdown,
    deriveComparableDelta,
    getPremiumSignal,
} from './lotUnitValueSemantics';
import type { PriceBreakdown, MeltBreakdown } from './lotUnitValueSemantics';

export type ValueDisplaySectionKind =
    | 'melt' | 'purchase' | 'observed' | 'premium' | 'unrealizedPnL' | 'sold' | 'realizedPnL';

export type ValueDisplayCompleteness = 'complete' | 'missingData' | 'notApplicable' | 'invalid';

export type ValueDisplaySignal =
    | 'favorable' | 'unfavorable' | 'neutral'
    | 'buyOpportunity' | 'nearMeltOpportunity'
    | 'unavailable' | 'invalid' | 'noPrimarySignal';

export type ValueDisplayWarning =
    | 'missingPurchasePrice' | 'missingObservedPrice' | 'missingSoldPrice'
    | 'missingMeltValue' | 'missingPriceBasis' | 'invalidQuantity'
    | 'invalidReference' | 'incompletePnL';

export type ValueDisplaySection = {
    kind: ValueDisplaySectionKind;
    unitAmount: number | null;
    totalAmount: number | null;
    currency: Currency;
    basis: PriceBasis | null;
    // ratio, jamais des points de pourcentage. Uniquement significatif pour
    // premium/unrealizedPnL/realizedPnL — null pour les valeurs brutes.
    percent: number | null;
    // Uniquement significatif pour premium/unrealizedPnL/realizedPnL — null
    // pour melt/purchase/observed/sold (une valeur brute n'est pas un signal).
    signal: ValueDisplaySignal | null;
    completeness: ValueDisplayCompleteness;
};

export type ItemValueDisplayModel = {
    role: BusinessItemRole;
    quantity: number;
    currency: Currency;
    // quantity > 1 : l'app doit raisonner "lot ET unité" (BUSINESS_LOGIC §7b).
    isGroupedBatch: boolean;
    // Redondant avec isGroupedBatch aujourd'hui (les deux = quantity > 1) —
    // conservé comme hint distinct pour ne pas coupler la sémantique "c'est un
    // batch" à la décision d'affichage "montrer les deux niveaux".
    shouldShowUnitAndTotal: boolean;
    // Quel niveau une card doit préférer par section (jamais un layout, juste
    // un hint) — 'unit' et 'total' sont la même valeur si quantity === 1.
    primaryAmountKind: 'unit' | 'total';
    // Section "héros" du rôle (melt pour activeHolding, observed pour wish,
    // sold pour soldRecord, aucune pour trash/invalid) — dérivé de
    // valueSemantics.getPrimaryValueKind(), jamais redéfini ici.
    primarySectionKind: ValueDisplaySectionKind | null;
    // Toujours les 7 kinds, dans le même ordre — 'notApplicable' pour ceux que
    // ce rôle n'autorise pas (BUSINESS_LOGIC §5 / valueSemantics.getValuePermissions).
    sections: ValueDisplaySection[];
    // Sous-ensemble de sections.kind à afficher en avant sur une card (héros +
    // prime pour wish) — vide pour trash (aucune métrique agrégée).
    cardPrimarySections: ValueDisplaySectionKind[];
    // Sous-ensemble de sections.kind réellement exploitables en détail
    // (completeness !== 'notApplicable').
    detailSections: ValueDisplaySectionKind[];
    warnings: ValueDisplayWarning[];
    // Signal unique "principal" de l'item pour ce rôle — toujours
    // 'noPrimarySignal' pour les rôles trash, jamais un signal hérité du rôle
    // d'origine (BUSINESS_LOGIC §13 : aucun nouveau signal principal en Trash).
    primarySignal: ValueDisplaySignal;
};

export type ItemValueDisplayInput = {
    role: BusinessItemRole;
    quantity: number;
    currency: Currency;
    // Valeur fonte d'UNE unité, déjà en devise d'affichage — jamais un total,
    // jamais un nom ambigu type "meltValue" sans préciser unit/total.
    unitMeltValue: number | null;
    purchasePrice: number | null;
    purchasePriceBasis: PriceBasis | null;
    observedPrice: number | null;
    observedPriceBasis: PriceBasis | null;
    soldPrice: number | null;
    soldPriceBasis: PriceBasis | null;
};

const ALL_KINDS: ValueDisplaySectionKind[] = ['melt', 'purchase', 'observed', 'premium', 'unrealizedPnL', 'sold', 'realizedPnL'];

const KIND_TO_VALUE_KIND: Record<ValueDisplaySectionKind, ValueKind> = {
    melt: 'meltValue',
    purchase: 'purchasePrice',
    observed: 'observedPrice',
    premium: 'observedPremium',
    unrealizedPnL: 'unrealizedPnL',
    sold: 'soldPrice',
    realizedPnL: 'realizedPnL',
};

const VALUE_KIND_TO_KIND: Record<ValueKind, ValueDisplaySectionKind> = {
    meltValue: 'melt',
    purchasePrice: 'purchase',
    observedPrice: 'observed',
    observedPremium: 'premium',
    unrealizedPnL: 'unrealizedPnL',
    soldPrice: 'sold',
    realizedPnL: 'realizedPnL',
};

// Rôle "d'origine" utilisé uniquement pour déterminer QUELLES sections sont
// pertinentes pour un objet en Trash (affichage historique) — jamais pour
// produire un signal (toujours neutralisé, voir plus bas). Un objet
// trashedWish reste conceptuellement un souhait dans son historique.
function gatingRoleFor(role: BusinessItemRole): BusinessItemRole {
    if (role === 'trashedHolding') return 'activeHolding';
    if (role === 'trashedWish') return 'wish';
    if (role === 'trashedSale') return 'soldRecord';
    return role;
}

function emptySection(kind: ValueDisplaySectionKind, currency: Currency, completeness: ValueDisplayCompleteness, basis: PriceBasis | null = null): ValueDisplaySection {
    return { kind, unitAmount: null, totalAmount: null, currency, basis, percent: null, signal: null, completeness };
}

function invalidModel(role: BusinessItemRole, quantity: number, currency: Currency, warnings: ValueDisplayWarning[]): ItemValueDisplayModel {
    return {
        role, quantity, currency,
        isGroupedBatch: false, shouldShowUnitAndTotal: false, primaryAmountKind: 'unit',
        primarySectionKind: null, sections: [], cardPrimarySections: [], detailSections: [],
        warnings, primarySignal: 'invalid',
    };
}

function priceSection(
    kind: ValueDisplaySectionKind, gatingRole: BusinessItemRole,
    rawPrice: number | null, basis: PriceBasis | null, breakdown: PriceBreakdown | null,
    currency: Currency,
): ValueDisplaySection {
    if (!canShowValue(gatingRole, KIND_TO_VALUE_KIND[kind])) return emptySection(kind, currency, 'notApplicable');
    if (rawPrice == null) return emptySection(kind, currency, 'missingData');
    if (basis == null) return emptySection(kind, currency, 'invalid');
    if (breakdown == null) return emptySection(kind, currency, 'invalid', basis);
    return { kind, unitAmount: breakdown.unitAmount, totalAmount: breakdown.totalAmount, currency, basis, percent: null, signal: null, completeness: 'complete' };
}

function meltSection(gatingRole: BusinessItemRole, unitMeltValue: number | null, breakdown: MeltBreakdown | null, currency: Currency): ValueDisplaySection {
    if (!canShowValue(gatingRole, 'meltValue')) return emptySection('melt', currency, 'notApplicable');
    if (unitMeltValue == null) return emptySection('melt', currency, 'missingData');
    if (breakdown == null) return emptySection('melt', currency, 'invalid');
    return { kind: 'melt', unitAmount: breakdown.unitMeltValue, totalAmount: breakdown.totalMeltValue, currency, basis: null, percent: null, signal: null, completeness: 'complete' };
}

function mapPremiumSignal(signal: 'buyOpportunity' | 'nearMeltOpportunity' | 'neutral' | 'unavailable' | 'invalid'): ValueDisplaySignal {
    return signal; // même vocabulaire — PremiumSignal est un sous-ensemble de ValueDisplaySignal
}

function premiumSection(
    gatingRole: BusinessItemRole, observedPrice: number | null, observedPriceBasis: PriceBasis | null,
    unitMeltValue: number | null, quantity: number, currency: Currency,
): ValueDisplaySection {
    if (!canShowValue(gatingRole, 'observedPremium')) return emptySection('premium', currency, 'notApplicable');

    const signal = mapPremiumSignal(getPremiumSignal({ role: gatingRole, observedTotalPrice: observedPrice, observedPriceBasis, unitMeltValue, quantity }));
    const breakdown = deriveObservedPremiumBreakdown({ observedTotalPrice: observedPrice, observedPriceBasis, unitMeltValue, quantity });

    if (breakdown == null) {
        // Prix présent mais base absente est un référentiel cassé, pas une
        // simple absence de donnée — les deux autres cas (prix/melt manquants)
        // sont déjà signalés par leurs propres sections (observed/melt).
        const completeness: ValueDisplayCompleteness = observedPrice != null && observedPriceBasis == null ? 'invalid' : 'missingData';
        return { kind: 'premium', unitAmount: null, totalAmount: null, currency, basis: observedPriceBasis, percent: null, signal, completeness };
    }
    return {
        kind: 'premium', unitAmount: breakdown.unitPremiumAmount, totalAmount: breakdown.totalPremiumAmount,
        currency, basis: observedPriceBasis, percent: breakdown.totalPremiumPercent, signal, completeness: 'complete',
    };
}

function deltaSection(
    kind: 'unrealizedPnL' | 'realizedPnL', gatingRole: BusinessItemRole,
    base: PriceBreakdown | null, compared: PriceBreakdown | MeltBreakdown | null, currency: Currency,
): ValueDisplaySection {
    if (!canShowValue(gatingRole, KIND_TO_VALUE_KIND[kind])) return emptySection(kind, currency, 'notApplicable');
    if (base == null || compared == null) return emptySection(kind, currency, 'missingData');
    const delta = deriveComparableDelta({ base, compared });
    if (delta == null) return emptySection(kind, currency, 'invalid');
    const signal: ValueDisplaySignal = delta.totalAmount > 0 ? 'favorable' : delta.totalAmount < 0 ? 'unfavorable' : 'neutral';
    return { kind, unitAmount: delta.unitAmount, totalAmount: delta.totalAmount, currency, basis: null, percent: delta.totalPercent, signal, completeness: 'complete' };
}

function collectWarnings(sections: ValueDisplaySection[]): ValueDisplayWarning[] {
    const warnings: ValueDisplayWarning[] = [];
    for (const s of sections) {
        if (s.completeness === 'notApplicable') continue;
        if (s.completeness === 'missingData') {
            if (s.kind === 'melt') warnings.push('missingMeltValue');
            if (s.kind === 'purchase') warnings.push('missingPurchasePrice');
            if (s.kind === 'observed') warnings.push('missingObservedPrice');
            if (s.kind === 'sold') warnings.push('missingSoldPrice');
            if (s.kind === 'unrealizedPnL' || s.kind === 'realizedPnL') warnings.push('incompletePnL');
        }
        if (s.completeness === 'invalid') {
            if (s.kind === 'purchase' || s.kind === 'observed' || s.kind === 'sold' || s.kind === 'premium') warnings.push('missingPriceBasis');
            if (s.kind === 'unrealizedPnL' || s.kind === 'realizedPnL' || s.kind === 'melt') warnings.push('invalidReference');
        }
    }
    return Array.from(new Set(warnings));
}

export function getItemValueDisplayModel(input: ItemValueDisplayInput): ItemValueDisplayModel {
    const { role, quantity, currency, unitMeltValue, purchasePrice, purchasePriceBasis, observedPrice, observedPriceBasis, soldPrice, soldPriceBasis } = input;

    if (role === 'invalid') return invalidModel(role, quantity, currency, ['invalidReference']);
    if (!isValidQuantity(quantity)) return invalidModel(role, quantity, currency, ['invalidQuantity']);

    const gatingRole = gatingRoleFor(role);

    const meltBreakdown = deriveMeltValueBreakdown({ unitMeltValue, quantity });
    const purchaseBreakdown = deriveUnitTotalPriceBreakdown({ totalAmount: purchasePrice, basis: purchasePriceBasis, quantity });
    const observedBreakdown = deriveUnitTotalPriceBreakdown({ totalAmount: observedPrice, basis: observedPriceBasis, quantity });
    const soldBreakdown = deriveUnitTotalPriceBreakdown({ totalAmount: soldPrice, basis: soldPriceBasis, quantity });

    const sectionByKind: Record<ValueDisplaySectionKind, ValueDisplaySection> = {
        melt: meltSection(gatingRole, unitMeltValue, meltBreakdown, currency),
        purchase: priceSection('purchase', gatingRole, purchasePrice, purchasePriceBasis, purchaseBreakdown, currency),
        observed: priceSection('observed', gatingRole, observedPrice, observedPriceBasis, observedBreakdown, currency),
        premium: premiumSection(gatingRole, observedPrice, observedPriceBasis, unitMeltValue, quantity, currency),
        unrealizedPnL: deltaSection('unrealizedPnL', gatingRole, purchaseBreakdown, meltBreakdown, currency),
        sold: priceSection('sold', gatingRole, soldPrice, soldPriceBasis, soldBreakdown, currency),
        realizedPnL: deltaSection('realizedPnL', gatingRole, purchaseBreakdown, soldBreakdown, currency),
    };

    // Trash : conserve l'historique (sections calculées comme le rôle
    // d'origine ci-dessus) mais ne produit plus AUCUN signal — jamais un
    // buyOpportunity/favorable hérité affiché sur un objet supprimé.
    if (isTrashRole(role)) {
        for (const kind of ALL_KINDS) sectionByKind[kind] = { ...sectionByKind[kind], signal: null };
    }

    const sections = ALL_KINDS.map(k => sectionByKind[k]);
    const detailSections = sections.filter(s => s.completeness !== 'notApplicable').map(s => s.kind);

    const primaryValueKind = getPrimaryValueKind(gatingRole);
    const primarySectionKind = primaryValueKind ? VALUE_KIND_TO_KIND[primaryValueKind] : null;

    const cardPrimarySections: ValueDisplaySectionKind[] = isTrashRole(role) || primarySectionKind == null
        ? []
        : [primarySectionKind, ...(gatingRole === 'wish' && detailSections.includes('premium') ? ['premium' as const] : [])];

    const primarySignal: ValueDisplaySignal = isTrashRole(role)
        ? 'noPrimarySignal'
        : (primarySectionKind === 'melt' ? sectionByKind.unrealizedPnL.signal
            : primarySectionKind === 'observed' ? sectionByKind.premium.signal
                : primarySectionKind === 'sold' ? sectionByKind.realizedPnL.signal
                    : null) ?? 'unavailable';

    return {
        role, quantity, currency,
        isGroupedBatch: quantity > 1,
        shouldShowUnitAndTotal: quantity > 1,
        primaryAmountKind: quantity > 1 ? 'total' : 'unit',
        primarySectionKind,
        sections,
        cardPrimarySections,
        detailSections,
        warnings: collectWarnings(sections),
        primarySignal,
    };
}
