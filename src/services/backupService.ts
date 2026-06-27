import { labRepository } from '../repositories/labRepository';
import { deckRepository } from '../repositories/deckRepository';
import { itemRepository } from '../repositories/itemRepository';
import { snapshotRepository } from '../repositories/snapshotRepository';
import { settingsRepository } from '../repositories/settingsRepository';
import { withTransaction } from '../db/database';
import { ExportSchema, CURRENT_EXPORT_SCHEMA_VERSION } from '../schemas/export.schema';
import type { ExportData } from '../schemas/export.schema';
import type { Deck } from '../types/deck.types';

function orderDecksByParent(decksToInsert: Deck[], existingDeckIds: Set<string>): Deck[] {
    const insertedIds = new Set(existingDeckIds);
    const ordered: Deck[] = [];
    let remaining = decksToInsert;

    while (remaining.length > 0) {
        const ready = remaining.filter(d => d.parentId === null || insertedIds.has(d.parentId));
        if (ready.length === 0) throw new Error('IMPORT_DECK_CYCLE');

        ready.forEach(d => insertedIds.add(d.id));
        ordered.push(...ready);
        remaining = remaining.filter(d => !ready.includes(d));
    }

    return ordered;
}

async function deleteAllDecks(): Promise<void> {
    let remaining = await deckRepository.findAll();
    while (remaining.length > 0) {
        const leaves = remaining.filter(d => !remaining.some(o => o.parentId === d.id));
        for (const deck of leaves) {
            await deckRepository.delete(deck.id);
        }
        remaining = remaining.filter(d => !leaves.some(l => l.id === d.id));
    }
}

export const backupService = {
    async buildExport(): Promise<ExportData> {
        const [labs, decks, items, stackSnapshots, settings] = await Promise.all([
            labRepository.findAll(),
            deckRepository.findAll(),
            itemRepository.findAll(),
            snapshotRepository.findAll(),
            settingsRepository.get(),
        ]);

        const data = {
            schema_version: CURRENT_EXPORT_SCHEMA_VERSION,
            exported_at: new Date().toISOString(),
            labs,
            decks,
            items,
            stack_snapshots: stackSnapshots,
            settings,
        };

        return ExportSchema.parse(data);
    },

    validateImport(data: unknown): ExportData {
        const parsed = ExportSchema.parse(data);
        if (parsed.schema_version !== CURRENT_EXPORT_SCHEMA_VERSION) {
            throw new Error('IMPORT_VERSION_MISMATCH');
        }
        return parsed;
    },

    async importMerge(parsed: ExportData): Promise<void> {
        const [existingLabs, existingDecks, existingItems, existingSnapshots] = await Promise.all([
            labRepository.findAll(),
            deckRepository.findAll(),
            itemRepository.findAll(),
            snapshotRepository.findAll(),
        ]);

        const existingLabIds = new Set(existingLabs.map(l => l.id));
        const existingDeckIds = new Set(existingDecks.map(d => d.id));
        const existingItemIds = new Set(existingItems.map(i => i.id));
        const existingSnapshotDates = new Set(existingSnapshots.map(s => s.date));

        const newLabs = parsed.labs.filter(l => !existingLabIds.has(l.id));
        const newItems = parsed.items.filter(i => !existingItemIds.has(i.id));
        const newSnapshots = parsed.stack_snapshots.filter(s => !existingSnapshotDates.has(s.date));
        const orderedNewDecks = orderDecksByParent(
            parsed.decks.filter(d => !existingDeckIds.has(d.id)),
            existingDeckIds
        );

        await withTransaction(async () => {
            for (const lab of newLabs) await labRepository.restore(lab);
            for (const deck of orderedNewDecks) await deckRepository.restore(deck);
            for (const item of newItems) await itemRepository.restore(item);
            for (const snapshot of newSnapshots) await snapshotRepository.restore(snapshot);
        });
    },

    async importReplace(parsed: ExportData): Promise<void> {
        const orderedDecks = orderDecksByParent(parsed.decks, new Set());

        await withTransaction(async () => {
            const allItems = await itemRepository.findAll();
            for (const item of allItems) await itemRepository.delete(item.id);

            const allSnapshots = await snapshotRepository.findAll();
            for (const snapshot of allSnapshots) await snapshotRepository.delete(snapshot.id);

            await deleteAllDecks();

            const allLabs = await labRepository.findAll();
            for (const lab of allLabs) await labRepository.delete(lab.id);

            for (const lab of parsed.labs) await labRepository.restore(lab);
            for (const deck of orderedDecks) await deckRepository.restore(deck);
            for (const item of parsed.items) await itemRepository.restore(item);
            for (const snapshot of parsed.stack_snapshots) await snapshotRepository.restore(snapshot);
        });
    },
};
