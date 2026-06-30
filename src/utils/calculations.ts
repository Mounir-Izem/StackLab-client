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

export function sumByCurrency(
    amountsByCurrency: Record<string, number>,
    displayCurrency: string,
    rates: Record<string, number>,
): number | null {
    if (Object.keys(amountsByCurrency).length === 0) return null;
    const hasNonUsd = Object.keys(amountsByCurrency).some(c => c !== 'USD');
    if (hasNonUsd && Object.keys(rates).length === 0) return null;
    const totalUsd = Object.entries(amountsByCurrency).reduce((sum, [cur, amount]) => {
        return sum + (cur === 'USD' ? amount : amount * (rates[cur] ?? 1));
    }, 0);
    return convertSpotPrice(totalUsd, displayCurrency, rates);
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
