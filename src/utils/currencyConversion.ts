// Conversion pure — convention StackLab-proxy (cf. METALS_DEV_API.md) :
// rates[X] = combien d'USD vaut 1 unité de X. USD est la base implicite
// (taux = 1, jamais présent dans rates). Retourne null si la conversion
// est impossible (taux manquant) — jamais de fallback silencieux vers un
// montant non converti.
export function convertCurrencyAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: Record<string, number> | null | undefined,
): number | null {
    if (!Number.isFinite(amount)) return null;
    if (fromCurrency === toCurrency) return amount;

    const safeRates = rates ?? {};

    const amountInUsd = fromCurrency === 'USD'
        ? amount
        : (safeRates[fromCurrency] != null ? amount * safeRates[fromCurrency] : null);
    if (amountInUsd === null) return null;

    if (toCurrency === 'USD') return amountInUsd;
    const toRate = safeRates[toCurrency];
    if (toRate == null) return null;
    return amountInUsd / toRate;
}
