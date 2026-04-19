# ARCHITECTURE.md — StackLab Client
> Architecture et séparation des responsabilités du client React Native.
> À lire avant d'écrire la première ligne de code en Phase 1.
> Toute déviation nécessite validation explicite du propriétaire.
> Ce document concerne uniquement le client. Backend et proxy ont leur propre architecture.

---

## Philosophie

**Le code spaghetti se forme quand une couche fait le travail d'une autre.**

Un composant qui appelle SQLite directement — c'est du spaghetti.
Un store Zustand qui contient de la logique de calcul financier — c'est du spaghetti.
Une fonction qui modifie un store ET écrit en base ET appelle un service — c'est du spaghetti.

La règle fondamentale : **chaque couche a une responsabilité, une seule.**

---

## Les 4 couches

```
┌─────────────────────────────────────────┐
│  UI — Composants React Native           │  Affiche. Délègue. Ne calcule pas.
├─────────────────────────────────────────┤
│  State — Stores Zustand                 │  Stocke l'état en mémoire. Ne persiste pas.
├─────────────────────────────────────────┤
│  Services — Logique métier              │  Orchestre. Calcule. Valide. Ne touche pas l'UI.
├─────────────────────────────────────────┤
│  Repository — Accès données             │  Lit et écrit en SQLite. Ne calcule pas.
└─────────────────────────────────────────┘
```

### Couche UI — Composants React Native

**Responsabilité unique :** afficher les données et déléguer les actions.

```
✅ Un composant PEUT :
→ Recevoir des props et les afficher
→ Appeler des actions du store (useItemStore().sellItem(...))
→ Naviguer (navigation.navigate(...))
→ Gérer l'état local purement visuel (isMenuOpen, isAnimating)
→ Appeler des hooks custom

❌ Un composant NE PEUT PAS :
→ Appeler directement la base de données
→ Contenir de la logique de calcul financier
→ Appeler l'API réseau directement
→ Contenir des requêtes SQL
→ Instancier un service directement (new ItemService())
```

### Couche State — Stores Zustand

**Responsabilité unique :** stocker l'état en mémoire et exposer des actions.

```
✅ Un store PEUT :
→ Stocker les données en mémoire (items, spot price, settings)
→ Exposer des selectors (getActiveItems, getTotalValueOz)
→ Appeler des services dans ses actions
→ Invalider le cache local

❌ Un store NE PEUT PAS :
→ Contenir de la logique de calcul financier
→ Appeler directement la base de données
→ Appeler directement l'API réseau
→ Manipuler des données brutes — uniquement des objets typés
```

### Couche Services — Logique métier

**Responsabilité unique :** orchestrer les opérations métier.

```
✅ Un service PEUT :
→ Appeler le repository (lecture/écriture SQLite)
→ Appeler des fonctions pures de calcul
→ Valider les données avec Zod
→ Orchestrer plusieurs opérations en séquence
→ Gérer les transactions SQLite

❌ Un service NE PEUT PAS :
→ Manipuler directement l'état React (setState, store.setState)
→ Contenir de la logique UI (navigation, toast, modal)
→ Appeler l'API réseau (sauf le spotService qui est dédié à ça)
→ Retourner des données non typées
```

### Couche Repository — Accès données

**Responsabilité unique :** lire et écrire en SQLite. Rien d'autre.

```
✅ Un repository PEUT :
→ Exécuter des requêtes SQL paramétrées
→ Mapper les rows SQLite en objets TypeScript typés
→ Gérer les transactions (BEGIN / COMMIT / ROLLBACK)

❌ Un repository NE PEUT PAS :
→ Contenir de la logique métier
→ Calculer des valeurs financières
→ Appeler d'autres services
→ Retourner des rows SQLite brutes — toujours des objets typés
```

---

## Structure de dossiers

