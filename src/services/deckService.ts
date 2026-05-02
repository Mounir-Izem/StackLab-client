import { deckRepository } from '../repositories/deckRepository';
import { itemRepository } from '../repositories/itemRepository';
import { withTransaction } from '../db/database';
import { generateUUID } from '../utils/uuid';
import type { Deck } from '../types/deck.types';

function getDescendantIds(rootId: string, allDecks: Deck[]): string[] {
    const result: string[] = [];
    const queue = [rootId];
    while (queue.length > 0) {
        const current = queue.shift()!;
        const children = allDecks.filter(d => d.parentId === current);
        for (const child of children) {
            result.push(child.id);
            queue.push(child.id);
        }
    }
    return result;
}

export const deckService = {
    async getByLabId(labId: string): Promise<Deck[]> {
        return deckRepository.findByLabId(labId);
    },

    async create(name: string, labId: string, parentId?: string): Promise<Deck> {
        const siblings = parentId
            ? await deckRepository.findByParentId(parentId)
            : (await deckRepository.findByLabId(labId)).filter(d => d.parentId === null);
        return deckRepository.create({
            id: generateUUID(),
            labId,
            parentId: parentId ?? null,
            name,
            coverPhotoUrl: null,
            position: siblings.length,
        });
    },

    async rename(id: string, name: string): Promise<Deck> {
        return deckRepository.update(id, { name });
    },

    async move(id: string, newParentId: string | null, newLabId: string): Promise<Deck> {
        const deck = await deckRepository.findById(id);
        if (!deck) throw new Error('DECK_NOT_FOUND');

        const itemIds: string[] = [];
        const descendantIds: string[] = [];

        if (deck.labId !== newLabId) {
            const items = await itemRepository.findByDeckIdRecursive(id);
            items.forEach(i => itemIds.push(i.id));
            const allLabDecks = await deckRepository.findByLabId(deck.labId);
            getDescendantIds(id, allLabDecks).forEach(d => descendantIds.push(d));
        }

        return withTransaction(async () => {
            for (const itemId of itemIds) {
                await itemRepository.update(itemId, { labId: newLabId });
            }
            for (const descId of descendantIds) {
                await deckRepository.update(descId, { labId: newLabId });
            }
            return deckRepository.update(id, { parentId: newParentId, labId: newLabId });
        });
    },

    async delete(id: string): Promise<void> {
        const deck = await deckRepository.findById(id);
        if (!deck) throw new Error('DECK_NOT_FOUND');

        const items = await itemRepository.findByDeckId(id);
        const subDecks = await deckRepository.findByParentId(id);

        await withTransaction(async () => {
            for (const item of items) {
                await itemRepository.update(item.id, { deckId: deck.parentId });
            }
            for (const sub of subDecks) {
                await deckRepository.update(sub.id, { parentId: deck.parentId });
            }
            await deckRepository.delete(id);
        });
    },
};
