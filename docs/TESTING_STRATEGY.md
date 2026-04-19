# TESTING_STRATEGY.md — StackLab MVP
> Stratégie de tests. À lire avant d'écrire le premier test.
> Toute déviation nécessite validation explicite du propriétaire.

---

## Philosophie

Les tests ne sont pas une contrainte — ils sont une protection.

Pour un développeur débutant sur un projet à données financières :
- Un bug dans les calculs financiers = chiffres faux affichés à l'utilisateur
- Un bug dans `vendre(n)` = incohérence irréparable dans les holdings
- Un bug dans la validation Zod = données corrompues en base

Ces bugs sont silencieux. L'app ne crashe pas — elle affiche juste quelque chose de faux.
Les tests les attrapent avant l'utilisateur.

**Règle fondamentale : on écrit les tests immédiatement après chaque feature.**
Jamais "je testerai plus tard". Plus tard n'existe pas.

---

## Ce qui se teste, ce qui ne se teste pas

### Toujours tester

```
→ Tout calcul financier (valeur, P&L, fine oz)
→ Tout comportement métier Item (vendre, déplacer, extraire)
→ Toute validation Zod (schémas d'entrée)
→ Toute règle métier documentée dans DATA_MODEL.md
→ Tout endpoint backend (au moins le happy path + les cas d'erreur principaux)
→ Toute règle de rate limiting backend
```

### Tester si complexe

```
→ Stores Zustand si la logique dépasse get/set
→ Requêtes SQLite si les jointures ou conditions sont non triviales
→ Composants React Native si la logique UI est significative
```

### Ne jamais tester

```
→ Les bibliothèques tierces (expo-crypto, expo-sqlite, Zod) — elles ont leurs propres tests
→ La configuration (jest.config.js, tsconfig.json)
→ Les types TypeScript — le compilateur le fait
→ Le styling (couleurs, marges, animations)
→ Le contenu statique (textes, labels)
→ Les mocks eux-mêmes
```

---

## Stack de tests

### Client React Native

| Outil | Usage | Installation |
|---|---|---|
| **Jest** | Test runner principal — intégré à Expo | Déjà présent |
| **@testing-library/react-native** | Tests composants (render + interactions) | `npx expo install @testing-library/react-native` |
| **jest-expo** | Preset Jest adapté à Expo | Déjà présent |

**Pourquoi Jest et non Vitest ?**
Vitest est conçu pour les projets Vite (web). React Native utilise Metro comme bundler.
Jest est le standard officiel de l'écosystème React Native et est intégré nativement dans Expo.

**Configuration Jest (déjà dans package.json Expo) :**
```json
{
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ]
  }
}
```

---

### Backend Spring Boot

| Outil | Usage |
|---|---|
| **JUnit 5** | Test runner — intégré à Spring Boot |
| **Mockito** | Mocking des dépendances |
| **Spring Boot Test** | Tests d'intégration avec contexte Spring |
| **MockMvc** | Tests des endpoints HTTP sans serveur réel |

---

### Proxy (Spring Boot — même setup que le backend)

Les tests du proxy suivent le même pattern que le backend : JUnit 5 + MockMvc.
Voir la section Backend ci-dessus.

---

## Organisation des fichiers de tests

### Client

```
client/
├── src/
│   ├── services/
│   │   ├── itemService.ts
│   │   └── itemService.test.ts     ← test unitaire des comportements Item
│   ├── repositories/
│   │   ├── itemRepository.ts
│   │   └── itemRepository.test.ts  ← test repository si requêtes complexes
│   ├── utils/
│   │   ├── calculations.ts
│   │   └── calculations.test.ts    ← test unitaire des calculs financiers
│   ├── schemas/
│   │   ├── item.schema.ts
│   │   └── item.schema.test.ts     ← test validation Zod
│   ├── stores/
│   │   ├── itemStore.ts
│   │   └── itemStore.test.ts       ← test du store si logique complexe
│   ├── db/
│   │   └── migrations.test.ts      ← test migrations SQLite (voir MIGRATION_STRATEGY.md)
│   └── components/
│       └── ItemCard/
│           ├── ItemCard.tsx
│           └── ItemCard.test.tsx   ← test composant si logique UI
```

**Convention de nommage :**
- Tests unitaires : `fichier.test.ts` ou `fichier.test.tsx`
- Jamais de dossier `__tests__/` séparé — le test vit à côté du fichier testé

---

### Backend