```
client/
├── src/
│   ├── components/          ← Couche UI
│   │   ├── cards/
│   │   │   ├── ItemCard.tsx
│   │   │   ├── DeckCard.tsx
│   │   │   └── LabCard.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   └── BottomSheet.tsx
│   │   └── screens/
│   │       ├── LabsHome.tsx
│   │       ├── LabDetail.tsx
│   │       └── DashboardHome.tsx
│   │
│   ├── stores/              ← Couche State
│   │   ├── itemStore.ts
│   │   ├── labStore.ts
│   │   ├── spotStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── services/            ← Couche Services (logique métier)
│   │   ├── itemService.ts
│   │   ├── labService.ts
│   │   ├── deckService.ts
│   │   ├── snapshotService.ts
│   │   └── spotService.ts
│   │
│   ├── repositories/        ← Couche Data (accès SQLite)
│   │   ├── itemRepository.ts
│   │   ├── labRepository.ts
│   │   ├── deckRepository.ts
│   │   └── settingsRepository.ts
│   │
│   ├── utils/               ← Fonctions pures
│   │   ├── calculations.ts  ← Calculs financiers
│   │   ├── formatters.ts    ← Formatage d'affichage
│   │   └── validators.ts    ← Validation Zod
│   │
│   ├── hooks/               ← Hooks custom React
│   │   ├── useSpotPrice.ts
│   │   ├── useBackup.ts
│   │   └── useHaptics.ts
│   │
│   ├── schemas/             ← Schémas Zod partagés
│   │   ├── item.schema.ts
│   │   ├── lab.schema.ts
│   │   └── export.schema.ts
│   │
│   ├── types/               ← Types TypeScript
│   │   ├── item.types.ts
│   │   ├── lab.types.ts
│   │   └── spot.types.ts
│   │
│   ├── db/                  ← Configuration SQLite
│   │   ├── database.ts      ← Instance SQLiteDatabase singleton
│   │   └── migrations.ts    ← Voir MIGRATION_STRATEGY.md
│   │
│   └── api/                 ← Appels réseau
│       └── api.ts           ← Wrapper fetch (voir API_CONTRACTS.md)
│
├── assets/                  ← PRIVÉ — jamais mirroré
│   ├── sounds/
│   └── skins/
│
└── app/                     ← Routes Expo Router (si utilisé) ou navigation/
    └── navigation/
        └── AppNavigator.tsx
```

---

## Fonctions pures — Règle critique

**Définition :** une fonction pure retourne toujours le même résultat pour les mêmes entrées. Elle ne modifie rien en dehors d'elle-même.

**Tous les calculs financiers sont des fonctions pures dans `utils/calculations.ts`.**

```typescript
// ✅ Fonction pure — testable, prévisible
export function calcFineWeightOz(weightOz: number, purity: number): number {
  return weightOz * purity;
}

export function calcMeltValue(
  fineWeightOz: number,
  spotPricePerOz: number
): number {
  return fineWeightOz * spotPricePerOz;
}

export function calcUnrealizedPnL(
  currentValue: number,
  purchasePrice: number | null
): number | null {
  if (purchasePrice === null) return null;
  return currentValue - purchasePrice;
}

// ❌ Pas une fonction pure — effets de bord
// Ne jamais faire ça dans calculations.ts
export async function calcAndSaveMeltValue(item: Item) {
  const value = item.weightOz * item.purity * spotPrice; // dépend d'un état externe
  await db.runAsync('UPDATE items SET ...'); // effet de bord
}
```

**Règle :** si une fonction dans `calculations.ts` a besoin d'accéder à la base de données ou à un store → elle est mal placée. La déplacer dans un service.

---

## Pattern Service — Exemple complet

```typescript
// services/itemService.ts

import { itemRepository } from '../repositories/itemRepository';
import { calcFineWeightOz, calcMeltValue } from '../utils/calculations';
import { ItemCreateSchema } from '../schemas/item.schema';
import type { ItemCreate, Item } from '../types/item.types';

export const itemService = {

  // Créer un item — orchestration complète
  async create(data: unknown): Promise<Item> {
    // 1. Valider avec Zod
    const validated = ItemCreateSchema.parse(data); // throws si invalide

    // 2. Calculer les dérivés (fonctions pures)
    const fineWeightOz = calcFineWeightOz(validated.weightOz, validated.purity);

    // 3. Persister via repository
    const item = await itemRepository.create({
      ...validated,
      fineWeightOz,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return item;
  },

  // Vendre N unités
  async sell(itemId: string, qty: number, soldPrice: number): Promise<void> {
    const item = await itemRepository.findById(itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');
    if (qty > item.quantity) throw new Error('QTY_EXCEEDS_STOCK');
    if (qty <= 0) throw new Error('INVALID_QTY');

    // Opération dans une transaction (voir MIGRATION_STRATEGY.md MS-02)
    await itemRepository.sellUnits(item, qty, soldPrice);
  },
};
```

