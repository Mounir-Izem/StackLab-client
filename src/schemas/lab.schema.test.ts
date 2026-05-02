import { LabCreateSchema, LabRenameSchema, DeckCreateSchema, DeckRenameSchema } from './lab.schema';

describe('LabCreateSchema', () => {
    test('valide standard → accepté', () => {
        expect(() => LabCreateSchema.parse({ name: 'Mon Lab', type: 'standard' })).not.toThrow();
    });
    test('valide trash → accepté', () => {
        expect(() => LabCreateSchema.parse({ name: 'Mon Lab', type: 'trash' })).not.toThrow();
    });
    test('valide wishlist → accepté', () => {
        expect(() => LabCreateSchema.parse({ name: 'Mon Lab', type: 'wishlist' })).not.toThrow();
    });
    test('name vide → rejeté', () => {
        expect(() => LabCreateSchema.parse({ name: '', type: 'standard' })).toThrow();
    });
    test('name absent → rejeté', () => {
        expect(() => LabCreateSchema.parse({ type: 'standard' })).toThrow();
    });
    test('type invalide → rejeté', () => {
        expect(() => LabCreateSchema.parse({ name: 'Mon Lab', type: 'gold' })).toThrow();
    });
    test('type absent → rejeté', () => {
        expect(() => LabCreateSchema.parse({ name: 'Mon Lab' })).toThrow();
    });
});

describe('LabRenameSchema', () => {
    test('name valide → accepté', () => {
        expect(() => LabRenameSchema.parse({ name: 'Nouveau Nom' })).not.toThrow();
    });
    test('name vide → rejeté', () => {
        expect(() => LabRenameSchema.parse({ name: '' })).toThrow();
    });
    test('name absent → rejeté', () => {
        expect(() => LabRenameSchema.parse({})).toThrow();
    });
});

describe('DeckCreateSchema', () => {
    test('valide → accepté', () => {
        expect(() => DeckCreateSchema.parse({ name: 'Mon Deck', labId: 'lab-uuid-1' })).not.toThrow();
    });
    test('name vide → rejeté', () => {
        expect(() => DeckCreateSchema.parse({ name: '', labId: 'lab-uuid-1' })).toThrow();
    });
    test('labId vide → rejeté', () => {
        expect(() => DeckCreateSchema.parse({ name: 'Mon Deck', labId: '' })).toThrow();
    });
    test('labId absent → rejeté', () => {
        expect(() => DeckCreateSchema.parse({ name: 'Mon Deck' })).toThrow();
    });
});

describe('DeckRenameSchema', () => {
    test('name valide → accepté', () => {
        expect(() => DeckRenameSchema.parse({ name: 'Nouveau Nom' })).not.toThrow();
    });
    test('name vide → rejeté', () => {
        expect(() => DeckRenameSchema.parse({ name: '' })).toThrow();
    });
    test('name absent → rejeté', () => {
        expect(() => DeckRenameSchema.parse({})).toThrow();
    });
});
