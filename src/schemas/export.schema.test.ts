import { ExportSchema } from './export.schema';

const makeLab = (id = 'lab-1') => ({
    id,
    userId: null,
    name: 'Mon Lab',
    type: 'standard' as const,
    coverPhotoUrl: null,
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
});

const makeDeck = (id = 'deck-1', labId = 'lab-1') => ({
    id,
    labId,
    parentId: null,
    name: 'Mon Deck',
    coverPhotoUrl: null,
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
});

const makeItem = (id = 'item-1', labId = 'lab-1') => ({
    id,
    labId,
    deckId: null,
    status: 'active' as const,
    name: 'Maple Leaf',
    familyKey: 'maple-leaf-silver',
    metal: 'silver' as const,
    mintName: null,
    shape: 'coin' as const,
    shapeDescription: null,
    weightOz: 1.0,
    weightUnitInput: 'oz' as const,
    purity: 0.9999,
    year: null,
    strikeFinish: null,
    condition: null,
    features: [],
    packaging: [],
    gradingCompany: null,
    gradeValue: null,
    notes: null,
    quantity: 1,
    purchasePrice: null,
    purchaseCurrency: null,
    purchaseExchangeRate: null,
    purchaseDate: null,
    observedPrice: null,
    observedCurrency: null,
    observedPriceDate: null,
    soldDate: null,
    soldPrice: null,
    soldCurrency: null,
    photoUrl: null,
    location: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
});

const makeSnapshot = (id = 'snap-1') => ({
    id,
    date: '2026-01-01',
    totalValue: 35.0,
    totalOzGold: 0,
    totalOzSilver: 1.0,
    spotGold: 3000.0,
    spotSilver: 35.0,
    currency: 'USD',
    createdAt: '2026-01-01T00:00:00.000Z',
});

const makeSettings = () => ({
    currency: 'USD' as const,
    weightUnit: 'oz' as const,
    cloudSync: false,
    autoBackupEnabled: false,
    backupReminder: true,
    hideValues: false,
    subscriptionStatus: 'free' as const,
    subscriptionExpiry: null,
    onboardingCompleted: true,
    onboardingStep: 3 as const,
    updatedAt: '2026-01-01T00:00:00.000Z',
});

const makeValidExport = () => ({
    schema_version: 1,
    exported_at: '2026-01-01T00:00:00.000Z',
    labs: [makeLab()],
    decks: [],
    items: [makeItem()],
    stack_snapshots: [makeSnapshot()],
    settings: makeSettings(),
});

describe('ExportSchema — structure de base', () => {
    test('export valide → accepté', () => {
        expect(() => ExportSchema.parse(makeValidExport())).not.toThrow();
    });
    test('export avec arrays vides → accepté', () => {
        const data = { ...makeValidExport(), labs: [], decks: [], items: [], stack_snapshots: [] };
        expect(() => ExportSchema.parse(data)).not.toThrow();
    });
    test('schema_version absent → rejeté', () => {
        const { schema_version: _sv, ...rest } = makeValidExport();
        expect(() => ExportSchema.parse(rest)).toThrow();
    });
    test('settings absent → rejeté', () => {
        const { settings: _s, ...rest } = makeValidExport();
        expect(() => ExportSchema.parse(rest)).toThrow();
    });
    test('schema_version = 0 → rejeté', () => {
        expect(() => ExportSchema.parse({ ...makeValidExport(), schema_version: 0 })).toThrow();
    });
});

describe('ExportSchema — IDs dupliqués (superRefine)', () => {
    test('deux labs avec le même id → rejeté', () => {
        const data = { ...makeValidExport(), labs: [makeLab('lab-1'), makeLab('lab-1')] };
        expect(() => ExportSchema.parse(data)).toThrow();
    });
    test('deux decks avec le même id → rejeté', () => {
        const data = {
            ...makeValidExport(),
            decks: [makeDeck('deck-1'), makeDeck('deck-1')],
        };
        expect(() => ExportSchema.parse(data)).toThrow();
    });
    test('deux items avec le même id → rejeté', () => {
        const data = {
            ...makeValidExport(),
            items: [makeItem('item-1'), makeItem('item-1')],
        };
        expect(() => ExportSchema.parse(data)).toThrow();
    });
});

describe('ExportSchema — intégrité référentielle decks (superRefine)', () => {
    test('deck référence un lab inexistant → rejeté', () => {
        const data = {
            ...makeValidExport(),
            labs: [makeLab('lab-1')],
            decks: [makeDeck('deck-1', 'lab-INCONNU')],
        };
        expect(() => ExportSchema.parse(data)).toThrow();
    });
    test('deck référence un parentId inexistant → rejeté', () => {
        const deck = { ...makeDeck('deck-1', 'lab-1'), parentId: 'deck-INCONNU' };
        const data = { ...makeValidExport(), decks: [deck] };
        expect(() => ExportSchema.parse(data)).toThrow();
    });
    test('deck avec parentId null → accepté', () => {
        const data = { ...makeValidExport(), decks: [makeDeck('deck-1', 'lab-1')] };
        expect(() => ExportSchema.parse(data)).not.toThrow();
    });
    test('deck avec parentId valide → accepté', () => {
        const parent = makeDeck('deck-parent', 'lab-1');
        const child = { ...makeDeck('deck-child', 'lab-1'), parentId: 'deck-parent' };
        const data = { ...makeValidExport(), decks: [parent, child] };
        expect(() => ExportSchema.parse(data)).not.toThrow();
    });
});

describe('ExportSchema — intégrité référentielle items (superRefine)', () => {
    test('item référence un lab inexistant → rejeté', () => {
        const data = {
            ...makeValidExport(),
            labs: [makeLab('lab-1')],
            items: [makeItem('item-1', 'lab-INCONNU')],
        };
        expect(() => ExportSchema.parse(data)).toThrow();
    });
    test('item référence un deck inexistant → rejeté', () => {
        const item = { ...makeItem('item-1', 'lab-1'), deckId: 'deck-INCONNU' };
        const data = { ...makeValidExport(), items: [item] };
        expect(() => ExportSchema.parse(data)).toThrow();
    });
    test('item avec deckId valide → accepté', () => {
        const item = { ...makeItem('item-1', 'lab-1'), deckId: 'deck-1' };
        const data = { ...makeValidExport(), decks: [makeDeck('deck-1', 'lab-1')], items: [item] };
        expect(() => ExportSchema.parse(data)).not.toThrow();
    });
    test('purchaseExchangeRate sans purchaseCurrency → rejeté', () => {
        const item = { ...makeItem(), purchaseExchangeRate: 1.08, purchaseCurrency: null };
        const data = { ...makeValidExport(), items: [item] };
        expect(() => ExportSchema.parse(data)).toThrow();
    });
    test('purchaseExchangeRate avec purchaseCurrency → accepté', () => {
        const item = { ...makeItem(), purchaseExchangeRate: 1.08, purchaseCurrency: 'EUR' as const };
        const data = { ...makeValidExport(), items: [item] };
        expect(() => ExportSchema.parse(data)).not.toThrow();
    });
});
