import { getDatabase } from '../db/database';
import type { Item, ItemStatus, ItemMetal, ItemShape, ItemWeightUnit, StrikeFinish, ItemCondition, ItemFeature, ItemPackaging, PriceBasis } from '../types/item.types';
import type { Currency } from '../types/settings.types';

type RawItem = {
    id: string;
    lab_id: string;
    deck_id: string | null;
    status: string;
    name: string;
    family_key: string;
    metal: string;
    mint_name: string | null;
    shape: string;
    shape_description: string | null;
    weight_oz: number;
    weight_unit_input: string;
    purity: number;
    year: number | null;
    strike_finish: string | null;
    condition: string | null;
    grading_company: string | null;
    grade_value: string | null;
    notes: string | null;
    quantity: number;
    purchase_price: number | null;
    purchase_price_basis: string | null;
    purchase_currency: string | null;
    purchase_exchange_rate: number | null;
    purchase_date: string | null;
    observed_price: number | null;
    observed_price_basis: string | null;
    observed_currency: string | null;
    observed_price_date: string | null;
    sold_date: string | null;
    sold_price: number | null;
    sold_price_basis: string | null;
    sold_currency: string | null;
    photo_url: string | null;
    location: string | null;
    created_at: string;
    updated_at: string;
    features_concat: string | null;
    packaging_concat: string | null;
};

