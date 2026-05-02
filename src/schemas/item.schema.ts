import { z } from 'zod';
import {
    isValidPurity,
    isValidWeight,
    isValidQuantity,
    isValidYear,
    isValidPrice,
    isValidExchangeRate,
} from '../utils/validators';

export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);

export const ItemCreateSchema = z.object({
    labId: z.string().min(1, 'Lab is required'),
    deckId: z.string().nullable().optional(),
    status: z.enum(['active', 'wishlist']),
    name: z.string().min(1, 'Series name is required'),
    metal: z.enum(['gold', 'silver']),
    mintName: z.string().nullable().optional(),
    shape: z.enum(['coin', 'bar', 'token', 'bust', 'custom']),
    shapeDescription: z.string().nullable().optional(),
    weightInput: z.number().refine(isValidWeight, { message: 'Weight must be greater than 0' }),
    weightUnit: z.enum(['oz', 'g', 'kg']),
    purity: z.number().refine(isValidPurity, { message: 'Purity must be between 0 and 1' }),
    year: z.number().refine(isValidYear, { message: 'Year is not valid' }).nullable().optional(),
    strikeFinish: z.enum(['BU', 'proof', 'reverse_proof', 'antique', 'matte', 'specimen', 'burnished', 'proof_like', 'unknown']).nullable().optional(),
    condition: z.enum(['uncirculated', 'circulated', 'damaged', 'unknown']).nullable().optional(),
    features: z.array(z.enum(['privy', 'colorized', 'gilded', 'high_relief', 'ultra_high_relief', 'hologram', 'enamel', 'ruthenium', 'plated', 'insert', 'numbered_certificate'])).optional(),
    packaging: z.array(z.enum(['sealed', 'capsule', 'mint_box', 'with_certificate', 'raw'])).optional(),
    gradingCompany: z.string().nullable().optional(),
    gradeValue: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    quantity: z.number().refine(isValidQuantity, { message: 'Quantity must be a whole number of at least 1' }),
    purchasePrice: z.number().nullable().optional(),
    purchasePriceIsPerUnit: z.boolean().optional(),
    purchaseCurrency: CurrencySchema.nullable().optional(),
    purchaseExchangeRate: z.number().nullable().optional(),
    purchaseDate: z.string().nullable().optional(),
    observedPrice: z.number().nullable().optional(),
    observedPriceIsPerUnit: z.boolean().optional(),
    observedCurrency: CurrencySchema.nullable().optional(),
    observedPriceDate: z.string().nullable().optional(),
    photoUrl: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
    if (data.purchasePrice != null) {
        if (!isValidPrice(data.purchasePrice)) {
            ctx.addIssue({
                code: 'custom',
                message: 'Purchase price must be 0 or greater',
                path: ['purchasePrice'],
            });
        }
        if (data.purchasePriceIsPerUnit === undefined) {
            ctx.addIssue({
                code: 'custom',
                message: 'Price type (per unit or lot) is required',
                path: ['purchasePriceIsPerUnit'],
            });
        }
    }
    if (data.purchaseExchangeRate != null && !isValidExchangeRate(data.purchaseExchangeRate)) {
        ctx.addIssue({
            code: 'custom',
            message: 'Exchange rate must be greater than 0',
            path: ['purchaseExchangeRate'],
        });
    }
    if (data.observedPrice != null) {
        if (!isValidPrice(data.observedPrice)) {
            ctx.addIssue({
                code: 'custom',
                message: 'Observed price must be 0 or greater',
                path: ['observedPrice'],
            });
        }
        if (data.observedPriceIsPerUnit === undefined) {
            ctx.addIssue({
                code: 'custom',
                message: 'Price type (per unit or lot) is required',
                path: ['observedPriceIsPerUnit'],
            });
        }
    }
});

