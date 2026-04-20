# DATABASE_SCHEMA.md — StackLab MVP
> Schéma SQL de référence. Source de vérité pour toute implémentation base de données.
> Toute déviation nécessite validation explicite du propriétaire.
> À lire en parallèle de DATA_MODEL.md (entités) et SECURITY.md (sécurité).

---

## Principes fondamentaux

### Modèle de sécurité MVP — Sandbox natif

Les données utilisateur sont stockées en SQLite local sur le device.
La protection repose sur le sandbox iOS/Android — hermétique par défaut pour toute app tierce.

Aucun chiffrement applicatif champ par champ n'est implémenté en MVP.
Le chiffrement applicatif (modèle Bitwarden) est prévu avant le lancement public,
une fois la base de code maîtrisée. Voir SECURITY.md pour le plan.

**Ce qui protège les données en MVP :**
- Sandbox iOS/Android — aucun accès inter-app possible
- expo-secure-store — clés sensibles dans le keychain natif
- Backup JSON — protection contre la perte de données

**Architecture de chiffrement Phase 8 (cloud sync) :**
```
react-native-bip39  → génération passphrase + seed PBKDF2
SubtleCrypto natif  → dérivation clé AES-256 (600 000 itérations OWASP 2025)
expo-crypto         → chiffrement AES-256-GCM du blob
expo-secure-store   → stockage de la clé dérivée
```

**Ce qui sera ajouté avant le lancement public :**
- Chiffrement applicatif AES-256 sur tous les champs sensibles via expo-crypto
- Architecture conçue pour cette migration : aucun calcul financier dans le SQL

### Types SQLite

```
TEXT      → Chaînes, UUIDs, dates ISO 8601, enums
INTEGER   → Entiers, booleans (0/1)
REAL      → Décimaux (poids, pureté, prix)
```

SQLite n'a pas de type UUID, BOOLEAN, DECIMAL, ou TIMESTAMP natif.
Tous les UUID sont TEXT. Tous les booleans sont INTEGER (0/1).
Toutes les dates/timestamps sont TEXT en ISO 8601.

### Règle fondamentale — Pas de calcul financier en SQL

Même sans chiffrement MVP, cette règle est non négociable.
Elle prépare la migration vers le chiffrement sans réécrire les requêtes.

```
Aucun SUM(), AVG(), ORDER BY sur les champs financiers.
Tous les calculs (current_value, P&L, fine_oz) se font en JavaScript.
Voir DATA_MODEL.md section "Calculs financiers" pour les formules.
```

### PRAGMAs obligatoires

Ces PRAGMAs doivent être exécutés à chaque ouverture de connexion,
avant toute requête.

```sql
PRAGMA foreign_keys = ON;    -- Intégrité référentielle active
PRAGMA journal_mode = WAL;   -- Write-Ahead Logging : meilleures performances
PRAGMA synchronous = NORMAL; -- Bon équilibre performance / durabilité
```

---

## Schéma SQLite — Client React Native

### Table schema_info

Suivi des migrations. Toujours présente. Toujours une seule ligne.

```sql
CREATE TABLE IF NOT EXISTS schema_info (
  version    INTEGER NOT NULL,
  applied_at TEXT    NOT NULL  -- ISO 8601 datetime
);

INSERT INTO schema_info (version, applied_at)
VALUES (1, datetime('now'));
```

---

### Table labs

```sql
CREATE TABLE IF NOT EXISTS labs (
  id               TEXT    NOT NULL PRIMARY KEY,  -- UUID v4 généré côté client
  user_id          TEXT,                          -- UUID FK → User (null si pas de cloud sync)
  name             TEXT    NOT NULL,              -- Nom libre du Lab
  cover_photo_url  TEXT,                          -- Chemin local ou URL distante (null si absent)
  type             TEXT    NOT NULL               -- standard | premium | wishlist
                   CHECK (type IN ('standard', 'premium', 'wishlist')),
  position         INTEGER NOT NULL DEFAULT 0,    -- Ordre d'affichage (0-based)
  created_at       TEXT    NOT NULL,              -- ISO 8601 datetime
  updated_at       TEXT    NOT NULL               -- ISO 8601 datetime
);
```

**Règles :**
- `type` est immutable après création
- `position` est géré par l'app — pas de contrainte UNIQUE (réordonnage libre)
- `user_id` est null jusqu'à activation du cloud sync

