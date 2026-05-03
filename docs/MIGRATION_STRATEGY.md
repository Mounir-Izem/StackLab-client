# MIGRATION_STRATEGY.md — StackLab
> Stratégie de migration du schéma SQLite. À lire avant toute modification du schéma.
> Toute déviation nécessite validation explicite du propriétaire.
> Cohérent avec DATABASE_SCHEMA.md (R-05), DATA_MODEL.md (Règle 11), ERROR_HANDLING.md (EH-04, EH-14).

---

## Philosophie

**Zéro perte de données — toujours.**

Un utilisateur qui met à jour l'app ne doit jamais perdre ses holdings.
Même si la migration échoue. Même si la nouvelle version est incompatible.
Les données doivent rester accessibles dans leur état précédent.

Cette règle est non négociable (DATA_MODEL.md Règle 11).

---

## Le système de versioning

### Table schema_info

Créée en Phase 1. Toujours présente. Toujours une seule ligne.

```sql
CREATE TABLE IF NOT EXISTS schema_info (
  version    INTEGER NOT NULL,
  applied_at TEXT    NOT NULL  -- ISO 8601 datetime
);

-- Version initiale
INSERT INTO schema_info (version, applied_at) VALUES (1, datetime('now'));
```

**Règle :** toute modification du schéma SQLite = incrémenter `version`.

### Registre des versions

| Version | Phase | Description |
|---|---|---|
| 1 | Phase 1 | Schéma initial — labs, decks, items, stack_snapshots, settings, settings_extended |
| 2 | Phase 2 | Labs : `premium` supprimé, `trash` ajouté, colonne `is_system`, 3 labs système seedés |
| 3 | Pré-lancement | Chiffrement applicatif — colonnes TEXT pour blobs AES-256 |

Les versions futures sont ajoutées ici au moment de leur implémentation.

---

## Comment une migration se déclenche

Au lancement de l'app, avant toute autre opération :

```typescript
async function checkAndMigrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_info LIMIT 1'
  );

  const currentVersion = row?.version ?? 0;
  const targetVersion  = CURRENT_SCHEMA_VERSION; // constante dans le code

  if (currentVersion === targetVersion) return; // Rien à faire

  if (currentVersion > targetVersion) {
    // Downgrade — impossible à gérer proprement
    // L'app a été rétrogradée — afficher EH-04
    throw new Error('SCHEMA_DOWNGRADE_DETECTED');
  }

  // Migration nécessaire
  await runMigrations(db, currentVersion, targetVersion);
}
```

---

## Principe de migration — Steps séquentiels

Chaque migration est un step numéroté. Pour passer de v1 à v3, on exécute v1→v2 puis v2→v3. Jamais de sauts.

```typescript
const MIGRATIONS: Record<number, (db: SQLiteDatabase) => Promise<void>> = {
  2: migrateV1toV2,
  3: migrateV2toV3,
  // Ajoutées au fur et à mesure
};

async function runMigrations(
  db: SQLiteDatabase,
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
      throw error; // Remonté vers EH-04
    }
  }
}
```

**Règle critique :** chaque migration est dans une transaction.
Si elle échoue → rollback → données intactes → EH-04.

---

## Migrations documentées

### Migration v1 → v2 — Chiffrement applicatif (pré-lancement)

**Quand :** avant le lancement public sur les stores, après la bêta.
**Objectif :** passer les champs sensibles de REAL/TEXT en clair vers TEXT (blobs AES-256-GCM).

**Stratégie :**

SQLite ne supporte pas `ALTER COLUMN`. La migration se fait en 4 étapes :

```
1. Créer une table temporaire avec le nouveau schéma
2. Lire toutes les lignes de l'ancienne table
3. Chiffrer chaque champ sensible + écrire dans la table temporaire
4. Supprimer l'ancienne table
5. Renommer la table temporaire
```

**Exemple pour la table items :**

