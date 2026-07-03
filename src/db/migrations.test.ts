// Tests for Migration V7 wishlist repair logic.
// The actual SQL runs on device; these tests verify the equivalent pure logic
// that mirrors the UPDATE statement in migrateV6toV7.

type WishlistRepairRow = {
    status: string;
    purchase_price: number | null;
    observed_price: number | null;
    purchase_currency: string | null;
    purchase_date: string | null;
    observed_currency: string | null;
    observed_price_date: string | null;
};

// Mirrors the SQL CASE WHEN logic in migrateV6toV7:
//   observed_price      = CASE WHEN observed_price IS NULL THEN purchase_price      ELSE observed_price      END
//   observed_currency   = CASE WHEN observed_price IS NULL THEN purchase_currency   ELSE observed_currency   END
//   observed_price_date = CASE WHEN observed_price IS NULL THEN purchase_date       ELSE observed_price_date END
//   purchase_price = NULL, purchase_currency = NULL, purchase_date = NULL
//   WHERE status = 'wishlist' AND purchase_price IS NOT NULL
function applyV7Repair(row: WishlistRepairRow): WishlistRepairRow {
    if (row.status !== 'wishlist' || row.purchase_price === null) return row;
    const hadObserved = row.observed_price !== null;
    return {
        ...row,
        observed_price:      hadObserved ? row.observed_price      : row.purchase_price,
        observed_currency:   hadObserved ? row.observed_currency   : row.purchase_currency,
        observed_price_date: hadObserved ? row.observed_price_date : row.purchase_date,
        purchase_price:    null,
        purchase_currency: null,
        purchase_date:     null,
    };
}

describe('Migration V7 — repairWishlistPurchasePrice (logique SQL miroir)', () => {
    test('wishlist sans observedPrice → purchasePrice copié vers observedPrice', () => {
        const result = applyV7Repair({
            status: 'wishlist',
            purchase_price: 100, purchase_currency: 'EUR', purchase_date: '2026-01-01',
            observed_price: null, observed_currency: null, observed_price_date: null,
        });
        expect(result.observed_price).toBe(100);
        expect(result.observed_currency).toBe('EUR');
        expect(result.observed_price_date).toBe('2026-01-01');
        expect(result.purchase_price).toBeNull();
        expect(result.purchase_currency).toBeNull();
        expect(result.purchase_date).toBeNull();
    });

    test('wishlist avec observedPrice déjà présent → observedPrice conservé, purchasePrice effacé', () => {
        const result = applyV7Repair({
            status: 'wishlist',
            purchase_price: 100, purchase_currency: 'EUR', purchase_date: '2026-01-01',
            observed_price: 200, observed_currency: 'USD', observed_price_date: '2025-06-01',
        });
        expect(result.observed_price).toBe(200);
        expect(result.observed_currency).toBe('USD');
        expect(result.observed_price_date).toBe('2025-06-01');
        expect(result.purchase_price).toBeNull();
    });

    test('item active avec purchasePrice → non modifié (hors périmètre WHERE)', () => {
        const row: WishlistRepairRow = {
            status: 'active',
            purchase_price: 100, purchase_currency: 'USD', purchase_date: null,
            observed_price: null, observed_currency: null, observed_price_date: null,
        };
        const result = applyV7Repair(row);
        expect(result.purchase_price).toBe(100);
        expect(result.observed_price).toBeNull();
    });

    test('wishlist avec purchasePrice null → non modifié (hors périmètre WHERE)', () => {
        const row: WishlistRepairRow = {
            status: 'wishlist',
            purchase_price: null, purchase_currency: null, purchase_date: null,
            observed_price: 200, observed_currency: 'EUR', observed_price_date: '2025-01-01',
        };
        const result = applyV7Repair(row);
        expect(result.observed_price).toBe(200);
        expect(result.purchase_price).toBeNull();
    });
});
