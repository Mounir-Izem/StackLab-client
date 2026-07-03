import * as SQLite from 'expo-sqlite';
import { generateUUID } from '../utils/uuid';

export const CURRENT_SCHEMA_VERSION = 8;

const MIGRATIONS: Record<number, (db: SQLite.SQLiteDatabase) => Promise<void>> = {
    1: migrateV0toV1,
    2: migrateV1toV2,
    3: migrateV2toV3,
    4: migrateV3toV4,
    5: migrateV4toV5,
    6: migrateV5toV6,
    7: migrateV6toV7,
    8: migrateV7toV8,
};

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
    await checkAndMigrate(db);
}

async function checkAndMigrate(db: SQLite.SQLiteDatabase): Promise<void> {
    let currentVersion = 0;

    try {
        const row = await db.getFirstAsync<{ version: number }>(
            'SELECT version FROM schema_info LIMIT 1'
        );
        currentVersion = row?.version ?? 0;
    } catch {
        currentVersion = 0;
    }

    if (currentVersion === CURRENT_SCHEMA_VERSION) return;

    if (currentVersion > CURRENT_SCHEMA_VERSION) {
        throw new Error('SCHEMA_DOWNGRADE_DETECTED');
    }

    await applyMigrations(db, currentVersion, CURRENT_SCHEMA_VERSION);
}

async function applyMigrations(
    db: SQLite.SQLiteDatabase,
    from: number,
    to: number
): Promise<void> {
    for (let v = from + 1; v <= to; v++) {
        const migrate = MIGRATIONS[v];
        if (!migrate) throw new Error(`Migration ${v} not found`);

        await db.execAsync('BEGIN TRANSACTION');
        try {
            await migrate(db);
            await db.runAsync(
                'UPDATE schema_info SET version = ?, applied_at = ?',
                [v, new Date().toISOString()]
            );
            await db.execAsync('COMMIT');
        } catch (error) {
            await db.execAsync('ROLLBACK');
            throw error;
        }
    }
}

