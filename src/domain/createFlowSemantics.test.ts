import { resolveMixPriceAllocation } from './createFlowSemantics';

describe('resolveMixPriceAllocation', () => {
    test('row quantity 1 + prix → base unit auto, montant brut transmis (price × 1 côté service)', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 1, priceText: '30', priceBasis: null },
        ]);
        expect(result).toEqual({
            status: 'ok',
            allocations: [{ id: 'a', quantity: 1, price: 30, isPerUnit: true }],
        });
    });

    test('row quantity > 1 + prix + base unit → isPerUnit true (service fera price × quantity)', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 2, priceText: '10', priceBasis: 'unit' },
        ]);
        expect(result).toEqual({
            status: 'ok',
            allocations: [{ id: 'a', quantity: 2, price: 10, isPerUnit: true }],
        });
    });

    test('row quantity > 1 + prix + base lotTotal → isPerUnit false (total inchangé)', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 5, priceText: '120', priceBasis: 'lotTotal' },
        ]);
        expect(result).toEqual({
            status: 'ok',
            allocations: [{ id: 'a', quantity: 5, price: 120, isPerUnit: false }],
        });
    });

    test('row quantity > 1 + prix + base absente → needsBasis avec l\'id de la ligne', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 5, priceText: '120', priceBasis: null },
        ]);
        expect(result).toEqual({ status: 'needsBasis', rowIds: ['a'] });
    });

    test('row quantity > 1 + prix 0 + base unit → valide, 0 n\'est pas null', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 5, priceText: '0', priceBasis: 'unit' },
        ]);
        expect(result).toEqual({
            status: 'ok',
            allocations: [{ id: 'a', quantity: 5, price: 0, isPerUnit: true }],
        });
    });

    test('row sans prix → price null, isPerUnit false, jamais de blocage même si base absente', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 5, priceText: '', priceBasis: null },
            { id: 'b', quantity: 3, priceText: '   ', priceBasis: null },
        ]);
        expect(result).toEqual({
            status: 'ok',
            allocations: [
                { id: 'a', quantity: 5, price: null, isPerUnit: false },
                { id: 'b', quantity: 3, price: null, isPerUnit: false },
            ],
        });
    });

    test('pas de prix global : deux lignes sans prix restent chacune null, jamais 54/54 (Lot 5.2 préservé)', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 1, priceText: '', priceBasis: null },
            { id: 'b', quantity: 1, priceText: '', priceBasis: null },
        ]);
        expect(result.status).toBe('ok');
        if (result.status === 'ok') {
            expect(result.allocations.some(a => a.price === 54)).toBe(false);
            expect(result.allocations.every(a => a.price === null)).toBe(true);
        }
    });

    test('plusieurs lignes hétérogènes → chacune son montant + son isPerUnit', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 1, priceText: '30', priceBasis: null },       // qty 1 → unit auto
            { id: 'b', quantity: 2, priceText: '10', priceBasis: 'unit' },     // 10/unité
            { id: 'c', quantity: 5, priceText: '100', priceBasis: 'lotTotal' },// 100 la ligne
        ]);
        expect(result).toEqual({
            status: 'ok',
            allocations: [
                { id: 'a', quantity: 1, price: 30, isPerUnit: true },
                { id: 'b', quantity: 2, price: 10, isPerUnit: true },
                { id: 'c', quantity: 5, price: 100, isPerUnit: false },
            ],
        });
    });

    test('blocage global : une seule ligne ambiguë suffit à renvoyer needsBasis', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 1, priceText: '30', priceBasis: null },
            { id: 'b', quantity: 5, priceText: '100', priceBasis: null }, // ambiguë
        ]);
        expect(result).toEqual({ status: 'needsBasis', rowIds: ['b'] });
    });

    test('plusieurs lignes ambiguës → tous les ids remontés', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 3, priceText: '30', priceBasis: null },
            { id: 'b', quantity: 5, priceText: '100', priceBasis: null },
        ]);
        expect(result).toEqual({ status: 'needsBasis', rowIds: ['a', 'b'] });
    });

    test('virgule décimale acceptée (saisie FR)', () => {
        const result = resolveMixPriceAllocation([
            { id: 'a', quantity: 1, priceText: '24,50', priceBasis: null },
        ]);
        expect(result).toEqual({
            status: 'ok',
            allocations: [{ id: 'a', quantity: 1, price: 24.5, isPerUnit: true }],
        });
    });
});
