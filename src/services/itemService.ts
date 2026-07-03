import * as FileSystem from 'expo-file-system';
import { itemRepository } from '../repositories/itemRepository';
import { labRepository } from '../repositories/labRepository';
import { withTransaction } from '../db/database';
import { toTroyOz, generateFamilyKey, proratePurchasePrice } from '../utils/calculations';
import { generateUUID } from '../utils/uuid';
import type { Item, ItemMetal, ItemShape, ItemStatus, ItemWeightUnit, StrikeFinish, ItemCondition, ItemFeature, ItemPackaging } from '../types/item.types';
import type { Currency } from '../types/settings.types';

type PurchasePriceInput =
    | { purchasePrice?: null; purchasePriceIsPerUnit?: never }
    | { purchasePrice: number; purchasePriceIsPerUnit: boolean }

type ObservedPriceInput =
    | { observedPrice?: null; observedPriceIsPerUnit?: never }
    | { observedPrice: number; observedPriceIsPerUnit: boolean }

type ItemCreateInputBase = {
    labId: string;
    deckId?: string | null;
    status: Exclude<ItemStatus, 'sold'>;
    name: string;
    metal: ItemMetal;
    mintName?: string | null;
    shape: ItemShape;
    shapeDescription?: string | null;
    weightInput: number;
    weightUnit: ItemWeightUnit;
    purity: number;
    year?: number | null;
    strikeFinish?: StrikeFinish | null;
    condition?: ItemCondition | null;
    features?: ItemFeature[];
    packaging?: ItemPackaging[];
    gradingCompany?: string | null;
    gradeValue?: string | null;
    notes?: string | null;
    quantity: number;
    purchaseCurrency?: Currency | null;
    purchaseExchangeRate?: number | null;
    purchaseDate?: string | null;
    observedCurrency?: Currency | null;
    observedPriceDate?: string | null;
    photoUrl?: string | null;
    location?: string | null;
};

export type ItemCreateInput = ItemCreateInputBase & PurchasePriceInput & ObservedPriceInput;

