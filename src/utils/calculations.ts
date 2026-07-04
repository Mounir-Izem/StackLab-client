import type { ItemWeightUnit } from '../types/item.types';
import { convertCurrencyAmount } from './currencyConversion';

export function toTroyOz(weight: number, unit: ItemWeightUnit): number {
    if (unit === 'g') return weight / 31.1035;
    if (unit === 'kg') return weight * 32.1507;
    return weight;
}

export function generateFamilyKey(name: string, metal: string): string {
    const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    return `${slug}-${metal}`;
}

export function calcFineWeightOz(weightOz: number, purity: number): number {
    return weightOz * purity;
}

export function calcMeltValue(fineWeightOz: number, spotPrice: number): number {
    return fineWeightOz * spotPrice;
}

export function calcCurrentValue(
    weightOz: number,
    quantity: number,
    purity: number,
    spotPrice: number,
): number {
    return calcMeltValue(calcFineWeightOz(weightOz, purity), spotPrice) * quantity;
}

export function calcUnrealizedPnL(
    currentValue: number,
    purchasePriceConverted: number | null,
): number | null {
    if (purchasePriceConverted === null) return null;
    return currentValue - purchasePriceConverted;
}

export function calcUnrealizedPnLPct(
    unrealizedPnL: number,
    purchasePriceConverted: number,
): number | null {
    if (purchasePriceConverted === 0) return null;
    return (unrealizedPnL / purchasePriceConverted) * 100;
}

export function calcWishlistGap(
    observedPrice: number,
    currentValue: number,
): number {
    return observedPrice - currentValue;
}

// priceUsd est toujours en USD (nom explicite) — conversion vers currency.
// Retourne null si le taux manque, jamais le montant USD non converti.
export function convertSpotPrice(
    priceUsd: number,
    currency: string,
    rates: Record<string, number>,
): number | null {
    return convertCurrencyAmount(priceUsd, 'USD', currency, rates);
}

export function proratePurchasePrice(
    totalPrice: number | null,
    takeQty: number,
    fromQty: number,
): { extracted: number | null; remaining: number | null } {
    if (totalPrice === null) return { extracted: null, remaining: null };
    const totalCents = Math.round(totalPrice * 100);
    const extractedCents = Math.round((totalCents * takeQty) / fromQty);
    const remainingCents = totalCents - extractedCents;
    return { extracted: extractedCents / 100, remaining: remainingCents / 100 };
}

// Convertit chaque ligne directement vers displayCurrency (jamais via un
// détour USD forcé) et additionne. Une ligne vide → null (aucun prix
// renseigné = inconnu, jamais 0). Une seule ligne non convertible (taux
// manquant) rend le total entier non fiable → null, jamais un fallback
// vers 1 ou vers le montant non converti.
export function sumByCurrency(
    amountsByCurrency: Record<string, number>,
    displayCurrency: string,
    rates: Record<string, number>,
): number | null {
    const entries = Object.entries(amountsByCurrency);
    if (entries.length === 0) return null;

    let total = 0;
    for (const [cur, amount] of entries) {
        const converted = convertCurrencyAmount(amount, cur, displayCurrency, rates);
        if (converted === null) return null;
        total += converted;
    }
    return total;
}

export function calcTotalInvested(
    investedByCurrency: Record<string, number>,
    displayCurrency: string,
    rates: Record<string, number>,
): number | null {
    return sumByCurrency(investedByCurrency, displayCurrency, rates);
}

export function calcRealizedPnL(
    proceeds: number | null,
    costBasis: number | null,
): number | null {
    if (proceeds === null || costBasis === null) return null;
    return proceeds - costBasis;
}
