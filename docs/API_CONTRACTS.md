# API_CONTRACTS.md — StackLab
> Contrats d'API entre le client React Native et les services backend.
> Source de vérité pour tout appel réseau. Toute déviation nécessite validation explicite du propriétaire.
> À lire avant d'implémenter tout appel réseau côté client ou tout endpoint côté serveur.

---

## Principes généraux

### Format des réponses

Toutes les réponses sont en JSON. Content-Type : `application/json`.

**Succès :**
```json
{ "data": { ... } }
```

**Erreur :**
```json
{ "error": "message humain lisible", "code": "ERROR_CODE" }
```

Les codes d'erreur sont des strings lisibles — jamais de codes numériques bruts exposés à l'UI.

### Sécurité — Règles transversales

- HTTPS uniquement en production
- Aucun secret dans le code client — toutes les clés API côté serveur uniquement
- Les messages d'erreur ne révèlent jamais de détails techniques (tables, colonnes, URLs internes)
- Rate limiting actif sur tous les endpoints — voir SECURITY.md pour les valeurs

### Timeout client

Tous les appels réseau ont un timeout de **10 secondes** côté client.
Au-delà : erreur EH-07 (ERROR_HANDLING.md).

---

## Section 1 — Proxy metals.dev (Phase 3, MVP)

Le proxy est le seul service réseau requis pour le MVP.
Il cache la clé API metals.dev côté serveur et sert les prix spot au client.

---

### GET /prices

**Phase :** 3 (MVP)
**Service :** proxy Spring Boot sur Railway
**Rate limit :** 300 req/min par IP (SECURITY.md)
**Cache TTL :** 5 minutes côté serveur — le client ne doit pas appeler plus souvent

#### Requête

```
GET https://proxy.stacklab.app/prices?currency=USD
```

**Query params :**

| Paramètre | Type | Obligatoire | Valeurs | Défaut |
|---|---|---|---|---|
| `currency` | string | non | USD, EUR, GBP, CAD, AUD | USD |

#### Réponse — Succès (200)

```json
{
  "gold": 3287.40,
  "silver": 33.47,
  "currency": "USD",
  "updated_at": "2026-04-17T14:32:00Z",
  "source": "metals.dev",
  "cached": true,
  "rates": {
    "EUR": 1.1746628028,
    "GBP": 1.3603784858,
    "CAD": 0.7359109922,
    "AUD": 0.7218127039
  }
}
```

| Champ | Type | Description |
|---|---|---|
| `gold` | number | Prix spot XAU en troy oz, toujours en USD |
| `silver` | number | Prix spot XAG en troy oz, toujours en USD |
| `currency` | string | Toujours "USD" — le proxy n'accepte que USD |
| `updated_at` | string | ISO 8601 — timestamp de la dernière donnée metals.dev |
| `source` | string | Toujours "metals.dev" en MVP |
| `cached` | boolean | true si réponse depuis le cache, false si fraîche |
| `rates` | object | Taux de change depuis metals.dev. Convention : `rates["EUR"] = 1.1746` signifie 1 EUR = 1.1746 USD. Conversion client : `price_eur = price_usd / rates["EUR"]`. Devises exposées : EUR, GBP, CAD, AUD. |

**Note architecture Phase 3 :** le client appelle toujours `?currency=USD`. La conversion dans les autres devises est faite localement via `convertSpotPrice(priceUsd, currency, rates)` dans `utils/calculations.ts`. Le champ `rates` est stocké séparément dans `spotStore` et n'est jamais écrasé sur une réponse 503.

#### Réponse — metals.dev indisponible (503)

```json
{
  "error": "Spot prices temporarily unavailable",
  "code": "SPOT_UNAVAILABLE",
  "last_known": {
    "gold": 3287.40,
    "silver": 33.47,
    "currency": "USD",
    "updated_at": "2026-04-17T14:27:00Z"
  }
}
```

Le client utilise `last_known` pour afficher le dernier prix connu.
Si `last_known` est absent (aucun cache disponible) → afficher "—".

#### Réponse — Rate limit dépassé (429)

```
Headers :
  Retry-After: 60
  X-RateLimit-Limit: 300
  X-RateLimit-Remaining: 0

Body :
{
  "error": "Too many requests",
  "code": "RATE_LIMITED"
}
```

#### Comportement côté client

```
1. useSpotPrice() monté à la racine de l'app (App.tsx) — source unique de polling
2. fetchPrices() appelé au lancement, puis toutes les 5 minutes via setInterval
3. NetInfo listener — retry immédiat au retour de connectivité
4. AppState listener — retry immédiat au retour au foreground
5. Toujours appeler ?currency=USD — conversion locale via convertSpotPrice()
6. Si 503 → utiliser last_known, conserver rates du dernier succès
7. Si timeout (10s) → traiter comme 503
8. Si offline (netinfo) → pas d'appel → afficher cache + "Last updated X min ago"
```

