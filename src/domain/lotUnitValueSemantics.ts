// Couche domain pure pour raisonner en unité ET en total (BUSINESS_LOGIC §7b),
// jamais l'un OU l'autre. Empêche les comparaisons croisées total-vs-unité qui
// ont causé le bug Lot 6.1.
//
// Séparation des responsabilités : ce module ne convertit AUCUNE devise. Tous
// les montants reçus (prix, melt) sont supposés déjà exprimés dans la même
// devise d'affichage — la conversion reste la responsabilité de
// valueSemantics.convertCurrencyAmount(), appelée en amont par la couche UI.
// Ici, arithmétique pure du référentiel lot/unité, rien d'autre.
//
// Convention de pourcentage : RATIO (0.2 = +20 %, -0.1 = -10 %), identique à
// valueSemantics.getObservedPremium(). L'affichage multiplie par 100. Ne jamais
// mélanger ratio et points de pourcentage.

import type { PriceBasis } from '../types/item.types';
import type { BusinessItemRole } from './itemSemantics';

// Perspective métier portée par le rôle (NATIVE_BUSINESS_SEMANTICS §3). C'est
// elle qui autorise (ou non) un signal de prime — pas l'écran.
export type ValuePerspective =
    | 'buyerPerspective'            // wish
    | 'holdingPerspective'         // activeHolding
    | 'historicalSalePerspective'  // soldRecord
    | 'noPrimarySignal'            // trashedHolding / trashedWish / trashedSale
    | 'invalid';                   // invalid

export type PriceBreakdown = {
    unitAmount: number;
    totalAmount: number;
    basis: PriceBasis;
    quantity: number;
};

export type MeltBreakdown = {
    unitMeltValue: number;
    totalMeltValue: number;
    quantity: number;
};

export type PremiumBreakdown = {
    unitObservedPrice: number;
    totalObservedPrice: number;
    unitMeltValue: number;
    totalMeltValue: number;
    unitPremiumAmount: number;
    totalPremiumAmount: number;
    // null quand la melt de référence est 0 (division impossible) — le montant
    // reste défini, seul le pourcentage devient indéterminable.
    unitPremiumPercent: number | null;
    totalPremiumPercent: number | null;
};

// Signal de prime Wishlist (BUSINESS_LOGIC §11). Conceptuel : l'UI (Lot E) le
// traduira plus tard en rendu (violet glow/pulse pour buyOpportunity), aucune
// animation ici.
export type PremiumSignal =
    | 'buyOpportunity'        // prime < 0 : opportunité d'achat
    | 'nearMeltOpportunity'   // 0 ≤ prime ≤ +2 %
    | 'neutral'               // prime > +2 % (jamais rouge sans données marché)
    | 'unavailable'           // donnée manquante ou pas de signal pour ce rôle
    | 'invalid';              // référentiel incohérent : basis absent, quantity invalide

// Seuil "near melt" : +2 % exprimé en ratio.
const NEAR_MELT_MAX_RATIO = 0.02;

function isValidQuantity(quantity: number): boolean {
    return Number.isInteger(quantity) && quantity >= 1;
}

const PERSPECTIVE_BY_ROLE: Record<BusinessItemRole, ValuePerspective> = {
    wish: 'buyerPerspective',
    activeHolding: 'holdingPerspective',
    soldRecord: 'historicalSalePerspective',
    trashedHolding: 'noPrimarySignal',
    trashedWish: 'noPrimarySignal',
    trashedSale: 'noPrimarySignal',
    invalid: 'invalid',
};

export function getValuePerspectiveForRole(role: BusinessItemRole): ValuePerspective {
    return PERSPECTIVE_BY_ROLE[role];
}

// Convertit un montant saisi (avec sa base) en total normalisé stocké.
// Destiné au flow de création/édition (Lot D). Ne devine jamais : un
// montant fourni sans base explicite retourne null (pas de fallback silencieux).
export function normalizePriceInputToTotal(input: {
    amount: number | null | undefined;
    basis: PriceBasis | null | undefined;
    quantity: number;
}): number | null {
    const { amount, basis, quantity } = input;
    if (amount == null || !Number.isFinite(amount)) return null;
    if (!isValidQuantity(quantity)) return null;
    if (basis == null) return null;
    return basis === 'unit' ? amount * quantity : amount;
}