async function migrateV0toV1(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_info (
      id         INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
      version    INTEGER NOT NULL,
      applied_at TEXT    NOT NULL
    );

    INSERT INTO schema_info (id, version, applied_at)
    VALUES (1, 0, datetime('now'));
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS labs (
      id               TEXT    NOT NULL PRIMARY KEY,
      user_id          TEXT,
      name             TEXT    NOT NULL,
      cover_photo_url  TEXT,
      type             TEXT    NOT NULL
                       CHECK (type IN ('standard', 'premium', 'wishlist')),
      position         INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT    NOT NULL,
      updated_at       TEXT    NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS decks (
      id               TEXT    NOT NULL PRIMARY KEY,
      lab_id           TEXT    NOT NULL
                       REFERENCES labs(id) ON DELETE RESTRICT,
      parent_id        TEXT
                       REFERENCES decks(id) ON DELETE RESTRICT,
      name             TEXT    NOT NULL,
      cover_photo_url  TEXT,
      position         INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT    NOT NULL,
      updated_at       TEXT    NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS items (
      id                     TEXT    NOT NULL PRIMARY KEY,
      lab_id                 TEXT    NOT NULL
                             REFERENCES labs(id) ON DELETE RESTRICT,
      deck_id                TEXT
                             REFERENCES decks(id) ON DELETE RESTRICT,
      status                 TEXT    NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'sold', 'wishlist')),
      name                   TEXT    NOT NULL,
      family_key             TEXT    NOT NULL,
      metal                  TEXT    NOT NULL
                             CHECK (metal IN ('gold', 'silver')),
      mint_name              TEXT,
      shape                  TEXT    NOT NULL
                             CHECK (shape IN ('coin', 'bar', 'token', 'bust', 'custom')),
      shape_description      TEXT,
      weight_oz              REAL    NOT NULL
                             CHECK (weight_oz > 0),
      weight_unit_input      TEXT    NOT NULL
                             CHECK (weight_unit_input IN ('oz', 'g', 'kg')),
      purity                 REAL    NOT NULL
                             CHECK (purity > 0 AND purity <= 1),
      year                   INTEGER,
      strike_finish          TEXT
                             CHECK (strike_finish IN ('BU', 'proof', 'reverse_proof', 'antique', 'matte', 'specimen', 'burnished', 'proof_like', 'unknown') OR strike_finish IS NULL),
      condition              TEXT
                             CHECK (condition IN ('uncirculated', 'circulated', 'damaged', 'unknown') OR condition IS NULL),
      grading_company        TEXT,
      grade_value            TEXT,
      notes                  TEXT,
      quantity               INTEGER NOT NULL DEFAULT 1
                             CHECK (quantity >= 1),
      purchase_price         REAL,
      purchase_currency      TEXT,
      purchase_exchange_rate REAL,
      purchase_date          TEXT,
      observed_price         REAL,
      observed_currency      TEXT,
      observed_price_date    TEXT,
      sold_date              TEXT,
      sold_price             REAL,
      sold_currency          TEXT,
      photo_url              TEXT,
      location               TEXT,
      created_at             TEXT    NOT NULL,
      updated_at             TEXT    NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS item_features (
      item_id TEXT NOT NULL
              REFERENCES items(id) ON DELETE RESTRICT,
      feature TEXT NOT NULL
              CHECK (feature IN ('privy', 'colorized', 'gilded', 'high_relief', 'ultra_high_relief', 'hologram', 'enamel', 'ruthenium', 'plated', 'insert', 'numbered_certificate')),
      PRIMARY KEY (item_id, feature)
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS item_packaging (
      item_id  TEXT NOT NULL
               REFERENCES items(id) ON DELETE RESTRICT,
      packaging TEXT NOT NULL
               CHECK (packaging IN ('sealed', 'capsule', 'mint_box', 'with_certificate', 'raw')),
      PRIMARY KEY (item_id, packaging)
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stack_snapshots (
      id              TEXT    NOT NULL PRIMARY KEY,
      date            TEXT    NOT NULL UNIQUE,
      total_value     REAL    NOT NULL,
      total_oz_gold   REAL    NOT NULL,
      total_oz_silver REAL    NOT NULL,
      spot_gold       REAL    NOT NULL,
      spot_silver     REAL    NOT NULL,
      currency        TEXT    NOT NULL,
      created_at      TEXT    NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      id                   INTEGER NOT NULL PRIMARY KEY
                           CHECK (id = 1),
      currency             TEXT    NOT NULL DEFAULT 'USD'
                           CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),
      weight_unit          TEXT    NOT NULL DEFAULT 'oz'
                           CHECK (weight_unit IN ('oz', 'g', 'kg')),
      cloud_sync           INTEGER NOT NULL DEFAULT 0
                           CHECK (cloud_sync IN (0, 1)),
      auto_backup_enabled  INTEGER NOT NULL DEFAULT 0
                           CHECK (auto_backup_enabled IN (0, 1)),
      backup_reminder      INTEGER NOT NULL DEFAULT 1
                           CHECK (backup_reminder IN (0, 1)),
      hide_values          INTEGER NOT NULL DEFAULT 0
                           CHECK (hide_values IN (0, 1)),
      subscription_status  TEXT    NOT NULL DEFAULT 'free'
                           CHECK (subscription_status IN ('free', 'monthly', 'annual')),
      subscription_expiry  TEXT,
      onboarding_completed INTEGER NOT NULL DEFAULT 0
                           CHECK (onboarding_completed IN (0, 1)),
      onboarding_step      INTEGER NOT NULL DEFAULT 0
                           CHECK (onboarding_step IN (0, 1, 2, 3)),
      updated_at           TEXT    NOT NULL
    );

    INSERT INTO settings (
      id, currency, weight_unit, cloud_sync, auto_backup_enabled,
      backup_reminder, hide_values, subscription_status, subscription_expiry,
      onboarding_completed, onboarding_step, updated_at
    ) VALUES (
      1, 'USD', 'oz', 0, 0,
      1, 0, 'free', NULL,
      0, 0, datetime('now')
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings_extended (
      key        TEXT NOT NULL PRIMARY KEY,
      value      TEXT,
      updated_at TEXT NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_items_lab_id
      ON items(lab_id);

    CREATE INDEX IF NOT EXISTS idx_items_status
      ON items(status);

    CREATE INDEX IF NOT EXISTS idx_items_deck_id
      ON items(deck_id);

    CREATE INDEX IF NOT EXISTS idx_decks_lab_id
      ON decks(lab_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_date
      ON stack_snapshots(date);

    CREATE INDEX IF NOT EXISTS idx_item_features_item_id
      ON item_features(item_id);

    CREATE INDEX IF NOT EXISTS idx_item_packaging_item_id
      ON item_packaging(item_id);
  `);
}

async function migrateV1toV2(db: SQLite.SQLiteDatabase): Promise<void> {
    // Recreate labs table: replace 'premium' type with 'trash', add is_system column
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS labs_v2 (
            id               TEXT    NOT NULL PRIMARY KEY,
            user_id          TEXT,
            name             TEXT    NOT NULL,
            cover_photo_url  TEXT,
            type             TEXT    NOT NULL
                             CHECK (type IN ('standard', 'wishlist', 'trash')),
            is_system        INTEGER NOT NULL DEFAULT 0
                             CHECK (is_system IN (0, 1)),
            position         INTEGER NOT NULL DEFAULT 0,
            created_at       TEXT    NOT NULL,
            updated_at       TEXT    NOT NULL
        );
    `);

    // Copy existing labs — 'premium' becomes 'standard', all marked as non-system
    await db.execAsync(`
        INSERT INTO labs_v2 (id, user_id, name, cover_photo_url, type, is_system, position, created_at, updated_at)
        SELECT
            id,
            user_id,
            name,
            cover_photo_url,
            CASE WHEN type = 'premium' THEN 'standard' ELSE type END,
            0,
            position + 3,
            created_at,
            updated_at
        FROM labs;
    `);

    await db.execAsync('DROP TABLE labs;');
    await db.execAsync('ALTER TABLE labs_v2 RENAME TO labs;');

    // Seed 3 system labs at positions 0, 1, 2
    const now = new Date().toISOString();
    await db.runAsync(
        `INSERT INTO labs (id, user_id, name, cover_photo_url, type, is_system, position, created_at, updated_at)
         VALUES (?, NULL, 'My Stack', NULL, 'standard', 1, 0, ?, ?)`,
        [generateUUID(), now, now]
    );
    await db.runAsync(
        `INSERT INTO labs (id, user_id, name, cover_photo_url, type, is_system, position, created_at, updated_at)
         VALUES (?, NULL, 'Wishlist', NULL, 'wishlist', 1, 1, ?, ?)`,
        [generateUUID(), now, now]
    );
    await db.runAsync(
        `INSERT INTO labs (id, user_id, name, cover_photo_url, type, is_system, position, created_at, updated_at)
         VALUES (?, NULL, 'Trash', NULL, 'trash', 1, 2, ?, ?)`,
        [generateUUID(), now, now]
    );
}

async function migrateV2toV3(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(
        'ALTER TABLE settings ADD COLUMN backup_banner_dismissed INTEGER NOT NULL DEFAULT 0'
    );
    // Existing users with items skip onboarding — they already have a stack
    await db.execAsync(
        'UPDATE settings SET onboarding_completed = 1 WHERE (SELECT COUNT(*) FROM items) > 0'
    );
}

async function migrateV3toV4(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(
        'ALTER TABLE settings ADD COLUMN last_backup_at TEXT'
    );
}

async function migrateV4toV5(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(`
        ALTER TABLE settings ADD COLUMN app_lock_enabled INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE settings ADD COLUMN app_lock_auto_wipe_enabled INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE settings ADD COLUMN app_lock_prompt_shown INTEGER NOT NULL DEFAULT 0;
    `);
}

async function migrateV5toV6(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(
        "ALTER TABLE settings ADD COLUMN language TEXT NOT NULL DEFAULT 'system'"
    );
}

async function migrateV6toV7(db: SQLite.SQLiteDatabase): Promise<void> {
    // Repair wishlist items that incorrectly have purchase_price set (P0 bug in EditItemFlow).
    // Rules:
    //   - observed_price IS NULL → salvage: copy purchase_price/currency/date into observed fields
    //   - observed_price IS NOT NULL → keep observed fields as-is, just clear purchase fields
    // All CASE WHEN expressions below read the pre-update column values (SQL standard).
    await db.execAsync(`
        UPDATE items
        SET
            observed_price      = CASE WHEN observed_price IS NULL THEN purchase_price      ELSE observed_price      END,
            observed_currency   = CASE WHEN observed_price IS NULL THEN purchase_currency   ELSE observed_currency   END,
            observed_price_date = CASE WHEN observed_price IS NULL THEN purchase_date       ELSE observed_price_date END,
            purchase_price      = NULL,
            purchase_currency   = NULL,
            purchase_date       = NULL
        WHERE status = 'wishlist' AND purchase_price IS NOT NULL
    `);
}

async function migrateV7toV8(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(
        'ALTER TABLE settings ADD COLUMN screen_protection_enabled INTEGER NOT NULL DEFAULT 0'
    );
}