---

## Pattern Repository — Exemple complet

```typescript
// repositories/itemRepository.ts

import { getDatabase } from '../db/database';
import type { Item, ItemCreate } from '../types/item.types';

export const itemRepository = {

  async findById(id: string): Promise<Item | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<RawItem>(
      'SELECT * FROM items WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return mapRowToItem(row); // Toujours mapper vers un type — jamais retourner le row brut
  },

  async findByLabId(labId: string): Promise<Item[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RawItem>(
      'SELECT * FROM items WHERE lab_id = ? AND status = ?',
      [labId, 'active']
    );
    return rows.map(mapRowToItem);
  },

  async create(item: ItemCreate): Promise<Item> {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO items (id, lab_id, deck_id, name, metal, weight_oz, purity,
        quantity, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.labId, item.deckId ?? null, item.name, item.metal,
       item.weightOz, item.purity, item.quantity, 'active',
       item.createdAt, item.updatedAt]
    );
    return this.findById(item.id) as Promise<Item>;
  },

  // Jamais de SQL construit par concaténation — toujours des paramètres
};

// Mapping privé — jamais exporté
function mapRowToItem(row: RawItem): Item {
  return {
    id: row.id,
    labId: row.lab_id,
    deckId: row.deck_id ?? undefined,
    name: row.name,
    metal: row.metal as 'gold' | 'silver',
    weightOz: row.weight_oz,
    purity: row.purity,
    quantity: row.quantity,
    status: row.status as 'active' | 'sold' | 'wishlist',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

---

## Pattern Store Zustand — Exemple complet

```typescript
// stores/itemStore.ts

import { create } from 'zustand';
import { itemService } from '../services/itemService';
import type { Item } from '../types/item.types';

interface ItemStore {
  items: Item[];
  isLoading: boolean;
  error: string | null;

  // Actions — appellent des services, jamais la DB directement
  loadItemsByLab: (labId: string) => Promise<void>;
  createItem: (data: unknown) => Promise<void>;
  sellItem: (itemId: string, qty: number, soldPrice: number) => Promise<void>;
}

export const useItemStore = create<ItemStore>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  loadItemsByLab: async (labId) => {
    set({ isLoading: true, error: null });
    try {
      const items = await itemService.getByLabId(labId);
      set({ items, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'LOAD_ERROR' });
    }
  },

  createItem: async (data) => {
    const item = await itemService.create(data);
    set(state => ({ items: [...state.items, item] }));
    // ✅ Pas de logique UI ici — le composant décide comment réagir
  },

  sellItem: async (itemId, qty, soldPrice) => {
    await itemService.sell(itemId, qty, soldPrice);
    // Recharger les items après vente
    // (ou mettre à jour optimistiquement selon la complexité)
  },
}));
```

---

## Pattern Composant — Exemple complet

```typescript
// components/screens/LabDetail.tsx

import { useItemStore } from '../../stores/itemStore';
import { ItemCard } from '../cards/ItemCard';

export function LabDetail({ labId }: { labId: string }) {
  const { items, isLoading, loadItemsByLab } = useItemStore();

  useEffect(() => {
    loadItemsByLab(labId); // ✅ Délègue au store, pas de logique ici
  }, [labId]);

  // ✅ Le composant affiche — rien d'autre
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => <ItemCard item={item} />}
      refreshing={isLoading}
      onRefresh={() => loadItemsByLab(labId)}
    />
  );
}
```

---

## Singleton SQLite — Instance unique

La base de données SQLite ne doit avoir qu'une seule instance dans toute l'app.

```typescript
// db/database.ts

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  if (db) return; // Déjà initialisée
  db = await SQLite.openDatabaseAsync('stacklab.db');
  await applyPragmas(db);
  await runMigrations(db); // Voir MIGRATION_STRATEGY.md
}

