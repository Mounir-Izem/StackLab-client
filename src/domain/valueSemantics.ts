import type { Currency } from '../types/settings.types';
import type { BusinessItemRole } from './itemSemantics';

export type ValueKind =
    | 'meltValue'
    | 'purchasePrice'
    | 'observedPrice'
    | 'soldPrice'
    | 'observedPremium'
    | 'unrealizedPnL'
    | 'realizedPnL';

export type ValuePermissionMap = Record<ValueKind, boolean>;

// rates[X] = combien d'USD vaut 1 unité de X (contrat StackLab-proxy, cf. METALS_DEV_API.md).
// USD est la base implicite : jamais présent dans rates, traité comme taux = 1.
export type CurrencyRates = Partial<Record<Currency, number>>;

export type ObservedPremiumResult = {
    amount: number;
    percent: number;
    currency: Currency;
};

const ALL_FALSE: ValuePermissionMap = {
    meltValue: false,
    purchasePrice: false,
    observedPrice: false,
    soldPrice: false,
    observedPremium: false,
    unrealizedPnL: false,
    realizedPnL: false,
};

const PERMISSIONS_BY_ROLE: Record<BusinessItemRole, ValuePermissionMap> = {
    activeHolding: {
        ...ALL_FALSE,
        meltValue: true,
        purchasePrice: true,
        unrealizedPnL: true,
    },
    wish: {
        ...ALL_FALSE,
        observedPrice: true,
        meltValue: true,
        observedPremium: true,
    },
    soldRecord: {
        ...ALL_FALSE,
        soldPrice: true,
        purchasePrice: true,
        realizedPnL: true,
    },
    trashedHolding: { ...ALL_FALSE },
    trashedWish: { ...ALL_FALSE },
    trashedSale: { ...ALL_FALSE },
    invalid: { ...ALL_FALSE },
};

export function getValuePermissions(role: BusinessItemRole): ValuePermissionMap {
    return PERMISSIONS_BY_ROLE[role];
}

export function canShowValue(role: BusinessItemRole, kind: ValueKind): boolean {
    return getValuePermissions(role)[kind];
}

const PRIMARY_VALUE_BY_ROLE: Record<BusinessItemRole, ValueKind | null> = {
    activeHolding: 'meltValue',
    wish: 'observedPrice',
    soldRecord: 'soldPrice',
    trashedHolding: null,
    trashedWish: null,
    trashedSale: null,
    invalid: null,
};

export function getPrimaryValueKind(role: BusinessItemRole): ValueKind | null {
    return PRIMARY_VALUE_BY_ROLE[role];
}

export function getAllowedValueKinds(role: BusinessItemRole): ValueKind[] {
    const permissions = getValuePermissions(role);
    return (Object.keys(permissions) as ValueKind[]).filter(kind => permissions[kind]);
}

// USD implicite = taux 1, même si absent de rates. Retourne null si un taux
// requis manque — jamais de fallback silencieux vers un montant non converti.
export function convertCurrencyAmount(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
    rates: CurrencyRates | null,
): number | null {
    if (!Number.isFinite(amount)) return null;
    if (fromCurrency === toCurrency) return amount;

    const safeRates = rates ?? {};

    const amountInUsd = fromCurrency === 'USD'
        ? amount
        : (safeRates[fromCurrency] != null ? amount * (safeRates[fromCurrency] as number) : null);
    if (amountInUsd === null) return null;

    if (toCurrency === 'USD') return amountInUsd;
    const toRate = safeRates[toCurrency];
    if (toRate == null) return null;
    return amountInUsd / toRate;
}

export function getObservedPremium(input: {
    role: BusinessItemRole;
    observedPrice: number | null;
    observedCurrency: Currency | null;
    currentMeltValue: number | null;
    displayCurrency: Currency;
    rates: CurrencyRates | null;
}): ObservedPremiumResult | null {
    const { role, observedPrice, observedCurrency, currentMeltValue, displayCurrency, rates } = input;

    if (role !== 'wish') return null;
    if (observedPrice == null) return null;
    if (observedCurrency == null) return null;
    if (currentMeltValue == null) return null;
    if (currentMeltValue <= 0) return null;

    const observedPriceDisplay = convertCurrencyAmount(observedPrice, observedCurrency, displayCurrency, rates);
    if (observedPriceDisplay === null) return null;

    const amount = observedPriceDisplay - currentMeltValue;
    const percent = amount / currentMeltValue;

    return { amount, percent, currency: displayCurrency };
}
