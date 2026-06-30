import { labRepository } from '../repositories/labRepository';
import { deckRepository } from '../repositories/deckRepository';
import { itemRepository } from '../repositories/itemRepository';
import { withTransaction } from '../db/database';
import { calcFineWeightOz } from '../utils/calculations';
import { generateUUID } from '../utils/uuid';
import type { Lab, LabType } from '../types/lab.types';

// Partagé par deleteWithContent et deleteAndMigrate : les 3 labs système
// (standard principal, Wishlist, Trash) ne sont jamais supprimables, peu importe
// la voie de suppression. Garder ce garde-fou à un seul endroit évite qu'une des
// deux fonctions l'oublie si la règle évolue (c'est déjà arrivé une fois).
async function requireDeletableLab(id: string): Promise<void> {
    const lab = await labRepository.findById(id);
    if (!lab) throw new Error('LAB_NOT_FOUND');
    if (lab.isSystem) throw new Error('CANNOT_DELETE_SYSTEM_LAB');
}

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

const SYSTEM_LABS: { type: LabType; name: string }[] = [
    { type: 'standard', name: 'My Stack' },
    { type: 'wishlist', name: 'Wishlist' },
    { type: 'trash', name: 'Trash' },
];

export const labService = {
    async getAll(): Promise<Lab[]> {
        return labRepository.findAll();
    },

    async ensureSystemLabs(): Promise<void> {
        for (let i = 0; i < SYSTEM_LABS.length; i++) {
            const { type, name } = SYSTEM_LABS[i];
            const existing = await labRepository.findByType(type);
            if (existing) continue;

            await labRepository.create({
                id: generateUUID(),
                userId: null,
                name,
                coverPhotoUrl: null,
                type,
                isSystem: true,
                position: i,
            });
        }
    },

    // Active portfolio = status 'active' ET lab.type 'standard'. Le check explicite sur
    // lab.type (plutôt qu'une simple exclusion du lab Trash) garantit qu'on ne compte
    // jamais un item actif qui se trouverait par accident hors d'un lab standard.
    async getActiveSummaryByLab(): Promise<Record<string, { cards: number; units: number }>> {
        const [labs, activeItems] = await Promise.all([
            labRepository.findAll(),
            itemRepository.findAll('active'),
        ]);

        const standardLabIds = new Set(labs.filter(l => l.type === 'standard').map(l => l.id));
        const totals: Record<string, { cards: number; units: number }> = {};

        for (const item of activeItems) {
            if (!standardLabIds.has(item.labId)) continue;
            if (!totals[item.labId]) totals[item.labId] = { cards: 0, units: 0 };
            totals[item.labId].cards += 1;
            totals[item.labId].units += item.quantity;
        }

        return totals;
    },

    // Wishlist = status 'wishlist' ET lab.type 'wishlist'. Un seul lab Wishlist existe
    // dans l'app (système) — pas besoin d'un Record par lab ici.
    async getWishlistSummary(): Promise<{ cards: number; units: number }> {
        const [wishlistLab, wishlistItems] = await Promise.all([
            labRepository.findByType('wishlist'),
            itemRepository.findAll('wishlist'),
        ]);

        const items = wishlistLab ? wishlistItems.filter(i => i.labId === wishlistLab.id) : [];
        return {
            cards: items.length,
            units: items.reduce((sum, i) => sum + i.quantity, 0),
        };
    },

    // Sold history = status 'sold' ET hors Trash. Trash prime sur tout : un item vendu
    // déplacé vers Trash disparaît de cet agrégat (visible seulement dans Trash).
    // proceeds/costBasis restent séparés par devise — la conversion vers la devise
    // d'affichage se fait à l'affichage (cf. calcRealizedPnL + sumByCurrency).
    async getSoldSummary(): Promise<{
        cards: number;
        units: number;
        proceedsByCurrency: Record<string, number>;
        costBasisByCurrency: Record<string, number>;
    }> {
        const [trashLab, soldItems] = await Promise.all([
            labRepository.findByType('trash'),
            itemRepository.findAll('sold'),
        ]);

        const nonTrashItems = trashLab
            ? soldItems.filter(i => i.labId !== trashLab.id)
            : soldItems;

        const summary = {
            cards: 0,
            units: 0,
            proceedsByCurrency: {} as Record<string, number>,
            costBasisByCurrency: {} as Record<string, number>,
        };

        for (const item of nonTrashItems) {
            summary.cards += 1;
            summary.units += item.quantity;
            if (item.soldPrice !== null) {
                const cur = item.soldCurrency ?? 'USD';
                summary.proceedsByCurrency[cur] = (summary.proceedsByCurrency[cur] ?? 0) + item.soldPrice;
            }
            if (item.purchasePrice !== null) {
                const cur = item.purchaseCurrency ?? 'USD';
                summary.costBasisByCurrency[cur] = (summary.costBasisByCurrency[cur] ?? 0) + item.purchasePrice;
            }
        }

        return summary;
    },

    // Trash prime sur tout : un item y conserve son status d'origine (active/sold/wishlist)
    // mais n'est compté nulle part ailleurs. Ce compteur est le seul endroit où on l'agrège.
    async getTrashSummary(): Promise<{ cards: number; units: number }> {
        const trashLab = await labRepository.findByType('trash');
        if (!trashLab) return { cards: 0, units: 0 };

        const items = await itemRepository.findByLabId(trashLab.id);
        return {
            cards: items.length,
            units: items.reduce((sum, i) => sum + i.quantity, 0),
        };
    },

    async getInvestedTotalsByLab(): Promise<Record<string, Record<string, number>>> {
        const [trashLab, activeItems] = await Promise.all([
            labRepository.findByType('trash'),
            itemRepository.findAll('active'),
        ]);

        const nonTrashItems = trashLab
            ? activeItems.filter(i => i.labId !== trashLab.id)
            : activeItems;

        const totals: Record<string, Record<string, number>> = {};

        for (const item of nonTrashItems) {
            if (item.purchasePrice === null) continue;
            const cur = item.purchaseCurrency ?? 'USD';
            if (!totals[item.labId]) totals[item.labId] = {};
            // purchasePrice est déjà le coût total du row pour sa quantity — ne jamais remultiplier.
            totals[item.labId][cur] = (totals[item.labId][cur] ?? 0) + item.purchasePrice;
        }

        return totals;
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
        await requireDeletableLab(id);

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
        await requireDeletableLab(id);

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
