import { getDatabase } from '../db/database';
import type { StackSnapshot } from '../types/snapshot.types';

type RawSnapshot = {
    id: string;
    date: string;
    total_value: number;
    total_oz_gold: number;
    total_oz_silver: number;
    spot_gold: number;
    spot_silver: number;
    currency: string;
    created_at: string;
};

function mapRowToSnapshot(row: RawSnapshot): StackSnapshot {
    return {
        id: row.id,
        date: row.date,
        totalValue: row.total_value,
        totalOzGold: row.total_oz_gold,
        totalOzSilver: row.total_oz_silver,
        spotGold: row.spot_gold,
        spotSilver: row.spot_silver,
        currency: row.currency,
        createdAt: row.created_at,
    };
}

export const snapshotRepository = {
    async findByDate(date: string): Promise<StackSnapshot | null> {
        const db = getDatabase();
        const row = await db.getFirstAsync<RawSnapshot>(
            'SELECT * FROM stack_snapshots WHERE date = ?',
            [date]
        );
        return row ? mapRowToSnapshot(row) : null;
    },

    async create(data: Omit<StackSnapshot, 'createdAt'>): Promise<StackSnapshot> {
        const db = getDatabase();
        const now = new Date().toISOString();
        await db.runAsync(
            `INSERT INTO stack_snapshots
                (id, date, total_value, total_oz_gold, total_oz_silver, spot_gold, spot_silver, currency, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.id, data.date, data.totalValue, data.totalOzGold, data.totalOzSilver,
            data.spotGold, data.spotSilver, data.currency, now]
        );
        const row = await db.getFirstAsync<RawSnapshot>(
            'SELECT * FROM stack_snapshots WHERE id = ?',
            [data.id]
        );
        if (!row) throw new Error('SNAPSHOT_NOT_FOUND');
        return mapRowToSnapshot(row);
    },

    async findAll(): Promise<StackSnapshot[]> {
        const db = getDatabase();
        const rows = await db.getAllAsync<RawSnapshot>(
            'SELECT * FROM stack_snapshots ORDER BY date ASC'
        );
        return rows.map(mapRowToSnapshot);
    },
};
