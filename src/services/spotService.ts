import { z } from 'zod';

const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL ?? 'http://localhost:8080';

const SpotPricesSchema = z.object({
    gold: z.number(),
    silver: z.number(),
    currency: z.string(),
    updated_at: z.string(),
    source: z.string(),
    cached: z.boolean(),
    rates: z.record(z.string(), z.number()),
});

const ErrorResponseSchema = z.object({
    error: z.string(),
    code: z.string(),
    last_known: z.object({
        gold: z.number(),
        silver: z.number(),
        currency: z.string(),
        updated_at: z.string(),
    }).nullable().optional(),
});

export type SpotPrices = {
    gold: number;
    silver: number;
    currency: string;
    updatedAt: string;
    cached: boolean;
    rates: Record<string, number>;
};

export type SpotResult =
    | { ok: true; data: SpotPrices }
    | { ok: false; lastKnown: SpotPrices | null; error: 'UNAVAILABLE' | 'TIMEOUT' };

export async function fetchSpotPrices(): Promise<SpotResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
        const res = await fetch(`${PROXY_URL}/prices?currency=USD`, {
            signal: controller.signal,
        });

        if (res.ok) {
            const raw: unknown = await res.json();
            const parsed = SpotPricesSchema.parse(raw);
            return {
                ok: true,
                data: {
                    gold: parsed.gold,
                    silver: parsed.silver,
                    currency: parsed.currency,
                    updatedAt: parsed.updated_at,
                    cached: parsed.cached,
                    rates: parsed.rates,
                },
            };
        }

        if (res.status === 503) {
            const raw: unknown = await res.json();
            const parsed = ErrorResponseSchema.parse(raw);
            const lk = parsed.last_known ?? null;
            return {
                ok: false,
                lastKnown: lk
                    ? { gold: lk.gold, silver: lk.silver, currency: lk.currency, updatedAt: lk.updated_at, cached: true, rates: {} }
                    : null,
                error: 'UNAVAILABLE',
            };
        }

        return { ok: false, lastKnown: null, error: 'UNAVAILABLE' };
    } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
            return { ok: false, lastKnown: null, error: 'TIMEOUT' };
        }
        return { ok: false, lastKnown: null, error: 'UNAVAILABLE' };
    } finally {
        clearTimeout(timer);
    }
}