export const itemService = {
    async getByLabId(labId: string): Promise<Item[]> {
        return itemRepository.findByLabId(labId);
    },

    async create(data: ItemCreateInput): Promise<Item> {
        const purchasePrice = data.purchasePrice != null
            ? (data.purchasePriceIsPerUnit ? data.purchasePrice * data.quantity : data.purchasePrice)
            : null;

        const observedPrice = data.observedPrice != null
            ? (data.observedPriceIsPerUnit ? data.observedPrice * data.quantity : data.observedPrice)
            : null;

        return itemRepository.create({
            id: generateUUID(),
            labId: data.labId,
            deckId: data.deckId ?? null,
            status: data.status,
            name: data.name,
            familyKey: generateFamilyKey(data.name, data.metal),
            metal: data.metal,
            mintName: data.mintName ?? null,
            shape: data.shape,
            shapeDescription: data.shapeDescription ?? null,
            weightOz: toTroyOz(data.weightInput, data.weightUnit),
            weightUnitInput: data.weightUnit,
            purity: data.purity,
            year: data.year ?? null,
            strikeFinish: data.strikeFinish ?? null,
            condition: data.condition ?? null,
            gradingCompany: data.gradingCompany ?? null,
            gradeValue: data.gradeValue ?? null,
            notes: data.notes ?? null,
            quantity: data.quantity,
            purchasePrice,
            purchaseCurrency: data.purchaseCurrency ?? null,
            purchaseExchangeRate: data.purchaseExchangeRate ?? null,
            purchaseDate: data.purchaseDate ?? null,
            observedPrice,
            observedCurrency: data.observedCurrency ?? null,
            observedPriceDate: data.observedPriceDate ?? null,
            soldDate: null,
            soldPrice: null,
            soldCurrency: null,
            photoUrl: data.photoUrl ?? null,
            location: data.location ?? null,
            features: data.features ?? [],
            packaging: data.packaging ?? [],
        });
    },

    // purchasePrice est exclu volontairement : il doit toujours passer par updatePurchasePrice()
    // pour être normalisé (total vs per-unit), jamais écrit brut. Garde runtime en plus du
    // type, car un objet "data" externe peut contenir le champ sans que TS le détecte.
    async update(id: string, data: Partial<Omit<Item, 'id' | 'familyKey' | 'createdAt' | 'updatedAt' | 'purchasePrice'>>): Promise<Item> {
        if ('purchasePrice' in data) throw new Error('USE_UPDATE_PURCHASE_PRICE');
        return itemRepository.update(id, data);
    },

    async updatePurchasePrice(id: string, purchasePrice: number | null, purchasePriceIsPerUnit: boolean): Promise<Item> {
        const item = await itemRepository.findById(id);
        if (!item) throw new Error('ITEM_NOT_FOUND');
        const normalizedPurchasePrice = purchasePrice != null
            ? (purchasePriceIsPerUnit ? purchasePrice * item.quantity : purchasePrice)
            : null;
        return itemRepository.update(id, { purchasePrice: normalizedPurchasePrice });
    },

    async updateObservedPrice(
        id: string,
        observedPrice: number | null,
        observedPriceIsPerUnit: boolean,
        observedCurrency: Currency | null,
        observedPriceDate: string | null,
    ): Promise<Item> {
        const item = await itemRepository.findById(id);
        if (!item) throw new Error('ITEM_NOT_FOUND');
        if (item.status !== 'wishlist') throw new Error('ITEM_NOT_WISHLIST');
        const normalizedObservedPrice = observedPrice != null
            ? (observedPriceIsPerUnit ? observedPrice * item.quantity : observedPrice)
            : null;
        return itemRepository.update(id, {
            observedPrice: normalizedObservedPrice,
            observedCurrency: normalizedObservedPrice != null ? observedCurrency : null,
            observedPriceDate: normalizedObservedPrice != null ? observedPriceDate : null,
        });
    },

    async sell(
        id: string,
        qty: number,
        soldPrice: number | null,
        perUnit: boolean,
        soldCurrency: Currency,
        soldDate: string,
    ): Promise<void> {
        const item = await itemRepository.findById(id);
        if (!item) throw new Error('ITEM_NOT_FOUND');
        if (item.status !== 'active') throw new Error('ITEM_NOT_SELLABLE');
        if (qty < 1) throw new Error('INVALID_QTY');
        if (qty > item.quantity) throw new Error('QTY_EXCEEDS_STOCK');

        const finalSoldPrice = soldPrice !== null && perUnit ? soldPrice * qty : soldPrice;

        if (qty === item.quantity) {
            await itemRepository.update(id, { status: 'sold', soldDate, soldPrice: finalSoldPrice, soldCurrency });
            return;
        }

        const { extracted, remaining } = proratePurchasePrice(item.purchasePrice, qty, item.quantity);
        const { createdAt: _c, updatedAt: _u, ...base } = item;
        await withTransaction(async () => {
            await itemRepository.update(id, { quantity: item.quantity - qty, purchasePrice: remaining });
            await itemRepository.create({
                ...base,
                id: generateUUID(),
                quantity: qty,
                purchasePrice: extracted,
                status: 'sold',
                soldDate,
                soldPrice: finalSoldPrice,
                soldCurrency,
                observedPrice: null,
                observedCurrency: null,
                observedPriceDate: null,
            });
        });
    },

    async sellMany(sells: Array<{
        id: string;
        qty: number;
        soldPrice: number | null;
        perUnit: boolean;
        soldCurrency: Currency;
        soldDate: string;
    }>): Promise<void> {
        if (sells.length === 0) return;

        const validated: Array<{ sell: (typeof sells)[0]; item: Item }> = [];
        for (const sell of sells) {
            const item = await itemRepository.findById(sell.id);
            if (!item) throw new Error(`ITEM_NOT_FOUND: ${sell.id}`);
            if (item.status !== 'active') throw new Error(`ITEM_NOT_SELLABLE: ${sell.id}`);
            if (sell.qty < 1) throw new Error(`INVALID_QTY: ${sell.id}`);
            if (sell.qty > item.quantity) throw new Error(`QTY_EXCEEDS_STOCK: ${sell.id}`);
            validated.push({ sell, item });
        }

        await withTransaction(async () => {
            for (const { sell, item } of validated) {
                const finalSoldPrice = sell.soldPrice !== null && sell.perUnit
                    ? sell.soldPrice * sell.qty
                    : sell.soldPrice;

                if (sell.qty === item.quantity) {
                    await itemRepository.update(item.id, {
                        status: 'sold',
                        soldDate: sell.soldDate,
                        soldPrice: finalSoldPrice,
                        soldCurrency: sell.soldCurrency,
                    });
                } else {
                    const { extracted, remaining } = proratePurchasePrice(item.purchasePrice, sell.qty, item.quantity);
                    const { createdAt: _c, updatedAt: _u, ...base } = item;
                    await itemRepository.update(item.id, { quantity: item.quantity - sell.qty, purchasePrice: remaining });
                    await itemRepository.create({
                        ...base,
                        id: generateUUID(),
                        quantity: sell.qty,
                        purchasePrice: extracted,
                        status: 'sold',
                        soldDate: sell.soldDate,
                        soldPrice: finalSoldPrice,
                        soldCurrency: sell.soldCurrency,
                        observedPrice: null,
                        observedCurrency: null,
                        observedPriceDate: null,
                    });
                }
            }
        });
    },

    async move(id: string, qty: number, targetLabId: string, targetDeckId: string | null): Promise<void> {
        const item = await itemRepository.findById(id);
        if (!item) throw new Error('ITEM_NOT_FOUND');
        if (qty < 1) throw new Error('INVALID_QTY');
        if (qty > item.quantity) throw new Error('QTY_EXCEEDS_STOCK');

        if (qty === item.quantity) {
            await itemRepository.update(id, { labId: targetLabId, deckId: targetDeckId });
            return;
        }

        const { extracted, remaining } = proratePurchasePrice(item.purchasePrice, qty, item.quantity);
        const { createdAt: _c, updatedAt: _u, ...base } = item;
        await withTransaction(async () => {
            await itemRepository.update(id, { quantity: item.quantity - qty, purchasePrice: remaining });
            await itemRepository.create({ ...base, id: generateUUID(), labId: targetLabId, deckId: targetDeckId, quantity: qty, purchasePrice: extracted });
        });
    },

    async extract(id: string, qty: number): Promise<void> {
        const item = await itemRepository.findById(id);
        if (!item) throw new Error('ITEM_NOT_FOUND');
        if (qty < 1) throw new Error('INVALID_QTY');
        if (qty >= item.quantity) throw new Error('EXTRACT_REQUIRES_PARTIAL_QTY');

        const { extracted, remaining } = proratePurchasePrice(item.purchasePrice, qty, item.quantity);
        const { createdAt: _c, updatedAt: _u, ...base } = item;
        await withTransaction(async () => {
            await itemRepository.update(id, { quantity: item.quantity - qty, purchasePrice: remaining });
            await itemRepository.create({ ...base, id: generateUUID(), quantity: qty, purchasePrice: extracted });
        });
    },

    async duplicate(id: string): Promise<Item> {
        const item = await itemRepository.findById(id);
        if (!item) throw new Error('ITEM_NOT_FOUND');
        const { createdAt: _c, updatedAt: _u, ...base } = item;
        return itemRepository.create({ ...base, id: generateUUID() });
    },

    async delete(id: string, qty?: number): Promise<void> {
        const item = await itemRepository.findById(id);
        if (!item) throw new Error('ITEM_NOT_FOUND');

        if (qty === undefined) {
            const trashLab = await labRepository.findByType('trash');
            if (!trashLab) throw new Error('TRASH_LAB_NOT_FOUND');

            if (item.labId === trashLab.id) {
                // Already in trash: permanent delete
                if (item.photoUrl) {
                    const file = new FileSystem.File(item.photoUrl);
                    if (file.exists) file.delete();
                }
                await itemRepository.delete(id);
            } else {
                // Soft delete: move to trash, clear deck reference
                await itemRepository.update(id, { labId: trashLab.id, deckId: null });
            }
            return;
        }

        // Partial quantity reduction — physical, no trash. The cost basis of the
        // destroyed units is dropped (no row survives to carry it); only the
        // surviving quantity's prorated purchasePrice is kept.
        if (qty < 1) throw new Error('INVALID_QTY');
        if (qty >= item.quantity) throw new Error('QTY_EXCEEDS_STOCK');
        const survivingQty = item.quantity - qty;
        const { extracted: keptPurchasePrice } = proratePurchasePrice(item.purchasePrice, survivingQty, item.quantity);
        await itemRepository.update(id, { quantity: survivingQty, purchasePrice: keptPurchasePrice });
    },

    async restoreFromTrash(id: string, targetLabId: string, targetDeckId: string | null): Promise<void> {
        const item = await itemRepository.findById(id);
        if (!item) throw new Error('ITEM_NOT_FOUND');
        const trashLab = await labRepository.findByType('trash');
        if (!trashLab || item.labId !== trashLab.id) throw new Error('ITEM_NOT_IN_TRASH');
        await itemRepository.update(id, { labId: targetLabId, deckId: targetDeckId });
    },

    async acquire(
        id: string,
        qty: number,
        targetLabId: string,
        targetDeckId: string | null,
        purchasePrice?: number | null,
        purchaseCurrency?: Currency | null,
        purchasePriceIsPerUnit: boolean = false,
    ): Promise<void> {
        const item = await itemRepository.findById(id);
        if (!item) throw new Error('ITEM_NOT_FOUND');
        if (item.status !== 'wishlist') throw new Error('ITEM_NOT_WISHLIST');
        if (qty < 1) throw new Error('INVALID_QTY');
        if (qty > item.quantity) throw new Error('QTY_EXCEEDS_STOCK');

        // L'acquisition est un nouvel événement d'achat : le prix saisi décrit
        // toujours la quantité acquise (qty), jamais l'ancienne quantité du wishlist row.
        const normalizedPurchasePrice = purchasePrice != null
            ? (purchasePriceIsPerUnit ? purchasePrice * qty : purchasePrice)
            : null;

        if (qty === item.quantity) {
            await itemRepository.update(id, {
                status: 'active',
                labId: targetLabId,
                deckId: targetDeckId,
                observedPrice: null,
                observedCurrency: null,
                observedPriceDate: null,
                purchasePrice: normalizedPurchasePrice,
                purchaseCurrency: purchaseCurrency ?? null,
            });
            return;
        }

        const { createdAt: _c, updatedAt: _u, ...base } = item;
        // Prorata observedPrice pour la part Wishlist restante (même logique que purchasePrice).
        const { remaining: remainingObservedPrice } = proratePurchasePrice(item.observedPrice, qty, item.quantity);
        await withTransaction(async () => {
            // La part qui reste en Wishlist n'est pas encore achetée : elle ne doit
            // jamais hériter d'un purchasePrice, même si le row source en avait un.
            await itemRepository.update(id, { quantity: item.quantity - qty, purchasePrice: null, observedPrice: remainingObservedPrice });
            await itemRepository.create({
                ...base,
                id: generateUUID(),
                quantity: qty,
                status: 'active',
                labId: targetLabId,
                deckId: targetDeckId,
                observedPrice: null,
                observedCurrency: null,
                observedPriceDate: null,
                purchasePrice: normalizedPurchasePrice,
                purchaseCurrency: purchaseCurrency ?? null,
            });
        });
    },
};
