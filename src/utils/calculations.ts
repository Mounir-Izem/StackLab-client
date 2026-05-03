import type { ItemWeightUnit } from '../types/item.types';

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

export function convertSpotPrice(
    priceUsd: number,
    currency: string,
    rates: Record<string, number>,
): number {
    if (currency === 'USD') return priceUsd;
    const rate = rates[currency];
    if (!rate) return priceUsd;
    return priceUsd / rate;
}