---

### Table decks

```sql
CREATE TABLE IF NOT EXISTS decks (
  id               TEXT    NOT NULL PRIMARY KEY,  -- UUID v4 généré côté client
  lab_id           TEXT    NOT NULL               -- FK → labs(id) — TOUJOURS présent
                   REFERENCES labs(id) ON DELETE RESTRICT,
  parent_id        TEXT                           -- FK → decks(id) — null si deck racine
                   REFERENCES decks(id) ON DELETE RESTRICT,
  name             TEXT    NOT NULL,              -- Nom libre du Deck
  cover_photo_url  TEXT,                          -- Chemin local ou URL distante (null si absent)
  position         INTEGER NOT NULL DEFAULT 0,    -- Ordre dans le parent
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL
);
```

**Règles :**
- `lab_id` toujours présent — même pour les sous-Decks (Règle 6 DATA_MODEL)
- `parent_id` null = Deck rattaché directement au Lab
- `ON DELETE RESTRICT` : l'app vide le Deck avant suppression — SQLite refuse sinon
- Profondeur max (2 free / 3 premium) : règle métier applicative, pas SQL

---

### Table items

```sql
CREATE TABLE IF NOT EXISTS items (
  -- Clés relationnelles
  id                     TEXT    NOT NULL PRIMARY KEY,  -- UUID v4 généré côté client
  lab_id                 TEXT    NOT NULL               -- FK → labs(id) — TOUJOURS présent
                         REFERENCES labs(id) ON DELETE RESTRICT,
  deck_id                TEXT                           -- FK → decks(id) — null si item direct dans Lab
                         REFERENCES decks(id) ON DELETE RESTRICT,

  -- Cycle de vie
  status                 TEXT    NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'sold', 'wishlist')),

  -- Identification
  name                   TEXT    NOT NULL,              -- Nom de série saisi librement
  family_key             TEXT    NOT NULL,              -- Slug série+métal. Ex: maple-leaf-silver
  metal                  TEXT    NOT NULL
                         CHECK (metal IN ('gold', 'silver')),
  mint_name              TEXT,                          -- Optionnel. Ex: Royal Canadian Mint
  shape                  TEXT    NOT NULL
                         CHECK (shape IN ('coin', 'bar', 'token', 'bust', 'custom')),
  shape_description      TEXT,                          -- Champ libre si shape = custom

  -- Métriques physiques
  -- weight_oz TOUJOURS en troy oz — conversion g/kg faite par l'app avant écriture
  weight_oz              REAL    NOT NULL               -- Troy oz. Ex: 1.000
                         CHECK (weight_oz > 0),
  weight_unit_input      TEXT    NOT NULL               -- oz | g | kg (unité saisie par l'utilisateur)
                         CHECK (weight_unit_input IN ('oz', 'g', 'kg')),
  purity                 REAL    NOT NULL               -- Ex: 0.999, 0.9999, 0.925
                         CHECK (purity > 0 AND purity <= 1),
  -- fine_weight_oz n'est JAMAIS stocké — toujours calculé : weight_oz × purity

  -- Attributs collection
  year                   INTEGER,                       -- Optionnel. Ex: 2022
  strike_finish          TEXT
                         CHECK (strike_finish IN ('BU', 'proof', 'reverse_proof', 'antique', 'matte', 'specimen', 'burnished', 'proof_like', 'unknown') OR strike_finish IS NULL),
  condition              TEXT
                         CHECK (condition IN ('uncirculated', 'circulated', 'damaged', 'unknown') OR condition IS NULL),
  grading_company        TEXT,                          -- [RESERVED] Ex: NGC, PCGS
  grade_value            TEXT,                          -- [RESERVED] Ex: MS70, PF70
  notes                  TEXT,                          -- Texte libre

  -- Financier actifs
  quantity               INTEGER NOT NULL DEFAULT 1    -- Min: 1. Jamais null. (Règle 1 DATA_MODEL)
                         CHECK (quantity >= 1),
  purchase_price         REAL,                          -- Prix total payé. Null si inconnu.
  purchase_currency      TEXT,                          -- Devise au moment de l'achat. Ex: USD, EUR, GBP
  purchase_exchange_rate REAL,                          -- Taux de change au moment de l'achat vs devise d'affichage
  purchase_date          TEXT,                          -- ISO 8601 date. Ex: 2022-03-15

  -- Financier Wishlist
  observed_price         REAL,                          -- Prix constaté sur le marché (Wishlist uniquement)
  observed_currency      TEXT,                          -- Devise du prix constaté
  observed_price_date    TEXT,                          -- ISO 8601 date du prix constaté

  -- Cycle de vie sold
  sold_date              TEXT,                          -- ISO 8601 date
  sold_price             REAL,                          -- Prix de vente total du lot
  sold_currency          TEXT,                          -- Devise de vente

  -- Média
  photo_url              TEXT,                          -- Chemin local ou URL distante

  -- Localisation physique
  location               TEXT,                          -- [RESERVED] coffre_maison | coffre_bancaire | tiers | custom

  -- Métadonnées
  created_at             TEXT    NOT NULL,
  updated_at             TEXT    NOT NULL
);
```

