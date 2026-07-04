import { convertCurrencyAmount } from './currencyConversion';

export const NEAR_MELT_THRESHOLD = 0.05;

export type MeltBadge = 'under' | 'near' | null;

// Ré-exporté depuis currencyConversion.ts — conserve un point d'import stable
// pour les consommateurs existants sans dupliquer la formule.
export { convertCurrencyAmount };

/**
 * Returns the melt badge for a wishlist item.
 * Compares price (converted to displayCurrency) against meltTotal (in displayCurrency).
 * - 'under' : priceDisplay < meltTotal
 * - 'near'  : meltTotal <= priceDisplay <= meltTotal * (1 + NEAR_MELT_THRESHOLD)
 * - null    : above threshold, or any data missing / conversion impossible
 */
export function getMeltBadge({
    price,
    priceCurrency,
    displayCurrency,
    meltTotal,
    rates,
}: {
    price: number;
    priceCurrency: string;
    displayCurrency: string;
    meltTotal: number;
    rates: Record<string, number>;
}): MeltBadge {
    if (meltTotal <= 0) return null;
    const priceDisplay = convertCurrencyAmount(price, priceCurrency, displayCurrency, rates);
    if (priceDisplay === null) return null;
    if (priceDisplay < meltTotal) return 'under';
    if (priceDisplay <= meltTotal * (1 + NEAR_MELT_THRESHOLD)) return 'near';
    return null;
}
