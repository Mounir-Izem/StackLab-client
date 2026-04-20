import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

export async function initDatabase(): Promise<void> {
    if (db) return;
    db = await SQLite.openDatabaseAsync('stacklab.db');
    await applyPragmas(db);
    await runMigrations(db);
}

async function applyPragmas(database: SQLite.SQLiteDatabase): Promise<void> {
    await database.execAsync('PRAGMA foreign_keys = ON;');
    await database.execAsync('PRAGMA journal_mode = WAL;');
    await database.execAsync('PRAGMA synchronous = NORMAL;');
}