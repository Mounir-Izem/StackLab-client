import { z } from 'zod';

export const LabCreateSchema = z.object({
    name: z.string().min(1, 'Lab name is required'),
    type: z.enum(['standard', 'wishlist', 'trash']),
});

export const LabRenameSchema = z.object({
    name: z.string().min(1, 'Lab name is required'),
});

export const DeckCreateSchema = z.object({
    name: z.string().min(1, 'Deck name is required'),
    labId: z.string().min(1, 'Lab is required'),
});

export const DeckRenameSchema = z.object({
    name: z.string().min(1, 'Deck name is required'),
});
