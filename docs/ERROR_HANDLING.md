# ERROR_HANDLING.md — StackLab MVP
> Stratégie de gestion des erreurs. À lire avant d'implémenter tout appel réseau, accès SQLite, ou action utilisateur.
> Toute déviation nécessite validation explicite du propriétaire.
> Cohérent avec PRODUCT_DECISIONS.md section 7.5 et SECURITY.md.

---

## Philosophie

**L'utilisateur ne doit jamais voir une erreur technique brute.**

Un stacker qui ouvre l'app pour vérifier la valeur de son stack ne veut pas lire "TypeError: Cannot read property 'value' of undefined". Il veut soit une valeur, soit une explication claire de pourquoi la valeur n'est pas disponible.

Deux règles absolues :
1. **Jamais de crash silencieux** — toute erreur est loggée
2. **Jamais d'erreur technique exposée à l'utilisateur** — toujours un message humain

---

## Architecture des erreurs

### 3 niveaux d'erreur

```
Niveau 1 — Silencieux (log uniquement)
→ L'utilisateur ne voit rien
→ L'app continue normalement
→ Exemple : échec du StackSnapshot quotidien

Niveau 2 — Informatif (message non bloquant)
→ Toast ou bannière discrète
→ L'app reste utilisable
→ Exemple : spot price non disponible

Niveau 3 — Bloquant (modal ou écran d'erreur)
→ Action impossible sans résolution
→ Explication claire + action proposée
→ Exemple : échec d'écriture SQLite critique
```

### Règle de sécurité sur les messages d'erreur

Les messages d'erreur ne doivent jamais exposer :
- Des stack traces
- Des noms de tables ou colonnes SQLite
- Des URLs d'API
- Des détails d'infrastructure (Railway, PostgreSQL)
- Des codes d'erreur techniques bruts

Les logs internes peuvent contenir tous ces détails — pas l'UI.

---

## Client React Native — Cas d'erreur par couche

### Couche SQLite

#### EH-01 — Échec d'ouverture de la base

```
Quand : première ouverture de l'app, base corrompue ou inaccessible
Impact : critique — aucune donnée disponible

Comportement :
→ Log complet de l'erreur (type, message, stack)
→ Écran d'erreur bloquant :
  "We couldn't access your data.
   This can happen after a system update.
   Please restart the app."
→ Bouton "Restart" → relance l'app
→ Si l'erreur persiste après restart → bouton "Contact Support"

Ne jamais :
→ Tenter de supprimer et recréer la base automatiquement
→ Créer une nouvelle base vide silencieusement
→ Ces actions détruiraient les données utilisateur
```

#### EH-02 — Échec d'écriture (INSERT / UPDATE)

```
Quand : création d'item, modification, vente...
Impact : modéré à élevé selon l'action

Comportement :
→ Log de l'erreur
→ Rollback de la transaction si possible
→ Toast rouge discret : "Couldn't save your changes. Please try again."
→ L'action utilisateur est annulée — l'UI revient à l'état précédent
→ Les données existantes restent intactes

Ne jamais :
→ Laisser l'UI dans un état partiellement modifié
→ Faire semblant que l'action a réussi
```

#### EH-03 — Échec de lecture (SELECT)

```
Quand : chargement d'un Lab, Deck, ou liste d'items
Impact : variable

Comportement :
→ Log de l'erreur
→ Afficher un empty state avec message :
  "Couldn't load your items. Pull down to retry."
→ Pull-to-refresh disponible

Ne jamais :
→ Afficher une liste vide sans explication
  (l'utilisateur pourrait croire que ses données sont perdues)
```

#### EH-04 — Migration échouée

```
Quand : mise à jour de l'app avec un nouveau schema_version
Impact : critique

Comportement :
→ Log détaillé de l'erreur de migration
→ Écran bloquant :
  "We need to update your database.
   This should only take a moment."
→ Retry automatique (max 3 tentatives)
→ Si échec total :
  "Update failed. Your data is safe.
   Please contact support before reinstalling."
→ Ne jamais guider l'utilisateur vers une désinstallation
  (il perdrait ses données SQLite)

Voir MIGRATION_STRATEGY.md pour le détail complet.
```

---

### Couche réseau — Spot price

#### EH-05 — App offline (détecté via netinfo)

```
Quand : aucune connexion réseau
Impact : faible — app local-first

Comportement :
→ Pas d'erreur affichée
→ Bannière subtile en haut de SpotHome :
  "Last updated X min ago"
→ Les valeurs financières utilisent le dernier spot connu
→ Les Labs, Decks, Items fonctionnent normalement
→ Retour en ligne : refresh spot automatique si TTL expiré

Règle (PRODUCT_DECISIONS.md 7.5) :
→ Pas de message d'erreur bloquant en mode offline
→ L'app reste pleinement utilisable
```