// Résolution d'une saisie de prix côté UI (Lot D). Distingue trois issues :
//  - 'empty'      : aucun montant → rien à persister (prix null, basis null)
//  - 'needsBasis' : montant présent + quantity > 1 mais base non choisie → bloquer
//                   la validation (message pédagogique, ne rien sauvegarder)
//  - 'ok'         : résolu — expose le total normalisé, la base retenue, et
//                   isPerUnit (pour les signatures de service existantes qui
//                   normalisent elles-mêmes à partir du flag perUnit).
// quantity = 1 : unité et lot sont identiques → base 'unit' automatique, jamais
// de blocage. quantity invalide : bloque par sécurité (ne résout jamais en aveugle).
export type PriceEntryResolution =
    | { status: 'empty' }
    | { status: 'needsBasis' }
    | { status: 'ok'; total: number; basis: PriceBasis; isPerUnit: boolean };

export function resolvePriceEntry(input: {
    amount: number | null | undefined;
    basis: PriceBasis | null | undefined;
    quantity: number;
}): PriceEntryResolution {
    const { amount, basis, quantity } = input;
    if (amount == null || !Number.isFinite(amount)) return { status: 'empty' };
    if (!isValidQuantity(quantity)) return { status: 'needsBasis' };
    if (quantity === 1) return { status: 'ok', total: amount, basis: 'unit', isPerUnit: true };
    if (basis == null) return { status: 'needsBasis' };
    const total = basis === 'unit' ? amount * quantity : amount;
    return { status: 'ok', total, basis, isPerUnit: basis === 'unit' };
}

// Inverse de la saisie : à partir d'un total normalisé stocké + sa base, produit
// la valeur à ré-afficher dans le champ d'édition et la base à présélectionner
// (Lot D — pré-remplissage Edit). base 'unit' → montant unitaire (total/quantity) ;
// base 'lotTotal' ou absente (legacy) → total. Prix null → null (champ vide).
export function deriveEditablePriceInput(input: {
    total: number | null | undefined;
    basis: PriceBasis | null | undefined;
    quantity: number;
}): { amount: number; basis: PriceBasis } | null {
    const { total, basis, quantity } = input;
    if (total == null || !Number.isFinite(total)) return null;
    if (!isValidQuantity(quantity)) return null;
    if (basis === 'unit') return { amount: total / quantity, basis: 'unit' };
    return { amount: total, basis: 'lotTotal' };
}

// À partir d'un total normalisé stocké + sa base, produit les deux niveaux.
// Le calcul unitaire (total / quantity) ne dépend pas de la base, mais la base
// est conservée dans le modèle pour l'UX (BUSINESS_LOGIC §7). Un prix présent
// sans base est ambigu → null.
export function deriveUnitTotalPriceBreakdown(input: {
    totalAmount: number | null | undefined;
    basis: PriceBasis | null | undefined;
    quantity: number;
}): PriceBreakdown | null {
    const { totalAmount, basis, quantity } = input;
    if (totalAmount == null || !Number.isFinite(totalAmount)) return null;
    if (!isValidQuantity(quantity)) return null;
    if (basis == null) return null;
    return {
        unitAmount: totalAmount / quantity,
        totalAmount,
        basis,
        quantity,
    };
}

// À partir d'une melt unitaire (déjà en devise d'affichage), produit unité + total.
export function deriveMeltValueBreakdown(input: {
    unitMeltValue: number | null | undefined;
    quantity: number;
}): MeltBreakdown | null {
    const { unitMeltValue, quantity } = input;
    if (unitMeltValue == null || !Number.isFinite(unitMeltValue)) return null;
    if (!isValidQuantity(quantity)) return null;
    return {
        unitMeltValue,
        totalMeltValue: unitMeltValue * quantity,
        quantity,
    };
}

