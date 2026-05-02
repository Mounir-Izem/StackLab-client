const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL ?? 'http://localhost:8080';

export type SpotPrices = {
    gold: number;
    silver: number;
    currency: string;
    updatedAt: string;
    cached: boolean;
};

export type SpotResult =
    | { ok: true; data: SpotPrices }
    | { ok: false; lastKnown: SpotPrices | null; error: 'UNAVAILABLE' | 'TIMEOUT' };

export async function fetchSpotPrices(currency: string): Promise<SpotResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
        const res = await fetch(`${PROXY_URL}/prices?currency=${currency}`, {
            signal: controller.signal,
        });

        if (res.ok) {
            const data = await res.json() as SpotPrices;
            return { ok: true, data };
        }

        if (res.status === 503) {
            const body = await res.json() as { last_known?: SpotPrices };
            return { ok: false, lastKnown: body.last_known ?? null, error: 'UNAVAILABLE' };
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