```
backend/
└── src/
    └── test/
        └── java/com/stacklab/
            ├── service/
            │   └── SyncServiceTest.java       ← tests unitaires services
            ├── controller/
            │   └── SyncControllerTest.java    ← tests intégration endpoints
            └── security/
                └── RateLimitingTest.java      ← tests rate limiting
```

---

## Tests prioritaires — Dans l'ordre

### Priorité 1 — CRITIQUE (MVP bloquant)

Ces tests doivent exister avant toute mise en production.
Un bug ici = données corrompues ou incohérence irréparable dans les holdings.

> **Note :** Le chiffrement applicatif SQLite n'est pas implémenté en MVP.
> Les tests de chiffrement sont documentés en Priorité Pré-lancement ci-dessous.

---

#### 1.1 — Calculs financiers

```typescript
// client/src/utils/calculations.test.ts

describe('Calculs financiers', () => {

  describe('fine_weight_oz', () => {
    test('Maple Leaf .9999 1oz', () => {
      expect(calcFineWeightOz(1.000, 0.9999)).toBeCloseTo(0.9999, 4);
    });
    test('Krugerrand .9167 1oz', () => {
      expect(calcFineWeightOz(1.000, 0.9167)).toBeCloseTo(0.9167, 4);
    });
    test('poids nul retourne 0', () => {
      expect(calcFineWeightOz(0, 0.999)).toBe(0);
    });
  });

  describe('current_value', () => {
    test('valeur = weight_oz × quantity × purity × spot', () => {
      // 7 Maple Leafs 1oz .9999, spot silver = 35.00 USD
      const value = calcCurrentValue(1.000, 7, 0.9999, 35.00);
      expect(value).toBeCloseTo(7 * 0.9999 * 35.00, 2);
    });
    test('quantity 0 est interdit — ne doit jamais arriver', () => {
      // quantity est toujours >= 1 (Règle 1 DATA_MODEL)
      // Ce test documente que la fonction n'est jamais appelée avec 0
      expect(() => calcCurrentValue(1.000, 0, 0.999, 35.00)).toThrow();
    });
  });

  describe('unrealized_pnl', () => {
    test('P&L positif si valeur > prix achat', () => {
      const pnl = calcUnrealizedPnL(
        calcCurrentValue(1.000, 1, 0.9999, 35.00), // current_value
        30.00  // purchase_price
      );
      expect(pnl).toBeGreaterThan(0);
    });
    test('P&L null si purchase_price absent', () => {
      const pnl = calcUnrealizedPnL(35.00, null);
      expect(pnl).toBeNull();
    });
    test('P&L négatif si valeur < prix achat', () => {
      const pnl = calcUnrealizedPnL(25.00, 30.00);
      expect(pnl).toBeLessThan(0);
    });
  });

  describe('wishlist_gap', () => {
    test('gap positif = premium au-dessus du melt (attendre)', () => {
      const gap = calcWishlistGap(48.00, 34.82); // observed > melt
      expect(gap).toBeCloseTo(13.18, 2);
      expect(gap).toBeGreaterThan(0);
    });
    test('gap négatif = opportunité sous le melt', () => {
      const gap = calcWishlistGap(30.00, 34.82); // observed < melt
      expect(gap).toBeLessThan(0);
    });
    test('gap null si observed_price absent', () => {
      expect(calcWishlistGap(null, 34.82)).toBeNull();
    });
  });

  describe('conversion de poids', () => {
    test('1g = 0.0321507 oz', () => {
      expect(convertToOz(1, 'g')).toBeCloseTo(0.0321507, 6);
    });
    test('1kg = 32.1507 oz', () => {
      expect(convertToOz(1, 'kg')).toBeCloseTo(32.1507, 4);
    });
    test('1oz = 1oz', () => {
      expect(convertToOz(1, 'oz')).toBe(1);
    });
  });
});
```

---

#### 1.3 — Comportements Item (logique métier)