function mapRowToItem(row: RawItem): Item {
    return {
        id: row.id,
        labId: row.lab_id,
        deckId: row.deck_id,
        status: row.status as ItemStatus,
        name: row.name,
        familyKey: row.family_key,
        metal: row.metal as ItemMetal,
        mintName: row.mint_name,
        shape: row.shape as ItemShape,
        shapeDescription: row.shape_description,
        weightOz: row.weight_oz,
        weightUnitInput: row.weight_unit_input as ItemWeightUnit,
        purity: row.purity,
        year: row.year,
        strikeFinish: row.strike_finish as StrikeFinish | null,
        condition: row.condition as ItemCondition | null,
        features: row.features_concat ? (row.features_concat.split(',') as ItemFeature[]) : [],
        packaging: row.packaging_concat ? (row.packaging_concat.split(',') as ItemPackaging[]) : [],
        gradingCompany: row.grading_company,
        gradeValue: row.grade_value,
        notes: row.notes,
        quantity: row.quantity,
        purchasePrice: row.purchase_price,
        purchasePriceBasis: row.purchase_price_basis as PriceBasis | null,
        purchaseCurrency: row.purchase_currency as Currency | null,
        purchaseExchangeRate: row.purchase_exchange_rate,
        purchaseDate: row.purchase_date,
        observedPrice: row.observed_price,
        observedPriceBasis: row.observed_price_basis as PriceBasis | null,
        observedCurrency: row.observed_currency as Currency | null,
        observedPriceDate: row.observed_price_date,
        soldDate: row.sold_date,
        soldPrice: row.sold_price,
        soldPriceBasis: row.sold_price_basis as PriceBasis | null,
        soldCurrency: row.sold_currency as Currency | null,
        photoUrl: row.photo_url,
        location: row.location,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

const SELECT_ITEM = `
    SELECT i.*,
        (SELECT GROUP_CONCAT(feature)   FROM item_features  WHERE item_id = i.id) AS features_concat,
        (SELECT GROUP_CONCAT(packaging) FROM item_packaging WHERE item_id = i.id) AS packaging_concat
    FROM items i
`;

export const itemRepository = {
    async findById(id: string): Promise<Item | null> {
        const db = getDatabase();
        const row = await db.getFirstAsync<RawItem>(
            `${SELECT_ITEM} WHERE i.id = ?`,
            [id]
        );
        return row ? mapRowToItem(row) : null;
    },

    async findByLabId(labId: string, status?: ItemStatus): Promise<Item[]> {
        const db = getDatabase();
        const rows = status
            ? await db.getAllAsync<RawItem>(`${SELECT_ITEM} WHERE i.lab_id = ? AND i.status = ? ORDER BY i.created_at ASC`, [labId, status])
            : await db.getAllAsync<RawItem>(`${SELECT_ITEM} WHERE i.lab_id = ? ORDER BY i.created_at ASC`, [labId]);
        return rows.map(mapRowToItem);
    },

    async findByDeckId(deckId: string, status?: ItemStatus): Promise<Item[]> {
        const db = getDatabase();
        const rows = status
            ? await db.getAllAsync<RawItem>(`${SELECT_ITEM} WHERE i.deck_id = ? AND i.status = ? ORDER BY i.created_at ASC`, [deckId, status])
            : await db.getAllAsync<RawItem>(`${SELECT_ITEM} WHERE i.deck_id = ? ORDER BY i.created_at ASC`, [deckId]);
        return rows.map(mapRowToItem);
    },

    async findByDeckIdRecursive(deckId: string, status?: ItemStatus): Promise<Item[]> {
        const db = getDatabase();
        const query = `
            WITH RECURSIVE deck_tree(id) AS (
                SELECT id FROM decks WHERE id = ?
                UNION ALL
                SELECT d.id FROM decks d JOIN deck_tree dt ON d.parent_id = dt.id
            )
            SELECT i.*,
                (SELECT GROUP_CONCAT(feature)   FROM item_features  WHERE item_id = i.id) AS features_concat,
                (SELECT GROUP_CONCAT(packaging) FROM item_packaging WHERE item_id = i.id) AS packaging_concat
            FROM items i
            WHERE i.deck_id IN (SELECT id FROM deck_tree)
            ${status ? 'AND i.status = ?' : ''}
        `;
        const rows = status
            ? await db.getAllAsync<RawItem>(query, [deckId, status])
            : await db.getAllAsync<RawItem>(query, [deckId]);
        return rows.map(mapRowToItem);
    },

    async findAll(status?: ItemStatus): Promise<Item[]> {
        const db = getDatabase();
        const rows = status
            ? await db.getAllAsync<RawItem>(`${SELECT_ITEM} WHERE i.status = ? ORDER BY i.created_at ASC`, [status])
            : await db.getAllAsync<RawItem>(`${SELECT_ITEM} ORDER BY i.created_at ASC`);
        return rows.map(mapRowToItem);
    },

    async create(data: Omit<Item, 'features' | 'packaging' | 'createdAt' | 'updatedAt'> & {
        features: ItemFeature[];
        packaging: ItemPackaging[];
    }): Promise<Item> {
        const db = getDatabase();
        const now = new Date().toISOString();

        await db.execAsync('SAVEPOINT sp_item_create');
        try {
            await db.runAsync(
                `INSERT INTO items (
                    id, lab_id, deck_id, status, name, family_key, metal, mint_name,
                    shape, shape_description, weight_oz, weight_unit_input, purity,
                    year, strike_finish, condition, grading_company, grade_value,
                    notes, quantity,
                    purchase_price, purchase_price_basis, purchase_currency, purchase_exchange_rate,
                    purchase_date, observed_price, observed_price_basis, observed_currency, observed_price_date,
                    sold_date, sold_price, sold_price_basis, sold_currency, photo_url, location,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?
                )`,
                [
                    data.id, data.labId, data.deckId ?? null, data.status, data.name,
                    data.familyKey, data.metal, data.mintName ?? null,
                    data.shape, data.shapeDescription ?? null, data.weightOz,
                    data.weightUnitInput, data.purity,
                    data.year ?? null, data.strikeFinish ?? null, data.condition ?? null,
                    data.gradingCompany ?? null, data.gradeValue ?? null,
                    data.notes ?? null, data.quantity,
                    data.purchasePrice ?? null, data.purchasePriceBasis ?? null,
                    data.purchaseCurrency ?? null,
                    data.purchaseExchangeRate ?? null, data.purchaseDate ?? null,
                    data.observedPrice ?? null, data.observedPriceBasis ?? null,
                    data.observedCurrency ?? null, data.observedPriceDate ?? null,
                    data.soldDate ?? null, data.soldPrice ?? null,
                    data.soldPriceBasis ?? null,
                    data.soldCurrency ?? null, data.photoUrl ?? null,
                    data.location ?? null,
                    now, now,
                ]
            );

            for (const feature of data.features) {
                await db.runAsync(
                    'INSERT INTO item_features (item_id, feature) VALUES (?, ?)',
                    [data.id, feature]
                );
            }

            for (const pkg of data.packaging) {
                await db.runAsync(
                    'INSERT INTO item_packaging (item_id, packaging) VALUES (?, ?)',
                    [data.id, pkg]
                );
            }

            await db.execAsync('RELEASE sp_item_create');
        } catch (error) {
            await db.execAsync('ROLLBACK TO sp_item_create');
            await db.execAsync('RELEASE sp_item_create');
            throw error;
        }

        return this.findById(data.id) as Promise<Item>;
    },

    async restore(data: Item): Promise<void> {
        const db = getDatabase();

        // Backups antérieurs au schéma V9 : prix présents sans basis. Backfill
        // 'lotTotal' à l'import — même règle que la migration V9 (le montant
        // stocké est déjà le total normalisé). Prix null → basis null.
        const purchasePriceBasis = data.purchasePriceBasis
            ?? (data.purchasePrice != null ? 'lotTotal' : null);
        const observedPriceBasis = data.observedPriceBasis
            ?? (data.observedPrice != null ? 'lotTotal' : null);
        const soldPriceBasis = data.soldPriceBasis
            ?? (data.soldPrice != null ? 'lotTotal' : null);

        await db.execAsync('SAVEPOINT sp_item_restore');
        try {
            await db.runAsync(
                `INSERT INTO items (
                    id, lab_id, deck_id, status, name, family_key, metal, mint_name,
                    shape, shape_description, weight_oz, weight_unit_input, purity,
                    year, strike_finish, condition, grading_company, grade_value,
                    notes, quantity,
                    purchase_price, purchase_price_basis, purchase_currency, purchase_exchange_rate,
                    purchase_date, observed_price, observed_price_basis, observed_currency, observed_price_date,
                    sold_date, sold_price, sold_price_basis, sold_currency, photo_url, location,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?
                )`,
                [
                    data.id, data.labId, data.deckId ?? null, data.status, data.name,
                    data.familyKey, data.metal, data.mintName ?? null,
                    data.shape, data.shapeDescription ?? null, data.weightOz,
                    data.weightUnitInput, data.purity,
                    data.year ?? null, data.strikeFinish ?? null, data.condition ?? null,
                    data.gradingCompany ?? null, data.gradeValue ?? null,
                    data.notes ?? null, data.quantity,
                    data.purchasePrice ?? null, purchasePriceBasis,
                    data.purchaseCurrency ?? null,
                    data.purchaseExchangeRate ?? null, data.purchaseDate ?? null,
                    data.observedPrice ?? null, observedPriceBasis,
                    data.observedCurrency ?? null, data.observedPriceDate ?? null,
                    data.soldDate ?? null, data.soldPrice ?? null,
                    soldPriceBasis,
                    data.soldCurrency ?? null, data.photoUrl ?? null,
                    data.location ?? null,
                    data.createdAt, data.updatedAt,
                ]
            );

            for (const feature of data.features) {
                await db.runAsync(
                    'INSERT INTO item_features (item_id, feature) VALUES (?, ?)',
                    [data.id, feature]
                );
            }

            for (const pkg of data.packaging) {
                await db.runAsync(
                    'INSERT INTO item_packaging (item_id, packaging) VALUES (?, ?)',
                    [data.id, pkg]
                );
            }

            await db.execAsync('RELEASE sp_item_restore');
        } catch (error) {
            await db.execAsync('ROLLBACK TO sp_item_restore');
            await db.execAsync('RELEASE sp_item_restore');
            throw error;
        }
    },

    async update(id: string, data: Partial<Omit<Item, 'id' | 'familyKey' | 'createdAt' | 'updatedAt'>>): Promise<Item> {
        const db = getDatabase();
        const now = new Date().toISOString();

        await db.execAsync('SAVEPOINT sp_item_update');
        try {
            const fields: string[] = [];
            const values: (string | number | null)[] = [];

            const columnMap: Partial<Record<keyof Item, string>> = {
                labId: 'lab_id', deckId: 'deck_id', status: 'status',
                name: 'name', metal: 'metal',
                mintName: 'mint_name', shape: 'shape', shapeDescription: 'shape_description',
                weightOz: 'weight_oz', weightUnitInput: 'weight_unit_input', purity: 'purity',
                year: 'year', strikeFinish: 'strike_finish', condition: 'condition',
                gradingCompany: 'grading_company', gradeValue: 'grade_value',
                notes: 'notes', quantity: 'quantity',
                purchasePrice: 'purchase_price', purchasePriceBasis: 'purchase_price_basis',
                purchaseCurrency: 'purchase_currency',
                purchaseExchangeRate: 'purchase_exchange_rate', purchaseDate: 'purchase_date',
                observedPrice: 'observed_price', observedPriceBasis: 'observed_price_basis',
                observedCurrency: 'observed_currency',
                observedPriceDate: 'observed_price_date',
                soldDate: 'sold_date', soldPrice: 'sold_price', soldPriceBasis: 'sold_price_basis',
                soldCurrency: 'sold_currency',
                photoUrl: 'photo_url', location: 'location',
            };

            for (const [key, col] of Object.entries(columnMap)) {
                if (key in data) {
                    fields.push(`${col} = ?`);
                    values.push(((data as Record<string, unknown>)[key] ?? null) as string | number | null);
                }
            }

            if (fields.length > 0 || data.features !== undefined || data.packaging !== undefined) {
                fields.push('updated_at = ?');
                values.push(now);
                values.push(id);
                await db.runAsync(
                    `UPDATE items SET ${fields.join(', ')} WHERE id = ?`,
                    values
                );
            }

            if (data.features !== undefined) {
                await db.runAsync('DELETE FROM item_features WHERE item_id = ?', [id]);
                for (const feature of data.features) {
                    await db.runAsync(
                        'INSERT INTO item_features (item_id, feature) VALUES (?, ?)',
                        [id, feature]
                    );
                }
            }

            if (data.packaging !== undefined) {
                await db.runAsync('DELETE FROM item_packaging WHERE item_id = ?', [id]);
                for (const pkg of data.packaging) {
                    await db.runAsync(
                        'INSERT INTO item_packaging (item_id, packaging) VALUES (?, ?)',
                        [id, pkg]
                    );
                }
            }

            await db.execAsync('RELEASE sp_item_update');
        } catch (error) {
            await db.execAsync('ROLLBACK TO sp_item_update');
            await db.execAsync('RELEASE sp_item_update');
            throw error;
        }

        return this.findById(id) as Promise<Item>;
    },

    async delete(id: string): Promise<void> {
        const db = getDatabase();
        await db.execAsync('SAVEPOINT sp_item_delete');
        try {
            await db.runAsync('DELETE FROM item_features WHERE item_id = ?', [id]);
            await db.runAsync('DELETE FROM item_packaging WHERE item_id = ?', [id]);
            await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
            await db.execAsync('RELEASE sp_item_delete');
        } catch (error) {
            await db.execAsync('ROLLBACK TO sp_item_delete');
            await db.execAsync('RELEASE sp_item_delete');
            throw error;
        }
    },
};
