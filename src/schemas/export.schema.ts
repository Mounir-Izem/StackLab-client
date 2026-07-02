import { z } from 'zod';
import { CurrencySchema } from './item.schema';

const LabExportSchema = z.object({
    id: z.string().min(1),
    userId: z.string().nullable(),
    name: z.string().min(1),
    type: z.enum(['standard', 'wishlist', 'trash']),
    isSystem: z.boolean().default(false),
    coverPhotoUrl: z.string().nullable(),
    position: z.number().int().min(0),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
});

const DeckExportSchema = z.object({
    id: z.string().min(1),
    labId: z.string().min(1),
    parentId: z.string().nullable(),
    name: z.string().min(1),
    coverPhotoUrl: z.string().nullable(),
    position: z.number().int().min(0),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
});

const ItemExportSchema = z.object({
    id: z.string().min(1),
    labId: z.string().min(1),
    deckId: z.string().nullable(),
    status: z.enum(['active', 'sold', 'wishlist']),
    name: z.string().min(1),
    familyKey: z.string().min(1),
    metal: z.enum(['gold', 'silver']),
    mintName: z.string().nullable(),
    shape: z.enum(['coin', 'bar', 'token', 'bust', 'custom']),
    shapeDescription: z.string().nullable(),
    weightOz: z.number().positive(),
    weightUnitInput: z.enum(['oz', 'g', 'kg']),
    purity: z.number().gt(0).lte(1),
    year: z.number().int().nullable(),
    strikeFinish: z.enum(['BU', 'proof', 'reverse_proof', 'antique', 'matte', 'specimen', 'burnished', 'proof_like', 'unknown']).nullable(),
    condition: z.enum(['uncirculated', 'circulated', 'damaged', 'unknown']).nullable(),
    features: z.array(z.enum(['privy', 'colorized', 'gilded', 'high_relief', 'ultra_high_relief', 'hologram', 'enamel', 'ruthenium', 'plated', 'insert', 'numbered_certificate'])),
    packaging: z.array(z.enum(['sealed', 'capsule', 'mint_box', 'with_certificate', 'raw'])),
    gradingCompany: z.string().nullable(),
    gradeValue: z.string().nullable(),
    notes: z.string().nullable(),
    quantity: z.number().int().min(1),
    purchasePrice: z.number().min(0).nullable(),
    purchaseCurrency: CurrencySchema.nullable(),
    purchaseExchangeRate: z.number().positive().nullable(),
    purchaseDate: z.string().nullable(),
    observedPrice: z.number().min(0).nullable(),
    observedCurrency: CurrencySchema.nullable(),
    observedPriceDate: z.string().nullable(),
    soldDate: z.string().nullable(),
    soldPrice: z.number().min(0).nullable(),
    soldCurrency: CurrencySchema.nullable(),
    photoUrl: z.string().nullable(),
    location: z.string().nullable(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
});

const StackSnapshotExportSchema = z.object({
    id: z.string().min(1),
    date: z.string().min(1),
    totalValue: z.number(),
    totalOzGold: z.number().min(0),
    totalOzSilver: z.number().min(0),
    spotGold: z.number().positive(),
    spotSilver: z.number().positive(),
    currency: z.string().min(1),
    createdAt: z.string().min(1),
});

const SettingsExportSchema = z.object({
    currency: CurrencySchema,
    weightUnit: z.enum(['oz', 'g', 'kg']),
    cloudSync: z.boolean(),
    autoBackupEnabled: z.boolean(),
    backupReminder: z.boolean(),
    backupBannerDismissed: z.boolean(),
    lastBackupAt: z.string().nullable(),
    appLockEnabled: z.boolean(),
    appLockAutoWipeEnabled: z.boolean(),
    appLockPromptShown: z.boolean(),
    hideValues: z.boolean(),
    subscriptionStatus: z.enum(['free', 'monthly', 'annual']),
    subscriptionExpiry: z.string().nullable(),
    onboardingCompleted: z.boolean(),
    onboardingStep: z.union([z.literal(0), z.literal(1)]),
    language: z.enum(['system', 'en', 'fr']).default('system'),
    updatedAt: z.string().min(1),
});

export const CURRENT_EXPORT_SCHEMA_VERSION = 1;

export const ExportSchema = z.object({
    schema_version: z.number().int().positive(),
    exported_at: z.string().min(1),
    labs: z.array(LabExportSchema),
    decks: z.array(DeckExportSchema),
    items: z.array(ItemExportSchema),
    stack_snapshots: z.array(StackSnapshotExportSchema),
    settings: SettingsExportSchema,
}).superRefine((data, ctx) => {
    const labIds = new Set(data.labs.map(l => l.id));
    const deckIds = new Set(data.decks.map(d => d.id));
    const itemIds = new Set(data.items.map(i => i.id));

    if (labIds.size !== data.labs.length) {
        ctx.addIssue({ code: 'custom', message: 'Duplicate lab IDs detected', path: ['labs'] });
    }
    if (deckIds.size !== data.decks.length) {
        ctx.addIssue({ code: 'custom', message: 'Duplicate deck IDs detected', path: ['decks'] });
    }
    if (itemIds.size !== data.items.length) {
        ctx.addIssue({ code: 'custom', message: 'Duplicate item IDs detected', path: ['items'] });
    }

    data.decks.forEach((deck, i) => {
        if (!labIds.has(deck.labId)) {
            ctx.addIssue({ code: 'custom', message: 'Deck references unknown lab', path: ['decks', i, 'labId'] });
        }
        if (deck.parentId !== null && !deckIds.has(deck.parentId)) {
            ctx.addIssue({ code: 'custom', message: 'Deck references unknown parent deck', path: ['decks', i, 'parentId'] });
        }
    });

    data.items.forEach((item, i) => {
        if (!labIds.has(item.labId)) {
            ctx.addIssue({ code: 'custom', message: 'Item references unknown lab', path: ['items', i, 'labId'] });
        }
        if (item.deckId !== null && !deckIds.has(item.deckId)) {
            ctx.addIssue({ code: 'custom', message: 'Item references unknown deck', path: ['items', i, 'deckId'] });
        }
        if (item.purchaseExchangeRate !== null && item.purchaseCurrency === null) {
            ctx.addIssue({ code: 'custom', message: 'Purchase exchange rate requires a currency', path: ['items', i, 'purchaseCurrency'] });
        }
    });
});

export type ExportData = z.infer<typeof ExportSchema>;