```typescript
// client/src/services/itemService.test.ts

describe('Item — comportements object-first', () => {

  describe('vendre(n)', () => {
    test('vente partielle : item original quantity diminue, nouvel item sold créé', () => {
      const item = makeItem({ quantity: 7, status: 'active' });
      const { updatedItem, soldItem } = vendre(item, 2, 69.50, true); // parUnite=true

      expect(updatedItem.quantity).toBe(5);
      expect(updatedItem.status).toBe('active');
      expect(soldItem.quantity).toBe(2);
      expect(soldItem.status).toBe('sold');
      expect(soldItem.sold_price).toBeCloseTo(69.50 * 2, 2); // parUnite
    });

    test('vente totale : item entier passe en sold, pas de doublon', () => {
      const item = makeItem({ quantity: 3, status: 'active' });
      const { updatedItem, soldItem } = vendre(item, 3, 100, false);

      expect(updatedItem).toBeNull(); // item entier vendu, pas de résidu
      expect(soldItem.quantity).toBe(3);
      expect(soldItem.sold_price).toBeCloseTo(100, 2); // parLot
    });

    test('prix par lot : sold_price = prix saisi (pas × qty)', () => {
      const item = makeItem({ quantity: 5, status: 'active' });
      const { soldItem } = vendre(item, 2, 150, false); // parUnite=false
      expect(soldItem.sold_price).toBeCloseTo(150, 2);
    });

    test('prix par unité : sold_price = prix × qty vendue', () => {
      const item = makeItem({ quantity: 5, status: 'active' });
      const { soldItem } = vendre(item, 2, 75, true); // parUnite=true
      expect(soldItem.sold_price).toBeCloseTo(150, 2);
    });

    test('vendre qty = 0 retourne null (aucune action)', () => {
      const item = makeItem({ quantity: 7 });
      const result = vendre(item, 0, null, false);
      expect(result).toBeNull();
    });

    test('vendre qty > quantity disponible lève une erreur', () => {
      const item = makeItem({ quantity: 3 });
      expect(() => vendre(item, 5, null, false)).toThrow();
    });
  });

  describe('déplacer(n)', () => {
    test('déplacement partiel : item original diminue, nouvel item créé à destination', () => {
      const item = makeItem({ quantity: 7, lab_id: 'lab-1', deck_id: 'deck-1' });
      const { updatedItem, movedItem } = deplacer(item, 3, 'lab-2', 'deck-2');

      expect(updatedItem.quantity).toBe(4);
      expect(movedItem.quantity).toBe(3);
      expect(movedItem.lab_id).toBe('lab-2');
      expect(movedItem.deck_id).toBe('deck-2');
    });

    test('déplacement total : item entier déplacé, pas d'extraction inutile', () => {
      const item = makeItem({ quantity: 3, lab_id: 'lab-1' });
      const { updatedItem, movedItem } = deplacer(item, 3, 'lab-2', null);

      expect(updatedItem).toBeNull(); // item entier déplacé
      expect(movedItem.lab_id).toBe('lab-2');
    });
  });

  describe('extraire(n)', () => {
    test('extrait N unités dans le même emplacement avec nouvel UUID', () => {
      const item = makeItem({ quantity: 7, lab_id: 'lab-1', deck_id: 'deck-1' });
      const { updatedItem, extractedItem } = extraire(item, 1);

      expect(updatedItem.quantity).toBe(6);
      expect(extractedItem.quantity).toBe(1);
      expect(extractedItem.id).not.toBe(item.id); // UUID distinct
      expect(extractedItem.lab_id).toBe('lab-1');   // même emplacement
      expect(extractedItem.deck_id).toBe('deck-1');
    });
  });

  describe('supprimer(n)', () => {
    test('suppression partielle : quantity diminue', () => {
      const item = makeItem({ quantity: 7 });
      const result = supprimer(item, 2);
      expect(result.quantity).toBe(5);
    });

    test('suppression totale : retourne null (suppression physique)', () => {
      const item = makeItem({ quantity: 3 });
      const result = supprimer(item, 3);
      expect(result).toBeNull();
    });

    test('supprimer un item sold lève une erreur (Règle 10)', () => {
      const item = makeItem({ quantity: 2, status: 'sold' });
      expect(() => supprimer(item, 2)).toThrow();
    });
  });
});
```

---

#### 1.4 — Validation Zod

```typescript
// client/src/schemas/item.schema.test.ts

describe('ItemSchema — validation Zod', () => {

  test('item valide passe la validation', () => {
    const validItem = {
      metal: 'silver',
      name: 'Maple Leaf',
      shape: 'coin',
      weight_oz: 1.000,
      purity: 0.9999,
      quantity: 7,
      status: 'active',
    };
    expect(() => ItemSchema.parse(validItem)).not.toThrow();
  });

  test('metal invalide est rejeté', () => {
    expect(() => ItemSchema.parse({ ...validBase, metal: 'platinum' })).toThrow();
  });

  test('quantity < 1 est rejeté', () => {
    expect(() => ItemSchema.parse({ ...validBase, quantity: 0 })).toThrow();
  });

  test('purity > 1 est rejeté', () => {
    expect(() => ItemSchema.parse({ ...validBase, purity: 1.5 })).toThrow();
  });

  test('weight_oz = 0 est rejeté', () => {
    expect(() => ItemSchema.parse({ ...validBase, weight_oz: 0 })).toThrow();
  });

  test('status invalide est rejeté', () => {
    expect(() => ItemSchema.parse({ ...validBase, status: 'deleted' })).toThrow();
  });
});
```

