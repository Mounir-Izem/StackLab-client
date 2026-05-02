import { labRepository } from '../repositories/labRepository';
import { deckRepository } from '../repositories/deckRepository';
import { itemRepository } from '../repositories/itemRepository';
import { withTransaction } from '../db/database';
import { calcFineWeightOz } from '../utils/calculations';
import { generateUUID } from '../utils/uuid';
import type { Lab, LabType } from '../types/lab.types';

async function deleteDeckTree(labId: string): Promise<void> {
    let remaining = await deckRepository.findByLabId(labId);
    while (remaining.length > 0) {
        const leaves = remaining.filter(d => !remaining.some(o => o.parentId === d.id));
        for (const deck of leaves) {
            await deckRepository.delete(deck.id);
        }
        remaining = remaining.filter(d => !leaves.some(l => l.id === d.id));
    }
}

export const labService = {
    async getAll(): Promise<Lab[]> {
        return labRepository.findAll();
    },

    async getItemCountsByLab(): Promise<Record<string, number>> {
        return labRepository.getItemCountsByLab();
    },

    async getOzTotalsByLab(): Promise<Record<string, { gold: number; silver: number }>> {
        const [trashLab, activeItems] = await Promise.all([
            labRepository.findByType('trash'),
            itemRepository.findAll('active'),
        ]);

        const nonTrashItems = trashLab
            ? activeItems.filter(i => i.labId !== trashLab.id)
            : activeItems;

        const totals: Record<string, { gold: number; silver: number }> = {};

        for (const item of nonTrashItems) {
            if (!totals[item.labId]) totals[item.labId] = { gold: 0, silver: 0 };
            const fineOz = calcFineWeightOz(item.weightOz, item.purity) * item.quantity;
            if (item.metal === 'gold') totals[item.labId].gold += fineOz;
            else totals[item.labId].silver += fineOz;
        }

        return totals;
    },

    async create(name: string, type: LabType): Promise<Lab> {
        const existing = await labRepository.findAll();
        return labRepository.create({
            id: generateUUID(),
            userId: null,
            name,
            coverPhotoUrl: null,
            type,
            isSystem: false,
            position: existing.length,
        });
    },

    async rename(id: string, name: string): Promise<Lab> {
        return labRepository.update(id, { name });
    },

    async reorder(orderedIds: string[]): Promise<void> {
        for (let i = 0; i < orderedIds.length; i++) {
            await labRepository.update(orderedIds[i], { position: i });
        }
    },

    async deleteWithContent(id: string): Promise<void> {
        const lab = await labRepository.findById(id);
        if (!lab) throw new Error('LAB_NOT_FOUND');
        if (lab.isSystem) throw new Error('CANNOT_DELETE_SYSTEM_LAB');

        const trashLab = await labRepository.findByType('trash');
        if (!trashLab) throw new Error('TRASH_LAB_NOT_FOUND');

        const items = await itemRepository.findByLabId(id);

        // Move all items to trash — photos preserved
        await withTransaction(async () => {
            for (const item of items) {
                await itemRepository.update(item.id, { labId: trashLab.id, deckId: null });
            }
            await deleteDeckTree(id);
            await labRepository.delete(id);
        });
    },

    async deleteAndMigrate(id: string, targetLabId: string): Promise<void> {
        const items = await itemRepository.findByLabId(id);

        await withTransaction(async () => {
            for (const item of items) {
                await itemRepository.update(item.id, { labId: targetLabId, deckId: null });
            }
            await deleteDeckTree(id);
            await labRepository.delete(id);
        });
    },
};
