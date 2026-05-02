import { ItemCreateSchema } from './item.schema';

const validBase = {
    labId: 'lab-uuid-1',
    status: 'active' as const,
    name: 'Maple Leaf',
    metal: 'silver' as const,
    shape: 'coin' as const,
    weightInput: 1.0,
    weightUnit: 'oz' as const,
    purity: 0.9999,
    quantity: 7,
};

describe('ItemCreateSchema — champs obligatoires', () => {
    test('item valide passe la validation', () => {
        expect(() => ItemCreateSchema.parse(validBase)).not.toThrow();
    });
    test('labId absent → rejeté', () => {
        const { labId: _labId, ...rest } = validBase;
        expect(() => ItemCreateSchema.parse(rest)).toThrow();
    });
    test('name vide → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, name: '' })).toThrow();
    });
    test('metal invalide → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, metal: 'platinum' })).toThrow();
    });
    test('shape invalide → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, shape: 'nugget' })).toThrow();
    });
    test('status sold → rejeté (impossible à la création)', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, status: 'sold' })).toThrow();
    });
});

describe('ItemCreateSchema — poids et pureté', () => {
    test('weightInput = 0 → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, weightInput: 0 })).toThrow();
    });
    test('weightInput négatif → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, weightInput: -1 })).toThrow();
    });
    test('purity = 0 → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, purity: 0 })).toThrow();
    });
    test('purity > 1 → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, purity: 1.5 })).toThrow();
    });
    test('purity = 1 → accepté (pureté maximale théorique)', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, purity: 1 })).not.toThrow();
    });
});

describe('ItemCreateSchema — quantité', () => {
    test('quantity = 0 → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, quantity: 0 })).toThrow();
    });
    test('quantity décimale → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, quantity: 1.5 })).toThrow();
    });
    test('quantity = 1 → accepté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, quantity: 1 })).not.toThrow();
    });
});

describe('ItemCreateSchema — prix achat (superRefine)', () => {
    test('purchasePrice présent sans purchasePriceIsPerUnit → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, purchasePrice: 30.0 })).toThrow();
    });
    test('purchasePrice présent avec purchasePriceIsPerUnit → accepté', () => {
        expect(() => ItemCreateSchema.parse({
            ...validBase,
            purchasePrice: 30.0,
            purchasePriceIsPerUnit: true,
        })).not.toThrow();
    });
    test('purchasePrice absent → purchasePriceIsPerUnit non requis', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase })).not.toThrow();
    });
    test('purchaseExchangeRate = 0 → rejeté', () => {
        expect(() => ItemCreateSchema.parse({
            ...validBase,
            purchasePrice: 30.0,
            purchasePriceIsPerUnit: true,
            purchaseExchangeRate: 0,
        })).toThrow();
    });
});

describe('ItemCreateSchema — prix observé (superRefine)', () => {
    test('observedPrice présent sans observedPriceIsPerUnit → rejeté', () => {
        expect(() => ItemCreateSchema.parse({ ...validBase, observedPrice: 48.0 })).toThrow();
    });
    test('observedPrice présent avec observedPriceIsPerUnit → accepté', () => {
        expect(() => ItemCreateSchema.parse({
            ...validBase,
            observedPrice: 48.0,
            observedPriceIsPerUnit: false,
        })).not.toThrow();
    });
    test('observedPrice = 0 → accepté (cadeau, héritage)', () => {
        expect(() => ItemCreateSchema.parse({
            ...validBase,
            observedPrice: 0,
            observedPriceIsPerUnit: true,
        })).not.toThrow();
    });
});