#### EH-06 — Proxy metals.dev indisponible (online mais API down)

```
Quand : connexion OK mais proxy Railway ne répond pas
Impact : faible si cache disponible, modéré sinon

Comportement si cache valide (< TTL) :
→ Utiliser le cache silencieusement
→ Aucun message à l'utilisateur

Comportement si cache expiré :
→ Toast discret : "Spot prices temporarily unavailable"
→ Dernière valeur connue affichée avec timestamp
→ Retry automatique toutes les 60 secondes (max 5 retries)
→ Après 5 retries : "Spot prices unavailable. Values shown are estimates."

Impact sur le menu contextuel (EC-05, EC-06) :
→ "Sell at melt" grisé avec sous-titre "Spot unavailable"
→ "Sell with price" reste actif

Impact sur le Quick Sell bottom sheet ouvert (EC-10) :
→ Si le proxy devient indisponible pendant la session :
  griser le bouton "Confirm Sell at Melt" +
  afficher "Spot unavailable. Use Sell with price."
→ L'utilisateur peut fermer et utiliser "Sell with price" à la place

Ne jamais :
→ Bloquer l'accès aux Labs ou au Dashboard
→ Afficher "--" ou "N/A" sans explication
→ Afficher le prix à $0
→ Permettre un Quick Sell sans spot valide (EC-09)
```

#### EH-07 — Timeout réseau (proxy ou metals.dev lent)

```
Quand : la requête prend trop longtemps
Timeout défini : 10 secondes

Comportement :
→ Identique à EH-06 (proxy indisponible)
→ Le timeout est loggé pour monitoring

Timeout de 10s est suffisant pour une app locale-first.
Ne pas réduire en dessous de 5s (réseau mobile lent).
```

#### EH-08 — Rate limiting (429 du proxy)

```
Quand : trop de requêtes côté client (bug, loop infini...)
Impact : modéré

Comportement :
→ Log avec niveau WARNING
→ Lire le header Retry-After
→ Attendre la durée indiquée avant retry
→ Toast discret si l'attente dépasse 30s :
  "Spot prices will refresh in X seconds"
→ Aucune action supplémentaire requise de l'utilisateur
```

---

### Couche réseau — Cloud sync (Phase 8)

#### EH-09 — Sync échoué (POST /sync)

```
Quand : l'utilisateur a cloud sync activé et le backend est indisponible
Impact : faible — les données locales sont intactes

Comportement :
→ Log de l'erreur
→ Indicateur discret dans Settings : "Last synced X hours ago"
→ Retry automatique au prochain lancement de l'app
→ Pas de message bloquant — le local reste la source de vérité

Ne jamais :
→ Bloquer une action utilisateur à cause d'un échec de sync
→ Alerter de façon alarmante — l'utilisateur ne doit pas paniquer
```

#### EH-10 — Restore échoué (GET /sync)

```
Quand : l'utilisateur tente de restaurer depuis le cloud sur un nouveau device
Impact : élevé — l'utilisateur attend ses données

Comportement :
→ Message clair dans le flow de restore :
  "Couldn't retrieve your data. Check your connection and try again."
→ Bouton "Try Again" visible
→ Lien vers "How to restore from backup file" (JSON export)
→ Ne jamais laisser l'utilisateur sans alternative
```

#### EH-11 — Passphrase incorrecte au restore

```
Quand : l'utilisateur saisit une mauvaise passphrase
Impact : modéré — pas de perte de données

Comportement :
→ Message inline sous le champ :
  "Incorrect recovery phrase. Please check your words carefully."
→ Pas de verrouillage temporaire en MVP (pas de brute force réaliste)
→ Lien "I lost my recovery phrase" → guide vers le backup JSON
```

---

### Couche métier — Actions utilisateur

#### EH-12 — Validation Zod échouée (données entrantes)

```
Quand : données formulaire invalides avant écriture SQLite
Impact : faible — aucune donnée corrompue

Comportement :
→ Erreur inline sur le champ concerné
→ Bouton de validation désactivé tant que invalide
→ Messages en anglais, humains :
  "Weight must be greater than 0"
  "Metal is required"
  "Purity must be between 0 and 1"

Ne jamais :
→ Afficher les noms de champs Zod bruts ("weight_oz must be positive")
→ Laisser passer des données invalides "pour l'instant"
```

