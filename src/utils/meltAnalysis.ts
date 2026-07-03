export const NEAR_MELT_THRESHOLD = 0.05;

export type MeltBadge = 'under' | 'near' | null;

/**
 * Converts an amount from one currency to another using stored rates.
 * rates[X] = USD per 1 unit of X (e.g. rates['EUR'] = 1.09 means 1 EUR = 1.09 USD).
 * Returns null if conversion is impossible (missing rate).
 */
export function convertCurrencyAmount(
    amount: number,
    from: string,
    to: string,
    rates: Record<string, number>,
): number | null {
    if (from === to) return amount;
    const usd = from === 'USD' ? amount : (rates[from] != null ? amount * rates[from] : null);
    if (usd === null) return null;
    if (to === 'USD') return usd;
    return rates[to] != null ? usd / rates[to] : null;
}

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