**Règles critiques :**
- `strike_finish` et `condition` sont des valeurs uniques par item — junction tables non requises
- `status: sold` → jamais de suppression physique (Règle 10 DATA_MODEL)
- `quantity >= 1` : enforced par SQL CHECK — jamais 0 ou null
- `weight_oz > 0` : enforced par SQL CHECK — jamais null
- `purity` entre 0 exclu et 1 inclus : enforced par SQL CHECK
- `metal` et `shape` : enforced par SQL CHECK sur les valeurs autorisées
- `family_key` est immutable après création (Règle 5 DATA_MODEL) — enforced par l'app
- `lab_id` non null garantit les requêtes rapides sans remonter l'arborescence

**Edge cases :**
- Un champ optionnel absent = NULL — ne jamais stocker une string vide ""
- `purchase_price = NULL` → P&L non calculé, non affiché (Règle 4 DATA_MODEL)
- `observed_price` est NULL sur les items actifs — seulement renseigné sur Wishlist

---

### Table item_features

Junction table — valeurs multiples par item (privy, colorized, gilded, etc.).

```sql
CREATE TABLE IF NOT EXISTS item_features (
  item_id TEXT NOT NULL
          REFERENCES items(id) ON DELETE RESTRICT,
  feature TEXT NOT NULL
          CHECK (feature IN ('privy', 'colorized', 'gilded', 'high_relief', 'ultra_high_relief', 'hologram', 'enamel', 'ruthenium', 'plated', 'insert', 'numbered_certificate')),
  PRIMARY KEY (item_id, feature)
);
```

**Règles :**
- Clé primaire composite `(item_id, feature)` — un item ne peut pas avoir la même feature deux fois
- `ON DELETE RESTRICT` : supprimer l'item d'abord, la table se vide via l'app

---

### Table item_packaging

Junction table — valeurs multiples par item (sealed, capsule, mint_box, etc.).

```sql
CREATE TABLE IF NOT EXISTS item_packaging (
  item_id  TEXT NOT NULL
           REFERENCES items(id) ON DELETE RESTRICT,
  packaging TEXT NOT NULL
           CHECK (packaging IN ('sealed', 'capsule', 'mint_box', 'with_certificate', 'raw')),
  PRIMARY KEY (item_id, packaging)
);
```

**Règles :**
- Clé primaire composite `(item_id, packaging)` — un item ne peut pas avoir le même packaging deux fois
- `ON DELETE RESTRICT` : supprimer l'item d'abord, la table se vide via l'app

---

### Table stack_snapshots

```sql
CREATE TABLE IF NOT EXISTS stack_snapshots (
  id              TEXT    NOT NULL PRIMARY KEY,   -- UUID v4
  date            TEXT    NOT NULL UNIQUE,         -- ISO 8601 date YYYY-MM-DD — 1 par jour max
  total_value     REAL    NOT NULL,               -- Valeur totale stack ce jour
  total_oz_gold   REAL    NOT NULL,               -- Total fine oz gold
  total_oz_silver REAL    NOT NULL,               -- Total fine oz silver
  spot_gold       REAL    NOT NULL,               -- Prix spot gold au moment du snapshot
  spot_silver     REAL    NOT NULL,               -- Prix spot silver au moment du snapshot
  currency        TEXT    NOT NULL,               -- Devise. Ex: USD
  created_at      TEXT    NOT NULL
);
```