// Compose une prime cohérente à partir de deux breakdowns du MÊME référentiel.
// Compare toujours unité-vs-unité et total-vs-total, jamais croisé. Retourne
// null si un breakdown manque ou si les quantités divergent (référentiels
// incohérents).
export function derivePremiumBreakdown(input: {
    priceBreakdown: PriceBreakdown | null;
    meltBreakdown: MeltBreakdown | null;
}): PremiumBreakdown | null {
    const { priceBreakdown, meltBreakdown } = input;
    if (priceBreakdown == null || meltBreakdown == null) return null;
    if (priceBreakdown.quantity !== meltBreakdown.quantity) return null;

    const unitPremiumAmount = priceBreakdown.unitAmount - meltBreakdown.unitMeltValue;
    const totalPremiumAmount = priceBreakdown.totalAmount - meltBreakdown.totalMeltValue;

    return {
        unitObservedPrice: priceBreakdown.unitAmount,
        totalObservedPrice: priceBreakdown.totalAmount,
        unitMeltValue: meltBreakdown.unitMeltValue,
        totalMeltValue: meltBreakdown.totalMeltValue,
        unitPremiumAmount,
        totalPremiumAmount,
        unitPremiumPercent: meltBreakdown.unitMeltValue > 0
            ? unitPremiumAmount / meltBreakdown.unitMeltValue
            : null,
        totalPremiumPercent: meltBreakdown.totalMeltValue > 0
            ? totalPremiumAmount / meltBreakdown.totalMeltValue
            : null,
    };
}

// Entrée ergonomique : construit les deux breakdowns depuis les valeurs stockées
// (observedPrice total normalisé + son basis) et la melt unitaire, puis compose.
// Toutes les valeurs monétaires doivent déjà être dans la même devise d'affichage.
export function deriveObservedPremiumBreakdown(input: {
    observedTotalPrice: number | null | undefined;
    observedPriceBasis: PriceBasis | null | undefined;
    unitMeltValue: number | null | undefined;
    quantity: number;
}): PremiumBreakdown | null {
    const priceBreakdown = deriveUnitTotalPriceBreakdown({
        totalAmount: input.observedTotalPrice,
        basis: input.observedPriceBasis,
        quantity: input.quantity,
    });
    const meltBreakdown = deriveMeltValueBreakdown({
        unitMeltValue: input.unitMeltValue,
        quantity: input.quantity,
    });
    return derivePremiumBreakdown({ priceBreakdown, meltBreakdown });
}

// Signal de prime Wishlist (buyerPerspective). Ne s'applique qu'au rôle wish :
// pour les autres rôles, 'unavailable' (pas de signal de prime marché — Active
// aura une logique patrimoniale future, Sold un résultat historique, Trash rien).
// Distingue explicitement 'unavailable' (donnée manquante) de 'invalid'
// (référentiel cassé : quantity invalide ou prix sans base).
export function getPremiumSignal(input: {
    role: BusinessItemRole;
    observedTotalPrice: number | null | undefined;
    observedPriceBasis: PriceBasis | null | undefined;
    unitMeltValue: number | null | undefined;
    quantity: number;
}): PremiumSignal {
    const { role, observedTotalPrice, observedPriceBasis, unitMeltValue, quantity } = input;

    if (role !== 'wish') return 'unavailable';
    if (observedTotalPrice == null) return 'unavailable';
    if (unitMeltValue == null) return 'unavailable';
    if (!isValidQuantity(quantity)) return 'invalid';
    // Prix présent mais base absente : référentiel ambigu, pas une simple absence.
    if (observedPriceBasis == null) return 'invalid';

    const breakdown = deriveObservedPremiumBreakdown({
        observedTotalPrice, observedPriceBasis, unitMeltValue, quantity,
    });
    if (breakdown == null) return 'invalid';

    // percent unité et total sont égaux sur un batch homogène ; null si melt = 0.
    const percent = breakdown.totalPremiumPercent;
    if (percent == null) return 'unavailable'; // melt 0 : pas de référence, prime non classable

    if (percent < 0) return 'buyOpportunity';
    if (percent <= NEAR_MELT_MAX_RATIO) return 'nearMeltOpportunity';
    return 'neutral';
}