---

### Priorité 2 — IMPORTANT

Ces tests évitent les régressions sur les règles métier moins critiques.

---

#### 2.1 — StackSnapshot (règle 1 par jour)

```typescript
describe('StackSnapshot', () => {
  test('créer un snapshot le même jour ne duplique pas', async () => {
    await createSnapshot(today, stackData);
    await createSnapshot(today, stackData); // second appel

    const snapshots = await getSnapshotsByDate(today);
    expect(snapshots).toHaveLength(1); // un seul
  });

  test('snapshot déclenché seulement si au moins 1 item actif', async () => {
    const result = await maybeCreateSnapshot([], spotData); // liste vide
    expect(result).toBeNull();
  });

  test('snapshot déclenché seulement si spot disponible', async () => {
    const result = await maybeCreateSnapshot(items, null); // spot null
    expect(result).toBeNull();
  });
});
```

---

#### 2.2 — Rate limiting backend (Java)

```java
// RateLimitingTest.java

@SpringBootTest
@AutoConfigureMockMvc
class RateLimitingTest {

    @Test
    void syncEndpoint_shouldReturn429_afterRateLimit() throws Exception {
        // 60 requêtes par minute → la 61e doit être rejetée
        for (int i = 0; i < 60; i++) {
            mockMvc.perform(post("/sync").header("X-UUID", "test-uuid"))
                   .andExpect(status().isOk());
        }

        mockMvc.perform(post("/sync").header("X-UUID", "test-uuid"))
               .andExpect(status().isTooManyRequests())
               .andExpect(header().exists("Retry-After"));
    }

    @Test
    void pricesEndpoint_shouldIncludeRetryAfterHeader_on429() throws Exception {
        // Vérification que le header Retry-After est présent sur 429
        // (requis par SECURITY.md)
    }
}
```

---

#### 2.3 — Endpoints backend (happy path + erreurs)

```java
// SyncControllerTest.java

@SpringBootTest
@AutoConfigureMockMvc
class SyncControllerTest {

    @Test
    void postSync_shouldReturn200_withValidPayload() throws Exception {
        String payload = """
            {"uuid": "valid-uuid", "blob_data": "encrypted-blob", "schema_version": "1"}
            """;

        mockMvc.perform(post("/sync")
               .contentType(MediaType.APPLICATION_JSON)
               .content(payload))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.synced_at").exists());
    }

    @Test
    void postSync_shouldReturn400_withMissingFields() throws Exception {
        mockMvc.perform(post("/sync")
               .contentType(MediaType.APPLICATION_JSON)
               .content("{}"))
               .andExpect(status().isBadRequest());
    }

    @Test
    void getPrices_shouldReturn200_withExpectedFields() throws Exception {
        mockMvc.perform(get("/prices?currency=USD"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.gold").isNumber())
               .andExpect(jsonPath("$.silver").isNumber())
               .andExpect(jsonPath("$.updated_at").exists());
    }
}
```

---

### Priorité 3 — OPTIONNEL en MVP

À ajouter si le temps le permet. Pas bloquant pour le lancement bêta.

---

#### 3.1 — Stores Zustand (si logique complexe)

```typescript
// Tester uniquement si le store contient de la logique métier
// Pas nécessaire pour de simples get/set

describe('itemStore', () => {
  test('addItem met à jour le state correctement', () => {
    const { result } = renderHook(() => useItemStore());
    act(() => result.current.addItem(mockItem));
    expect(result.current.items).toHaveLength(1);
  });
});
```

---

#### 3.2 — Composants React Native

```typescript
// Tester uniquement les composants avec logique UI significative
// Pas les composants purement présentationnels

describe('ItemCard', () => {
  test('affiche la valeur melt formatée', () => {
    const { getByText } = render(<ItemCard item={mockItem} spotPrice={35.00} />);
    expect(getByText('$244.97')).toBeTruthy(); // 7 × 1oz × .9999 × 35
  });
});
```

---

## Coverage — Objectifs réalistes

Ne pas viser un pourcentage global arbitraire. Viser la confiance sur les zones critiques.