**Règle TTL :**
Le client ne doit jamais appeler `/prices` plus d'une fois par 5 minutes.
`fetchPrices()` vérifie `lastFetchAt` avant d'appeler le réseau.
`refresh()` bypass le TTL pour les boutons Retry/Refresh manuels uniquement.

---

## Section 2 — Backend Spring Boot (Phase 7, bêta)

Le backend est déployé en Phase 7 pour gérer la waitlist.
Le cloud sync vient en Phase 8.

---

### POST /waitlist

**Phase :** 7 (bêta)
**Service :** backend Spring Boot sur Railway
**Rate limit :** 10 req/min par IP (protection anti-spam)
**Auth :** aucune — endpoint public

#### Requête

```
POST https://api.stacklab.app/waitlist
Content-Type: application/json

{
  "email": "user@example.com"
}
```

| Champ | Type | Obligatoire | Contraintes |
|---|---|---|---|
| `email` | string | oui | Format email valide, max 254 chars |

#### Réponse — Succès (201)

```json
{
  "data": {
    "message": "You're on the list. We'll be in touch."
  }
}
```

Ne jamais retourner l'email dans la réponse — confirmation uniquement.

#### Réponse — Email déjà inscrit (200)

```json
{
  "data": {
    "message": "You're already on the list."
  }
}
```

200 et non 409 — on ne révèle pas si l'email était déjà en base (privacy).

#### Réponse — Email invalide (400)

```json
{
  "error": "Invalid email address",
  "code": "VALIDATION_ERROR"
}
```

#### Comportement côté client

```
1. Utilisateur soumet son email dans le modal whitelist
2. POST /waitlist
3. Si 201 ou 200 → "You're on the list!" + fermer le modal
4. Si 400 → message inline "Please enter a valid email"
5. Si 429 → "Try again in a moment"
6. Si erreur réseau → "Couldn't submit. Check your connection."
```

---

## Section 3 — Cloud Sync (Phase 8, post-bêta)

Ces endpoints sont documentés maintenant pour ne pas les inventer en Phase 8.
Ils ne sont pas implémentés avant la fin de la bêta.

L'authentification du cloud sync ne nécessite pas de JWT complexe en Phase 8 MVP.
L'UUID dérivé de la passphrase est transmis dans un header dédié.
Une auth plus robuste (JWT) peut être ajoutée post-bêta si nécessaire.

---

### POST /auth/token

**Phase :** 8
**Objectif :** obtenir un token de session depuis l'UUID dérivé de la passphrase

#### Requête

```
POST https://api.stacklab.app/auth/token
Content-Type: application/json

{
  "uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Champ | Type | Contraintes |
|---|---|---|
| `uuid` | string | UUID v4 valide |

#### Réponse — Succès (200)

```json
{
  "data": {
    "token": "eyJhbGci...",
    "expires_in": 3600
  }
}
```

| Champ | Description |
|---|---|
| `token` | JWT signé côté serveur, durée de vie 1h |
| `expires_in` | Durée en secondes |

#### Réponse — UUID inconnu (404)

```json
{
  "error": "Recovery phrase not recognized",
  "code": "UNKNOWN_UUID"
}
```

Ne pas dire "UUID not found" — message orienté utilisateur.

---

### POST /sync

**Phase :** 8
**Objectif :** envoyer le blob chiffré au serveur
**Rate limit :** 60 req/min par UUID (SECURITY.md)
**Auth :** `Authorization: Bearer {token}`

#### Requête

```
POST https://api.stacklab.app/sync
Content-Type: application/json
Authorization: Bearer {token}

