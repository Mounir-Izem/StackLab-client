import { getDatabase } from '../db/database';
import type { Lab, LabType } from '../types/lab.types';

type RawLab = {
    id: string;
    user_id: string | null;
    name: string;
    cover_photo_url: string | null;
    type: string;
    is_system: number;
    position: number;
    created_at: string;
    updated_at: string;
};

function mapRowToLab(row: RawLab): Lab {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        coverPhotoUrl: row.cover_photo_url,
        type: row.type as LabType,
        isSystem: row.is_system === 1,
        position: row.position,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export const labRepository = {
    async findAll(): Promise<Lab[]> {
        const db = getDatabase();
        const rows = await db.getAllAsync<RawLab>(
            'SELECT * FROM labs ORDER BY position ASC'
        );
        return rows.map(mapRowToLab);
    },

    async findById(id: string): Promise<Lab | null> {
        const db = getDatabase();
        const row = await db.getFirstAsync<RawLab>(
            'SELECT * FROM labs WHERE id = ?',
            [id]
        );
        return row ? mapRowToLab(row) : null;
    },

    async findByType(type: LabType): Promise<Lab | null> {
        const db = getDatabase();
        const row = await db.getFirstAsync<RawLab>(
            'SELECT * FROM labs WHERE type = ? AND is_system = 1 LIMIT 1',
            [type]
        );
        return row ? mapRowToLab(row) : null;
    },

    async create(data: Omit<Lab, 'createdAt' | 'updatedAt'>): Promise<Lab> {
        const db = getDatabase();
        const now = new Date().toISOString();
        await db.runAsync(
            `INSERT INTO labs (id, user_id, name, cover_photo_url, type, is_system, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.id, data.userId ?? null, data.name, data.coverPhotoUrl ?? null,
            data.type, data.isSystem ? 1 : 0, data.position, now, now]
        );
        return this.findById(data.id) as Promise<Lab>;
    },

    async update(id: string, data: Partial<Pick<Lab, 'name' | 'coverPhotoUrl' | 'position'>>): Promise<Lab> {
        const db = getDatabase();
        const now = new Date().toISOString();
        const fields: string[] = [];
        const values: (string | number | null)[] = [];


        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
        if (data.coverPhotoUrl !== undefined) { fields.push('cover_photo_url = ?'); values.push(data.coverPhotoUrl); }
        if (data.position !== undefined) { fields.push('position = ?'); values.push(data.position); }

        fields.push('updated_at = ?');
        values.push(now);
        values.push(id);

        await db.runAsync(
            `UPDATE labs SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        return this.findById(id) as Promise<Lab>;
    },

    async delete(id: string): Promise<void> {
        const db = getDatabase();
        await db.runAsync('DELETE FROM labs WHERE id = ?', [id]);
    },

    async getItemCountsByLab(): Promise<Record<string, number>> {
        const db = getDatabase();
        const rows = await db.getAllAsync<{ lab_id: string; count: number }>(
            'SELECT lab_id, SUM(quantity) as count FROM items GROUP BY lab_id'
        );
        return Object.fromEntries(rows.map(r => [r.lab_id, r.count]));
    },
};