```
Chiffrement/déchiffrement     → 100% des cas documentés
Calculs financiers             → 100% des formules de DATA_MODEL.md
Comportements Item             → 100% des cas documentés (vendre, déplacer, extraire, supprimer)
Validation Zod                 → 100% des champs obligatoires + cas d'erreur principaux
Endpoints backend              → 80%+ (happy path + erreurs 400/429)
Rate limiting                  → 100% des limites documentées dans SECURITY.md
Stores Zustand                 → Pas de cible — tester si logique complexe
Composants UI                  → Pas de cible en MVP
```

---

## Mocks — Règles

### Ce qui doit être mocké

```typescript
// expo-sqlite → utiliser une DB en mémoire pour les tests
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: () => mockSQLiteDB,
}));

// expo-secure-store → retourner une clé de test fixe
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('test-key-base64'),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// @react-native-community/netinfo → simuler online/offline
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));
```

### Ce qui ne doit PAS être mocké

```
→ Les fonctions de calcul financier — elles doivent être testées réellement
→ Les schémas Zod — ils doivent être testés réellement
→ La logique de chiffrement — quand elle sera implémentée (pré-lancement)
```

---

## Commandes de test

### Client

```bash
# Tous les tests
npm test

# Tests en watch mode (développement)
npm test -- --watch

# Avec coverage
npm test -- --coverage

# Un seul fichier
npm test -- calculations.test.ts
```

### Backend

```bash
# Tous les tests
./mvnw test

# Un seul test
./mvnw test -Dtest=SyncControllerTest

# Avec coverage (JaCoCo)
./mvnw test jacoco:report
```

---

## Workflow — Quand écrire les tests

```
Feature développée
    ↓
Tests unitaires écrits (Priorité 1 si applicable)
    ↓
Tests d'intégration écrits (Priorité 2 si applicable)
    ↓
Tous les tests passent
    ↓
Commit
    ↓
Prochaine feature
```

**Jamais de commit avec des tests qui échouent.**
**Jamais de feature livrée sans les tests de Priorité 1 correspondants.**

---

### Priorité Pré-lancement — Chiffrement applicatif

Ces tests sont écrits **avant le lancement public**, lors de l'implémentation du chiffrement SQLite.
Pas en MVP. Pas en bêta. Avant de soumettre sur les stores.

```typescript
// client/src/services/crypto.test.ts

describe('CryptoService — chiffrement applicatif SQLite', () => {

  test('chiffrer puis déchiffrer retourne le plaintext original', async () => {
    const plaintext = '15000.50';
    const key = await generateTestKey();
    const blob = await encrypt(plaintext, key);
    const result = await decrypt(blob, key);
    expect(result).toBe(plaintext);
  });

  test('deux chiffrements du même plaintext donnent des blobs différents', async () => {
    const key = await generateTestKey();
    const blob1 = await encrypt('maple-leaf-silver', key);
    const blob2 = await encrypt('maple-leaf-silver', key);
    expect(blob1).not.toBe(blob2); // IV aléatoire différent
  });

  test('déchiffrer avec la mauvaise clé lève une erreur', async () => {
    const key1 = await generateTestKey();
    const key2 = await generateTestKey();
    const blob = await encrypt('test', key1);
    await expect(decrypt(blob, key2)).rejects.toThrow();
  });

  test('déchiffrer un blob corrompu lève une erreur', async () => {
    const key = await generateTestKey();
    await expect(decrypt('notavalidblob==', key)).rejects.toThrow();
  });

  test('chiffrer null retourne null', async () => {
    const key = await generateTestKey();
    expect(await encryptNullable(null, key)).toBeNull();
  });

  test('la même passphrase produit toujours la même clé', async () => {
    const passphrase = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';
    const key1 = await deriveKeyFromPassphrase(passphrase);
    const key2 = await deriveKeyFromPassphrase(passphrase);
    expect(key1).toEqual(key2);
  });

  test('des passphrases différentes donnent des clés différentes', async () => {
    const key1 = await deriveKeyFromPassphrase('passphrase one deux trois');
    const key2 = await deriveKeyFromPassphrase('passphrase four cinq six');
    expect(key1).not.toEqual(key2);
  });
});
```

---

## Signaux d'alerte

Si tu te retrouves dans une de ces situations, stop et relis ce document :

```
→ "Je testerai les calculs plus tard" → NON. Maintenant.
→ "Le test est trop complexe à écrire" → La fonction est trop complexe. La découper.
→ "Je mock tout pour que ça passe" → Le test ne teste plus rien.
→ "J'ai 90% de coverage mais je ne suis pas sûr que ça marche" → Mauvais tests.
   Un test qui ne passe jamais au rouge n'a aucune valeur.
```

---

*Dernière mise à jour : session design avril 2026*
*Propriétaire : Mounir*