async function applyPragmas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA synchronous = NORMAL;');
}
```

---

## Règles TypeScript strict

**tsconfig.json — Configuration obligatoire :**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Règles :**

```
❌ Interdit :
→ any — toujours typer explicitement
→ as unknown as X — les double cast cachent des bugs
→ ! (non-null assertion) sauf cas documentés explicitement
→ @ts-ignore — résoudre le problème, pas le cacher

✅ Obligatoire :
→ Types explicites sur toutes les fonctions publiques
→ Zod pour valider toutes les données externes (API, SQLite, import JSON)
→ Types partagés dans src/types/ — jamais redéfinis localement
→ Enums TypeScript ou union types pour les valeurs contraintes
```

---

## Règles de nommage

```
Fichiers :
→ composants     : PascalCase.tsx        (ItemCard.tsx)
→ hooks          : camelCase.ts          (useSpotPrice.ts)
→ services       : camelCase.ts          (itemService.ts)
→ repositories   : camelCase.ts          (itemRepository.ts)
→ utils          : camelCase.ts          (calculations.ts)
→ stores         : camelCase.ts          (itemStore.ts)
→ types          : camelCase.types.ts    (item.types.ts)
→ schemas        : camelCase.schema.ts   (item.schema.ts)

Variables et fonctions :
→ camelCase pour tout sauf les composants
→ Verbes pour les fonctions : calcFineWeightOz, loadItemsByLab, sellItem
→ Noms pour les types : Item, Lab, Deck, SpotPrice
→ Préfixe "use" obligatoire pour les hooks : useItemStore, useSpotPrice

Constants :
→ UPPER_SNAKE_CASE : CURRENT_SCHEMA_VERSION, APPLICATION_SALT
```

---

## Ce qui est interdit — Liste explicite

```
❌ Appel SQLite dans un composant
   → Déplacer dans un repository

❌ Calcul financier dans un composant ou un store
   → Déplacer dans utils/calculations.ts

❌ Logique métier dans un composant
   → Déplacer dans un service

❌ console.log() en production
   → Utiliser le système de log structuré (ERROR_HANDLING.md)

❌ fetch() nu sans wrapper
   → Toujours utiliser api.ts (ERROR_HANDLING.md pattern fetchWithErrorHandling)

❌ SQL construit par concaténation de strings
   → Toujours des paramètres : db.runAsync('... WHERE id = ?', [id])

❌ État local pour des données persistantes
   → Les données persistantes vivent dans le store, pas dans useState

❌ Copier-coller de logique entre services
   → Extraire en fonction pure dans utils/

❌ Typage implicite (inférence) sur les fonctions publiques
   → Toujours déclarer explicitement le type de retour

❌ Import circulaire
   → UI importe store, store importe service, service importe repository
   → Jamais en sens inverse
```

---

## Flux de données — Sens unique

```
Action utilisateur
    ↓
Composant (UI)
    ↓ appelle action du store
Store (Zustand)
    ↓ appelle service
Service (logique métier)
    ↓ appelle repository      ↓ appelle utils/calculations.ts
Repository (SQLite)           Fonction pure
    ↓ retourne typed object
Service
    ↓ retourne résultat
Store → met à jour items[]
    ↓ re-render
Composant (UI)
```

**Jamais en sens inverse.** Un repository n'appelle pas un service. Un service n'appelle pas un store.

---

## Architecture backend (résumé)

Le backend Spring Boot suit une architecture similaire :

```
Controller  → reçoit la requête HTTP, délègue
Service     → logique métier, orchestration
Repository  → JPA/Hibernate, accès PostgreSQL
```

Le backend est documenté dans ses propres fichiers. Ce document couvre uniquement le client.

---

*Dernière mise à jour : session design avril 2026*
*Propriétaire : Mounir*