```typescript
async function migrateV1toV2(db: SQLiteDatabase): Promise<void> {
  const key = await loadEncryptionKey(); // depuis expo-secure-store

  // 1. Créer table temporaire
  await db.execAsync(`
    CREATE TABLE items_v2 (
      id TEXT NOT NULL PRIMARY KEY,
      lab_id TEXT NOT NULL,
      deck_id TEXT,
      status TEXT NOT NULL,
      -- Champs chiffrés (TEXT = blobs)
      name TEXT NOT NULL,
      family_key TEXT NOT NULL,
      metal TEXT NOT NULL,
      weight_oz TEXT NOT NULL,
      purity TEXT NOT NULL,
      quantity TEXT NOT NULL,
      -- ... tous les autres champs sensibles
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 2. Lire + chiffrer + écrire
  const items = await db.getAllAsync<ItemV1>('SELECT * FROM items');
  for (const item of items) {
    await db.runAsync(
      `INSERT INTO items_v2 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ...)`,
      [
        item.id,
        item.lab_id,
        item.deck_id,
        item.status, // non chiffré
        await encrypt(item.name, key),
        await encrypt(item.family_key, key),
        await encrypt(item.metal, key),
        await encrypt(String(item.weight_oz), key),
        await encrypt(String(item.purity), key),
        await encrypt(String(item.quantity), key),
        // ...
      ]
    );
  }

  // 3. Remplacer
  await db.execAsync('DROP TABLE items');
  await db.execAsync('ALTER TABLE items_v2 RENAME TO items');
}
```

**Important :** cette migration chiffre les données existantes des utilisateurs bêta.
Elle doit être testée exhaustivement avant déploiement.

---

## Import JSON — Gestion des versions

L'export JSON contient un champ `schema_version` (DATA_MODEL.md Règle 11).

```json
{
  "schema_version": "1",
  "exported_at": "2026-04-17T14:32:00Z",
  "labs": [...],
  "decks": [...],
  "items": [...],
  "stack_snapshots": [...],
  "settings": {...}
}
```

### Règles d'import par scénario

**Même version (cas nominal) :**
```
Import JSON v1 → App v1
→ Import direct. Validation Zod. Écriture SQLite.
```

**JSON plus ancien (utilisateur restaure un vieux backup) :**
```
Import JSON v1 → App v2 (chiffrement actif)
→ Lire les données en clair du JSON
→ Les chiffrer avant écriture SQLite
→ Import réussi
```

**JSON plus récent (impossible normalement) :**
```
Import JSON v2 → App v1
→ Bloquer l'import
→ Message : "This backup requires a newer version of StackLab.
             Please update the app first."
→ Aucune écriture
```

**JSON corrompu ou format invalide :**
```
→ Validation Zod échoue
→ Import annulé, données existantes intactes
→ EH-14 : "Import failed. Your existing data is safe."
```

### Flow d'import complet

```typescript
async function importJSON(
  db: SQLiteDatabase,
  jsonContent: string
): Promise<ImportResult> {

  // 1. Parser le JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    return { ok: false, error: 'INVALID_JSON' };
  }

  // 2. Valider la structure avec Zod
  const result = ExportSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: 'VALIDATION_ERROR' };
  }

  const data = result.data;

  // 3. Vérifier la version
  const fileVersion    = parseInt(data.schema_version);
  const currentVersion = CURRENT_SCHEMA_VERSION;

  if (fileVersion > currentVersion) {
    return { ok: false, error: 'VERSION_TOO_NEW' };
  }

  // 4. Choisir la stratégie (Merge ou Replace)
  // → Documenté dans PRODUCT_DECISIONS.md Règle 11
  // → Replace : export automatique forcé avant toute écriture

  // 5. Écrire dans une transaction
  await db.execAsync('BEGIN TRANSACTION');
  try {
    await writeImportedData(db, data, fileVersion, currentVersion);
    await db.execAsync('COMMIT');
    return { ok: true };
  } catch (error) {
    await db.execAsync('ROLLBACK');
    return { ok: false, error: 'WRITE_ERROR' };
  }
}
```

---

## Règles absolues

### MS-01 — Jamais de DROP sans migration validée

```
DROP TABLE items; → INTERDIT sans migration documentée ici
DROP COLUMN quantity; → INTERDIT (SQLite ne supporte pas ALTER COLUMN de toute façon)

Alternative : table temporaire → migration des données → rename
```

### MS-02 — Toujours dans une transaction

```
Chaque migration = 1 transaction.
Si la migration échoue à mi-chemin → rollback → données v(n-1) intactes.
Jamais de migration hors transaction.
```

### MS-03 — Tester sur données réelles avant déploiement

```
Avant de déployer une migration :
1. Exporter un vrai JSON bêta (données réelles)
2. Lancer la migration sur ce JSON dans un environnement de test
3. Vérifier que toutes les données sont présentes et correctes
4. Seulement alors → déployer
```

### MS-04 — Informer l'utilisateur

```
Si une migration prend plus de 2 secondes :
→ Afficher EH-04 : "We need to update your database. This should only take a moment."
→ Ne jamais afficher un écran blanc sans explication
```

### MS-05 — Export automatique avant Replace

```
Si l'utilisateur choisit "Replace" lors d'un import :
→ Forcer un export JSON des données actuelles d'abord
→ L'utilisateur ne peut pas écraser sans avoir sauvegardé
(DATA_MODEL.md Règle 11)
```

### MS-06 — Jamais de migration automatique silencieuse sur les données utilisateur

```
Les migrations de schéma (ajout de colonne, renommage) → automatiques et silencieuses
Les migrations de données (chiffrement, transformation) → informer l'utilisateur
```

---

## Checklist avant chaque migration

```
□ La migration est documentée dans ce fichier (registre des versions mis à jour)
□ Elle est dans une transaction
□ Elle a un rollback en cas d'erreur
□ Elle met à jour schema_info.version
□ Elle a été testée sur un export JSON de données réelles
□ EH-04 est déclenché si la migration prend du temps
□ Le cas "downgrade" est géré (utilisateur rétrograde l'app)
```

---

*Dernière mise à jour : session design avril 2026*
*Propriétaire : Mounir*