#### EH-13 — Suppression d'un conteneur non vide

```
Quand : suppression d'un Lab ou Deck avec du contenu
Impact : potentiellement élevé

Comportement :
→ Déjà documenté dans PRODUCT_DECISIONS.md section 6.4
→ Modal de confirmation obligatoire avec contenu listé
→ Pas d'erreur — c'est une action intentionnelle guidée
→ Si l'opération SQLite échoue malgré la confirmation → EH-02
```

#### EH-14 — Import JSON invalide

```
Quand : l'utilisateur importe un fichier JSON corrompu ou mauvaise version
Impact : nul si bien géré — les données existantes sont préservées

Comportement :
→ Valider le fichier avec Zod avant toute écriture
→ Si invalide : modal "Import failed. Your existing data is safe."
  + détail lisible : "The file appears to be corrupted or from an incompatible version."
→ Aucune écriture n'a eu lieu
→ Option : "Need help?" → lien vers documentation

Règle absolue (DATA_MODEL.md Règle 11) :
→ Zéro perte de données tolérée lors d'un import
→ Si validation échoue → import annulé, données intactes
```

#### EH-15 — Dépassement de limite free

```
Quand : utilisateur free tente de créer un 4ème Lab, etc.
Impact : nul — c'est un comportement attendu

Comportement :
→ Ce n'est pas une erreur — c'est une opportunité de conversion
→ Voir MONETIZATION.md et PRODUCT_DECISIONS.md section 8.3
→ Modal de conversion, jamais un message d'erreur froid
```

#### EH-16 — Export JSON raté ou incomplet

```
Quand : l'écriture du fichier JSON échoue en cours d'export
Impact : potentiellement élevé — fausse sécurité si l'utilisateur
         croit avoir un backup valide

Comportement :
→ Toujours écrire dans un fichier temporaire (export.tmp.json)
→ Valider la taille (> 0 bytes) et la structure JSON du fichier temporaire
→ Uniquement si valide → renommer en export.json (opération atomique)
→ Si la validation échoue → supprimer le fichier temporaire
→ Afficher : "Export failed. Your data is safe, but no backup was
  created. Try again."
→ Ne jamais confirmer un export qui n'a pas été validé

Vérification post-export (obligatoire) :
→ Après chaque export réussi, l'app relit immédiatement le fichier
→ Le valide intégralement avec Zod
→ Compte les entités : labs, decks, items
→ Affiche dans le modal de confirmation :
  "✓ Backup verified — 47 items, 3 labs, 2 decks"
  jamais juste "Export successful"
→ Si la relecture échoue → supprimer l'export et afficher EH-16

Règle absolue :
→ Un fichier export partiel ou corrompu est pire qu'aucun fichier
→ L'utilisateur ne doit jamais croire avoir un backup
  alors qu'il est invalide
→ La vérification post-export est non négociable
```

---

## Backend Spring Boot — Cas d'erreur

### Règles globales backend

```
→ Jamais de stack trace dans les réponses API
→ Jamais de détail technique dans les messages d'erreur
→ Toujours un body JSON structuré :
  { "error": "message humain", "code": "ERROR_CODE" }
→ Toujours logger l'erreur complète côté serveur
→ Les logs ne contiennent jamais de données utilisateur
```

### EH-B01 — Validation échouée (400 Bad Request)

```java
// Corps de réponse
{
  "error": "Invalid request",
  "code": "VALIDATION_ERROR"
}

// Log interne (jamais exposé)
// [WARN] Validation failed: uuid is null, blob_data is empty
```

Jamais exposer le détail du champ ou la raison précise — c'est un vecteur d'information pour un attaquant.

### EH-B02 — Rate limiting déclenché (429 Too Many Requests)

```java
// Headers obligatoires (SECURITY.md)
Retry-After: 60
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0

// Corps
{
  "error": "Too many requests",
  "code": "RATE_LIMITED"
}
```

### EH-B03 — Erreur interne serveur (500)

```java
// Ce que le client reçoit
{
  "error": "Something went wrong. Please try again.",
  "code": "INTERNAL_ERROR"
}

// Ce qui est loggé côté serveur (jamais exposé)
// [ERROR] NullPointerException in SyncService.save() line 47
// Stack trace complète...
```

### EH-B04 — metals.dev indisponible (depuis le proxy)

```
Quand : metals.dev ne répond pas ou retourne une erreur

Comportement proxy :
→ Si cache valide → retourner le cache avec header X-Cache: HIT
→ Si cache expiré → retourner 503 avec corps :
  { "error": "Spot prices temporarily unavailable", "code": "SPOT_UNAVAILABLE",
    "last_known": { "gold": 3287.40, "silver": 33.47, "updated_at": "..." } }
→ Le client gère le fallback via EH-06
```