{
  "blob_data": "base64encodedencryptedblob...",
  "schema_version": "1"
}
```

| Champ | Type | Contraintes |
|---|---|---|
| `blob_data` | string | Base64 — blob JSON SQLite chiffré AES-256-GCM côté client |
| `schema_version` | string | Version du schéma SQLite. Ex: "1" |

Le serveur ne peut pas lire `blob_data` — il le stocke tel quel.

#### Réponse — Succès (200)

```json
{
  "data": {
    "synced_at": "2026-04-17T14:32:00Z"
  }
}
```

#### Réponse — Token expiré (401)

```json
{
  "error": "Session expired. Please re-authenticate.",
  "code": "TOKEN_EXPIRED"
}
```

Le client renouvelle le token via `POST /auth/token` et retry.

#### Réponse — Payload trop grand (413)

```json
{
  "error": "Data too large",
  "code": "PAYLOAD_TOO_LARGE"
}
```

Limite : 10 MB (largement suffisant pour un stack bullion — un blob typique fait < 100 KB).

---

### GET /sync

**Phase :** 8
**Objectif :** récupérer le blob pour restauration sur un nouveau device
**Rate limit :** 120 req/min par UUID (SECURITY.md)
**Auth :** `Authorization: Bearer {token}`

#### Requête

```
GET https://api.stacklab.app/sync
Authorization: Bearer {token}
```

#### Réponse — Succès (200)

```json
{
  "data": {
    "blob_data": "base64encodedencryptedblob...",
    "schema_version": "1",
    "synced_at": "2026-04-17T14:32:00Z"
  }
}
```

#### Réponse — Aucun blob existant (404)

```json
{
  "error": "No sync data found for this account",
  "code": "NO_SYNC_DATA"
}
```

Premier sync sur un compte sans données précédentes.

---

### POST /auth/recover

**Phase :** 8
**Objectif :** envoyer la passphrase par email si l'utilisateur l'a perdue
**Rate limit :** 5 req/15min par IP (protection anti-abus — SECURITY.md)
**Auth :** aucune — endpoint public

#### Requête

```
POST https://api.stacklab.app/auth/recover
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Réponse — Toujours 200 (sécurité)

```json
{
  "data": {
    "message": "If this email is registered, you'll receive your recovery phrase shortly."
  }
}
```

**Règle de sécurité absolue :** toujours retourner 200 quelle que soit la situation.
Ne jamais confirmer ou infirmer qu'un email est en base — protection contre l'énumération.

---

## Codes d'erreur — Référence complète

| Code | HTTP | Description |
|---|---|---|
| `SPOT_UNAVAILABLE` | 503 | metals.dev inaccessible ou en erreur |
| `RATE_LIMITED` | 429 | Trop de requêtes — lire Retry-After |
| `VALIDATION_ERROR` | 400 | Données invalides |
| `UNKNOWN_UUID` | 404 | UUID non reconnu |
| `TOKEN_EXPIRED` | 401 | Token JWT expiré |
| `NO_SYNC_DATA` | 404 | Aucun blob pour cet UUID |
| `PAYLOAD_TOO_LARGE` | 413 | Blob trop volumineux |
| `INTERNAL_ERROR` | 500 | Erreur serveur inattendue |

---

## Environnements

| Environnement | Proxy URL | Backend URL |
|---|---|---|
| Développement | `http://localhost:8080` | `http://localhost:8081` |
| Production (actuelle) | `https://stacklab-proxy.onrender.com` | non déployé (Phase 7) |
| Production (cible) | `https://proxy.stacklab.app` | `https://api.stacklab.app` |

Les URLs de production sont définies via variables d'environnement Expo (`EXPO_PUBLIC_PROXY_URL`, `EXPO_PUBLIC_API_URL`).
Jamais hardcodées dans le code source.

---

## Couche réseau client — `api.ts` (non implémentée)

`client/utils/api.ts` n'existe pas encore. En Phase 3, il n'y a qu'un seul service réseau (`spotService.ts`) — créer un wrapper partagé serait une abstraction prématurée.

**Pourquoi il faudra le créer en Phase 7 :**
Dès que plusieurs services appellent le réseau (proxy + backend), les besoins communs se dupliquent :
- Headers communs (`Content-Type`, `Authorization`)
- Token d'auth injecté automatiquement
- Timeout centralisé (aujourd'hui hardcodé à 10s dans `spotService.ts`)
- Logs et tracing centralisés

**Ce que `api.ts` devra faire en Phase 7 :**
```typescript
// wrapper fetch avec timeout, headers communs, gestion erreurs HTTP
export async function apiGet<T>(url: string, schema: ZodSchema<T>): Promise<Result<T>>
export async function apiPost<T>(url: string, body: unknown, schema: ZodSchema<T>): Promise<Result<T>>
```

**Règle :** ne pas créer `api.ts` avant Phase 7. Un seul consommateur ne justifie pas l'abstraction.

---

## Ce qui N'est PAS dans ce document

| Feature | Raison | Quand |
|---|---|---|
| Endpoints Stripe/RevenueCat | Post-bêta — SDK dédié | Phase 9+ |
| Webhooks Stripe | Post-bêta | Phase 9+ |
| Admin endpoints | Pas d'interface admin MVP | Post-lancement |
| Endpoint de suppression de compte | Post-MVP | À définir |

---

*Dernière mise à jour : session design avril 2026*
*Propriétaire : Mounir*