**Règles :**
- UNIQUE sur `date` : 1 snapshot par jour maximum (règle métier DATA_MODEL)
- Déclenché silencieusement une fois par jour quand l'app est ouverte
- Seulement si au moins 1 item actif existe
- Seulement si spot disponible (pas offline)
- Jamais supprimé en MVP — conservé sans limite de durée

---

### Table settings (singleton)

```sql
CREATE TABLE IF NOT EXISTS settings (
  id                   INTEGER NOT NULL PRIMARY KEY
                        CHECK (id = 1),            -- Garantit qu'il n'existe qu'une seule ligne
  currency             TEXT    NOT NULL DEFAULT 'USD'
                        CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),
  weight_unit          TEXT    NOT NULL DEFAULT 'oz'
                        CHECK (weight_unit IN ('oz', 'g', 'kg')),
  cloud_sync           INTEGER NOT NULL DEFAULT 0
                        CHECK (cloud_sync IN (0, 1)),
  auto_backup_enabled  INTEGER NOT NULL DEFAULT 0  -- Choix Level 1 backup (onboarding étape 0). 0 = manuel uniquement, 1 = iCloud/Google Drive activé
                        CHECK (auto_backup_enabled IN (0, 1)),
  backup_reminder      INTEGER NOT NULL DEFAULT 1
                        CHECK (backup_reminder IN (0, 1)),
  hide_values          INTEGER NOT NULL DEFAULT 0
                        CHECK (hide_values IN (0, 1)),
  subscription_status  TEXT    NOT NULL DEFAULT 'free'
                        CHECK (subscription_status IN ('free', 'monthly', 'annual')),
  subscription_expiry  TEXT,                         -- ISO 8601 date. Null si free.
  onboarding_completed INTEGER NOT NULL DEFAULT 0
                        CHECK (onboarding_completed IN (0, 1)),
  onboarding_step      INTEGER NOT NULL DEFAULT 0
                        CHECK (onboarding_step IN (0, 1, 2, 3)),
  updated_at           TEXT    NOT NULL
);

-- Initialisation à la création de la base — une seule fois
INSERT INTO settings (
  id, currency, weight_unit, cloud_sync, auto_backup_enabled, backup_reminder,
  hide_values, subscription_status, subscription_expiry,
  onboarding_completed, onboarding_step, updated_at
) VALUES (
  1, 'USD', 'oz', 0, 0, 1,
  0, 'free', NULL,
  0, 0, datetime('now')
);
```

**Règles :**
- CHECK (id = 1) : singleton garanti au niveau SQL
- Pas de chiffrement : les préférences ne révèlent pas les holdings
- `subscription_status` vérifié par l'app avant chaque action premium
- En bêta : `subscription_status = 'free'` pour tous les utilisateurs

---

### Table settings_extended

```sql
CREATE TABLE IF NOT EXISTS settings_extended (
  key        TEXT NOT NULL PRIMARY KEY,  -- Clé lisible. Ex: 'preferred_view', 'active_skin'
  value      TEXT,                       -- Valeur sous forme de string
  updated_at TEXT NOT NULL
);
```

**Règles :**
- Réservée aux settings post-MVP et extensibles
- Pas de chiffrement en MVP — aucune valeur sensible attendue en MVP
- Clés réservées post-MVP (ne pas implémenter avant validation) :

```
preferred_view       → 'grid' | 'list'
daily_streak         → Nombre de jours consécutifs d'ouverture (ex: "7")
last_open            → ISO 8601 date de dernière ouverture (ex: "2026-04-17")
alert_gold_target    → Prix cible alertes gold (REAL stocké comme string)
alert_silver_target  → Prix cible alertes silver
milestone_silver_10  → "true" si célébration 10oz silver déjà affichée
milestone_silver_25  → "true"
milestone_silver_50  → "true"
milestone_silver_100 → "true"
milestone_silver_250 → "true"
milestone_silver_500 → "true"
milestone_silver_1000→ "true"
milestone_gold_0_5   → "true"
milestone_gold_1     → "true"
milestone_gold_5     → "true"
milestone_gold_10    → "true"
milestone_gold_20    → "true"
milestone_gold_50    → "true"
active_skin_item_global  → iap_id du skin actif sur tous les items
active_skin_deck_global  → iap_id du skin actif sur tous les decks
active_skin_lab_global   → iap_id du skin actif sur tous les labs
active_sound_pack        → iap_id du pack de sons actif
active_cinematic         → iap_id de la cinématique de création active
```

