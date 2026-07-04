import { resolveCreationPriceAllocation } from './createFlowSemantics';

describe('resolveCreationPriceAllocation', () => {
    test('un seul item généré — quantity 2, purchasePrice total 54 → 1 item, price 54', () => {
        const result = resolveCreationPriceAllocation({
            mode: 'simple', quantity: 2, priceText: '54', isPerUnit: false,
        });
        expect(result).toEqual([{ id: 'single', quantity: 2, price: 54 }]);
    });

    test('deux items générés, années différentes, prix par ligne → chacun son prix, total 54', () => {
        const result = resolveCreationPriceAllocation({
            mode: 'mix',
            rows: [
                { id: 'maple-2020', quantity: 1, priceText: '24' },
                { id: 'maple-2015', quantity: 1, priceText: '30' },
            ],
        });
        expect(result).toEqual([
            { id: 'maple-2020', quantity: 1, price: 24 },
            { id: 'maple-2015', quantity: 1, price: 30 },
        ]);
        const total = result.reduce((sum, r) => sum + (r.price ?? 0), 0);
        expect(total).toBe(54);
    });

    test('prix global ambigu — le mode mix ne peut structurellement pas dupliquer un prix global : deux lignes sans prix ligne restent chacune null, jamais 54/54', () => {
        const result = resolveCreationPriceAllocation({
            mode: 'mix',
            rows: [
                { id: 'a', quantity: 1, priceText: '' },
                { id: 'b', quantity: 1, priceText: '' },
            ],
        });
        expect(result).toEqual([
            { id: 'a', quantity: 1, price: null },
            { id: 'b', quantity: 1, price: null },
        ]);
        expect(result.some(r => r.price === 54)).toBe(false);
    });

    test('prix par ligne null (vide) → price reste null, jamais 0', () => {
        const result = resolveCreationPriceAllocation({
            mode: 'mix',
            rows: [
                { id: 'a', quantity: 1, priceText: '' },
                { id: 'b', quantity: 1, priceText: '   ' },
            ],
        });
        expect(result).toEqual([
            { id: 'a', quantity: 1, price: null },
            { id: 'b', quantity: 1, price: null },
        ]);
    });

    test('ligne quantity > 1 → price est le total de la ligne, pas un prix unitaire recalculé', () => {
        const result = resolveCreationPriceAllocation({
            mode: 'mix',
            rows: [{ id: 'a', quantity: 10, priceText: '240' }],
        });
        expect(result).toEqual([{ id: 'a', quantity: 10, price: 240 }]);
    });

    test('mix quantity=1 et quantity>1 → chaque ligne garde son propre prix total', () => {
        const result = resolveCreationPriceAllocation({
            mode: 'mix',
            rows: [
                { id: 'a', quantity: 1, priceText: '24' },
                { id: 'b', quantity: 10, priceText: '240' },
            ],
        });
        expect(result).toEqual([
            { id: 'a', quantity: 1, price: 24 },
            { id: 'b', quantity: 10, price: 240 },
        ]);
    });

    test('régression — création standard simple avec prix : comportement inchangé', () => {
        const result = resolveCreationPriceAllocation({
            mode: 'simple', quantity: 1, priceText: '99.90', isPerUnit: false,
        });
        expect(result).toEqual([{ id: 'single', quantity: 1, price: 99.9 }]);
    });

    test('prix vide (mode simple) → price null, jamais 0', () => {
        const result = resolveCreationPriceAllocation({
            mode: 'simple', quantity: 1, priceText: '', isPerUnit: false,
        });
        expect(result).toEqual([{ id: 'single', quantity: 1, price: null }]);
    });

    test('mode simple, isPerUnit=true → price = prix unitaire × quantity (total du lot)', () => {
        const result = resolveCreationPriceAllocation({
            mode: 'simple', quantity: 3, priceText: '10', isPerUnit: true,
        });
        expect(result).toEqual([{ id: 'single', quantity: 3, price: 30 }]);
    });

    test('virgule décimale acceptée (saisie FR)', () => {
        const result = resolveCreationPriceAllocation({
            mode: 'mix',
            rows: [{ id: 'a', quantity: 1, priceText: '24,50' }],
        });
        expect(result).toEqual([{ id: 'a', quantity: 1, price: 24.5 }]);
    });
});
