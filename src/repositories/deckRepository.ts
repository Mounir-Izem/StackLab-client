import { getDatabase } from '../db/database';
import type { Deck } from '../types/deck.types';

type RawDeck = {
    id: string;
    lab_id: string;
    parent_id: string | null;
    name: string;
    cover_photo_url: string | null;
    position: number;
    created_at: string;
    updated_at: string;
};

function mapRowToDeck(row: RawDeck): Deck {
    return {
        id: row.id,
        labId: row.lab_id,
        parentId: row.parent_id,
        name: row.name,
        coverPhotoUrl: row.cover_photo_url,
        position: row.position,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export const deckRepository = {
    async findByLabId(labId: string): Promise<Deck[]> {
        const db = getDatabase();
        const rows = await db.getAllAsync<RawDeck>(
            'SELECT * FROM decks WHERE lab_id = ? ORDER BY position ASC',
            [labId]
        );
        return rows.map(mapRowToDeck);
    },

    async findByParentId(parentId: string): Promise<Deck[]> {
        const db = getDatabase();
        const rows = await db.getAllAsync<RawDeck>(
            'SELECT * FROM decks WHERE parent_id = ? ORDER BY position ASC',
            [parentId]
        );
        return rows.map(mapRowToDeck);
    },

    async findById(id: string): Promise<Deck | null> {
        const db = getDatabase();
        const row = await db.getFirstAsync<RawDeck>(
            'SELECT * FROM decks WHERE id = ?',
            [id]
        );
        return row ? mapRowToDeck(row) : null;
    },

    async create(data: Omit<Deck, 'createdAt' | 'updatedAt'>): Promise<Deck> {
        const db = getDatabase();
        const now = new Date().toISOString();
        await db.runAsync(
            `INSERT INTO decks (id, lab_id, parent_id, name, cover_photo_url, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.id, data.labId, data.parentId ?? null, data.name,
            data.coverPhotoUrl ?? null, data.position, now, now]
        );
        return this.findById(data.id) as Promise<Deck>;
    },

    async update(id: string, data: Partial<Pick<Deck, 'name' | 'coverPhotoUrl' | 'position' | 'parentId' | 'labId'>>): Promise<Deck> {
        const db = getDatabase();
        const now = new Date().toISOString();
        const fields: string[] = [];
        const values: (string | number | null)[] = [];


        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
        if (data.coverPhotoUrl !== undefined) { fields.push('cover_photo_url = ?'); values.push(data.coverPhotoUrl); }
        if (data.position !== undefined) { fields.push('position = ?'); values.push(data.position); }
        if (data.parentId !== undefined) { fields.push('parent_id = ?'); values.push(data.parentId); }
        if (data.labId !== undefined) { fields.push('lab_id = ?'); values.push(data.labId); }

        fields.push('updated_at = ?');
        values.push(now);
        values.push(id);

        await db.runAsync(
            `UPDATE decks SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        return this.findById(id) as Promise<Deck>;
    },

    async delete(id: string): Promise<void> {
        const db = getDatabase();
        await db.runAsync('DELETE FROM decks WHERE id = ?', [id]);
    },
};