---

### Table owned_iap (post-MVP — Phase 8+)

Skins, sons, et animations IAP possédés par l'utilisateur.
**Ne pas créer cette table en MVP.** Elle sera ajoutée via migration (schema_version 3).

```sql
CREATE TABLE IF NOT EXISTS owned_iap (
  id           TEXT    NOT NULL PRIMARY KEY,  -- UUID v4
  iap_id       TEXT    NOT NULL UNIQUE,       -- Identifiant produit. Ex: 'skin_phantom'
  iap_type     TEXT    NOT NULL               -- skin_item | skin_deck | skin_lab | sound_pack | animation
               CHECK (iap_type IN ('skin_item', 'skin_deck', 'skin_lab', 'sound_pack', 'animation')),
  purchased_at TEXT    NOT NULL,              -- ISO 8601 datetime
  source       TEXT    NOT NULL DEFAULT 'purchase'
               CHECK (source IN ('purchase', 'subscription', 'promo')),
  created_at   TEXT    NOT NULL
);

-- Skin actif par contexte
CREATE TABLE IF NOT EXISTS active_skins (
  context      TEXT    NOT NULL PRIMARY KEY,  -- 'item_global' | 'deck_global' | 'lab_global' | 'item:{uuid}'
  iap_id       TEXT    NOT NULL,              -- FK → owned_iap.iap_id
  updated_at   TEXT    NOT NULL
);
```

**Règles owned_iap :**
- `iap_id` est unique — un même skin ne peut être possédé qu'une fois
- `source = 'subscription'` : accessible tant que l'abonnement est actif
- `source = 'purchase'` : possédé à vie
- Vérifier `owned_iap` avant d'afficher tout skin premium

**Règles active_skins :**
- `context = 'item_global'` → skin appliqué à tous les items
- `context = 'deck_global'` → skin appliqué à tous les decks
- `context = 'item:{uuid}'` → skin sur un item spécifique (override du global)
- Un contexte absent = skin Standard (free) actif

---

## Index SQLite

### Index non négociables

```sql
-- Chargement d'un Lab (LabDetail) — requête la plus fréquente
CREATE INDEX IF NOT EXISTS idx_items_lab_id
  ON items(lab_id);

-- Filtrage actifs / sold / wishlist — Dashboard, LabDetail
CREATE INDEX IF NOT EXISTS idx_items_status
  ON items(status);

-- Chargement d'un Deck (DeckDetail)
CREATE INDEX IF NOT EXISTS idx_items_deck_id
  ON items(deck_id);

-- Chargement des Decks d'un Lab
CREATE INDEX IF NOT EXISTS idx_decks_lab_id
  ON decks(lab_id);

-- Unicité quotidienne + lookup StackSnapshot
-- L'index est implicite via UNIQUE mais déclaré explicitement pour la lisibilité
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_date
  ON stack_snapshots(date);
```

-- Lookup features d'un item
CREATE INDEX IF NOT EXISTS idx_item_features_item_id
  ON item_features(item_id);

-- Lookup packaging d'un item
CREATE INDEX IF NOT EXISTS idx_item_packaging_item_id
  ON item_packaging(item_id);
```

### Index additionnels — À ajouter si besoin

Ne pas créer par défaut. Les index ont un coût en écriture (INSERT/UPDATE plus lents).
Ajouter uniquement si des lenteurs sont constatées.

```sql
-- Si les sous-Decks deviennent nombreux
-- CREATE INDEX idx_decks_parent_id ON decks(parent_id);

-- Si le sync cloud nécessite de récupérer les items modifiés récemment
-- CREATE INDEX idx_items_updated_at ON items(updated_at);