### EH-B05 — Ressource inexistante (404)

```java
{
  "error": "Not found",
  "code": "NOT_FOUND"
}
```

Jamais de message type "User with UUID xxx not found" — révèle des informations sur la structure.

---

## Logging — Règles

### Client React Native

```typescript
// Structure de log standardisée
const log = {
  level: 'ERROR' | 'WARN' | 'INFO',
  context: 'SQLite' | 'Network' | 'Business' | 'UI',
  code: 'EH-01', // Code de ce document
  message: string,
  details?: unknown, // Stack trace, détails techniques
  timestamp: string
};

// En développement → console (structuré)
// En production → désactivé ou service tiers post-MVP
// Jamais de console.log() brut (CLAUDE.md)
```

**Ce qui n'est jamais loggé côté client :**
- Données utilisateur (noms, quantités, valeurs financières)
- UUID utilisateur
- Passphrase ou clés

### Backend Spring Boot

```
Niveaux utilisés :
ERROR → erreur inattendue, action requise
WARN  → situation anormale mais gérée (rate limit, validation)
INFO  → événements métier normaux (sync réussi)
DEBUG → désactivé en production

Format : structuré JSON (Logback + logstash-logback-encoder)
Destination : stdout Railway (pas de fichier — Railway capture les logs)
```

**Ce qui n'est jamais loggé côté backend :**
- UUID utilisateur
- Email utilisateur
- Contenu des blobs
- Valeurs financières

---

## Pattern de code — Client

### Wrapper d'appel réseau

```typescript
// Toujours utiliser ce pattern — jamais de fetch() nu
async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<Result<T>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ok: false, error: response.status, code: `HTTP_${response.status}` };
    }

    const data = await response.json();
    return { ok: true, data };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: 'TIMEOUT', code: 'EH-07' };
    }
    return { ok: false, error: 'NETWORK_ERROR', code: 'EH-05' };
  }
}
```

### Wrapper d'accès SQLite

```typescript
// Toujours dans une transaction pour les opérations d'écriture
async function withTransaction<T>(
  db: SQLiteDatabase,
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    await db.execAsync('BEGIN TRANSACTION');
    const result = await operation();
    await db.execAsync('COMMIT');
    return { ok: true, data: result };
  } catch (error) {
    await db.execAsync('ROLLBACK');
    logError('SQLite', 'EH-02', error);
    return { ok: false, error: 'DB_WRITE_ERROR', code: 'EH-02' };
  }
}
```

---

## Messages utilisateur — Référence

Tous les messages sont en anglais (langue de l'app).
Jamais de jargon technique. Toujours une action proposée quand possible.

| Code | Message utilisateur | Action proposée |
|---|---|---|
| EH-01 | "We couldn't access your data. Please restart the app." | Restart |
| EH-02 | "Couldn't save your changes. Please try again." | Retry |
| EH-03 | "Couldn't load your items. Pull down to retry." | Pull to refresh |
| EH-04 | "We need to update your database. Please wait." | Auto |
| EH-05 | "Last updated X min ago" (bannière) | — |
| EH-06 | "Spot prices temporarily unavailable" | Auto retry |
| EH-07 | Identique à EH-06 | Auto retry |
| EH-08 | "Spot prices will refresh in X seconds" | Auto |
| EH-09 | "Last synced X hours ago" (Settings) | — |
| EH-10 | "Couldn't retrieve your data. Check your connection." | Try Again |
| EH-11 | "Incorrect recovery phrase. Please check your words." | — |
| EH-12 | Message inline sur le champ | Corriger le champ |
| EH-13 | Modal de confirmation guidée | Confirmer ou annuler |
| EH-14 | "Import failed. Your existing data is safe." | — |
| EH-15 | Modal de conversion premium | Upgrade ou Plus tard |
| EH-16 | "Export failed. No backup was created. Try again." | Retry |

---

## Ce qui est hors scope MVP

```
→ Error reporting service (Sentry, Bugsnag) — post-MVP
   En MVP : logs console en dev, silencieux en prod
→ Retry avec backoff exponentiel — post-MVP
   En MVP : retry fixe ou manuel
→ Circuit breaker pattern sur le proxy — post-MVP
→ Alertes automatiques sur les erreurs 500 — post-MVP
```

---

*Dernière mise à jour : session design avril 2026*
*Propriétaire : Mounir*
