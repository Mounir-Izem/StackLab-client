import type { Currency, WeightUnit } from '../types/settings.types';
import type { StrikeFinish } from '../types/item.types';

const EMPTY = '—';

export function formatCurrency(value: number | null, currency: Currency): string {
    if (value === null) return EMPTY;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export function formatWeight(weightOz: number | null, unit: WeightUnit, fine = false): string {
    if (weightOz === null) return EMPTY;
    switch (unit) {
        case 'oz': return `${weightOz.toFixed(fine ? 4 : 3)} oz`;
        case 'g': return `${(weightOz * 31.1035).toFixed(fine ? 3 : 2)} g`;
        case 'kg': return `${(weightOz * 0.0311035).toFixed(fine ? 5 : 4)} kg`;
    }
}

export function formatPurity(value: number | null): string {
    if (value === null) return EMPTY;
    const decimals = Math.round(value * 10000) % 10 === 0 ? 3 : 4;
    return '.' + value.toFixed(decimals).slice(2);
}

export function formatDate(isoDate: string | null): string {
    if (!isoDate) return EMPTY;
    const parts = isoDate.split('T')[0].split('-').map(Number);
    const [year, month, day] = parts;
    if (!year || isNaN(year)) return EMPTY;
    if (!month) return String(year);
    const date = new Date(year, month - 1, day ?? 1);
    if (isNaN(date.getTime())) return EMPTY;
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        ...(day ? { day: 'numeric' } : {}),
        year: 'numeric',
    }).format(date);
}

export function formatPnL(value: number | null, currency: Currency): string {
    if (value === null) return EMPTY;
    const formatted = formatCurrency(value, currency);
    return value > 0 ? `+${formatted}` : formatted;
}

export function formatPct(value: number | null): string {
    if (value === null) return EMPTY;
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

export function formatCardValue(value: number | null, currency: string): string {
    if (value === null) return EMPTY;
    const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    if (value >= 10000) return `${symbol}${(value / 1000).toFixed(1)}k`;
    if (value >= 1000) return `${symbol}${Math.round(value).toLocaleString('en-US')}`;
    return `${symbol}${value.toFixed(2)}`;
}

export function formatStrikeLabel(s: StrikeFinish): string {
    switch (s) {
        case 'BU': return 'BU';
        case 'proof': return 'Proof';
        case 'reverse_proof': return 'Rev. Proof';
        case 'antique': return 'Antique';
        case 'matte': return 'Matte';
        case 'specimen': return 'Specimen';
        case 'burnished': return 'Burnished';
        case 'proof_like': return 'PL';
        case 'unknown': return '';
    }
}