-- Si les items sold sont souvent consultés séparément (Realized P&L premium)
-- CREATE INDEX idx_items_status_created ON items(status, created_at);
```

---

## Schéma PostgreSQL — Backend Spring Boot

### Table users

```sql
CREATE TABLE users (
  id         UUID        NOT NULL PRIMARY KEY,  -- Dérivé de la passphrase via PBKDF2
  email      TEXT,                              -- AES-256 chiffré côté serveur (clé = variable env Railway)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Règles :**
- `id` est déterministe : même passphrase → même UUID (requis pour le sync multi-device)
- `email` est chiffré avec une clé serveur (variable d'environnement Railway)
  La clé serveur est distincte de toute clé client
- L'email n'est utilisé que pour envoyer la passphrase en cas de perte
- Jamais de mot de passe — auth via passphrase BIP39 uniquement (Phase 8)

---

### Table sync_blobs

```sql
CREATE TABLE sync_blobs (
  id             UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL UNIQUE      -- 1 blob par utilisateur
                 REFERENCES users(id) ON DELETE CASCADE,
  blob_data      TEXT        NOT NULL,            -- Export JSON chiffré AES-256 côté client avant envoi
  schema_version TEXT        NOT NULL,            -- Version du schéma SQLite. Ex: "1"
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Règles :**
- UNIQUE sur `user_id` : un seul blob par utilisateur
- `blob_data` = export JSON complet du SQLite local, chiffré par l'app avant envoi (Phase 8)
  Le serveur stocke un blob opaque — il ne peut pas lire le contenu
- `schema_version` permet de détecter les incompatibilités lors d'un restore
- ON DELETE CASCADE : suppression compte → suppression blob

---

### Table waitlist_entries

```sql
CREATE TABLE waitlist_entries (
  id          UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,              -- AES-256 chiffré côté serveur
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promo_code  TEXT,                              -- Généré au lancement premium. Null en bêta.
  converted   BOOLEAN     NOT NULL DEFAULT FALSE
);
```

**Règles :**
- Email chiffré côté serveur (même clé que users.email)
- Pas de lien avec `users` — la whitelist est anonyme par défaut
- `converted = true` quand l'utilisateur active un abonnement payant

---

## Règles transversales

### R-01 — PRAGMA foreign_keys

```
PRAGMA foreign_keys = ON est obligatoire à chaque ouverture de connexion.
Sans ce PRAGMA, SQLite ignore les contraintes FK silencieusement.
C'est la source la plus fréquente de bugs d'intégrité référentielle.
```

### R-02 — NULL vs string vide

```
Un champ optionnel absent = NULL
Ne jamais stocker "" (string vide) à la place de NULL
Un string vide n'est pas la même chose qu'une valeur absente
```

### R-03 — ON DELETE RESTRICT

```
Toutes les FK sont ON DELETE RESTRICT.
SQLite refuse la suppression si des enfants existent.
L'app gère le nettoyage avant toute suppression de conteneur.
C'est une protection contre les bugs applicatifs.
```

### R-04 — updated_at

```
updated_at est mis à jour par l'app à chaque modification.
SQLite n'a pas de trigger automatique — c'est une responsabilité applicative.
La couche de service est responsable de maintenir ce champ.
```

### R-05 — schema_version et migrations

```
Toute modification du schéma SQLite = incrémenter schema_info.version.
La stratégie complète est dans MIGRATION_STRATEGY.md.
Jamais de DROP COLUMN ou DROP TABLE sans migration validée.
```

### R-06 — Calculs financiers en JavaScript uniquement

```
Aucun calcul financier ne se fait en SQL — même si les champs sont en REAL.
Cette règle prépare la migration vers le chiffrement sans réécrire les requêtes.
Tous les calculs se font après lecture, en mémoire, en JavaScript.
Voir DATA_MODEL.md section "Calculs financiers" pour les formules exactes.
```

### R-07 — Cohérence lab_id sur les items

```
Un item dans un Deck a toujours lab_id renseigné (même lab que le Deck parent).
Cette cohérence est maintenue par l'app lors des opérations de déplacement.
Le schéma ne peut pas l'enforcer — c'est une responsabilité applicative.
```

### R-09 — Chiffrement pré-lancement public

```
Avant le lancement public (post-bêta), le chiffrement applicatif sera ajouté :
→ Tous les champs sensibles passeront de REAL/TEXT à TEXT (blobs AES-256)
→ La règle R-06 (pas de calcul SQL) garantit que les requêtes ne changent pas
→ Seule la couche de service change — lecture/écriture avec chiffrement transparent
→ Une migration schema_info.version sera nécessaire pour les utilisateurs bêta
Voir SECURITY.md pour le plan détaillé.
```

---

*Dernière mise à jour : session design avril 2026*
*Propriétaire : Mounir*
