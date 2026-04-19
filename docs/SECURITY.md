# SECURITY.md — StackLab
> Contraintes de sécurité non négociables. Toute déviation nécessite validation explicite du propriétaire.
> Ce document est lu par Claude Code avant toute intervention sur une couche sensible.
> Modèle MVP : sandbox natif iOS/Android. Chiffrement applicatif prévu avant lancement public.

---

## Principe fondamental

**Defense in depth.** Chaque couche est compromise indépendamment sans compromettre les autres.

```
Couche 1 — Client React Native (TypeScript)
           SQLite local, sandbox natif iOS/Android
           Chiffrement applicatif prévu avant lancement public

Couche 2 — Backend Spring Boot (opt-in uniquement)
           Blobs chiffrés côté client, illisibles côté serveur

Couche 3 — Proxy API
           Relay metals.dev, clé API protégée, aucune donnée utilisateur

Couche 4 — Services tiers
           Stripe (paiements), iCloud/Google Drive (backup automatique)
```

Si la Couche 2 est compromise → blobs illisibles (chiffrés côté client avant envoi).
Si la Couche 3 est compromise → accès aux prix spot uniquement, aucune donnée utilisateur.

---

## Couche 1 — Client React Native

### TypeScript — Obligatoire

- Tout le code client est écrit en **TypeScript strict**. Jamais de JavaScript pur.
- `strict: true` dans `tsconfig.json` — aucune exception.
- Les types `any` sont interdits sauf justification explicite commentée.
- TypeScript est intégré nativement via Expo au démarrage du projet.
- Les standards de code complets sont dans `CLAUDE.md`.

### Zod — Validation des inputs

- Toute donnée externe (API response, formulaire utilisateur, import JSON) est validée avec **Zod** avant utilisation.
- Jamais de données non validées persistées en base locale.
- Les schémas Zod sont définis dans `/schemas` et partagés entre client et serveur si applicable.

```typescript
// Exemple — validation d'un item avant persistence
const ItemSchema = z.object({
  family_key: z.string().min(1),
  metal: z.enum(['gold', 'silver']),
  weight_oz: z.number().positive(),
  purity: z.number().min(0).max(1),
  quantity: z.number().int().min(1),
  purchase_price: z.number().positive().optional(),
});
```

### SQLite — Stratégie de sécurité MVP

**Modèle MVP : sandbox natif iOS/Android**

Les données SQLite sont stockées en clair sur le device.
La protection repose sur le sandbox natif — hermétique pour toute app tierce sur iOS et Android non rooté/jailbreaké.

Aucun chiffrement applicatif champ par champ n'est implémenté en MVP.

**Ce qui protège les données en MVP :**
- Sandbox iOS/Android : aucun accès inter-app
- `expo-secure-store` : clés cloud sync dans le keychain natif (iOS Keychain / Android Keystore)
- Backup JSON obligatoire : protection contre la perte de données

**Surfaces d'attaque en MVP et mitigation :**
```
Sandbox iOS/Android         → Protégé nativement ✅
Backup iTunes non chiffré   → Données lisibles ⚠️ — mitigé par le warning export JSON
Extraction forensique        → Données lisibles ⚠️ — risque accepté en MVP
Jailbreak / Root             → Données lisibles ⚠️ — responsabilité utilisateur
Attaque serveur Railway      → Holdings non stockés côté serveur ✅
```

**Plan de chiffrement pré-lancement public :**

Avant le lancement public (post-bêta, avant App Store), le chiffrement applicatif sera implémenté via `expo-crypto` (compatible Expo managed workflow, sans prebuild) :

- Tous les champs qui permettent d'inférer la valeur des holdings passeront en blobs AES-256-GCM
- La clé sera dérivée de la passphrase BIP39 via PBKDF2 (cohérent avec l'architecture cloud sync)
- La couche de service sera la seule à changer — les requêtes SQL restent identiques (règle R-06 DATABASE_SCHEMA)
- Une migration sera nécessaire pour les utilisateurs bêta

Cette décision est délibérée : implémenter le chiffrement pendant le développement MVP ajouterait une complexité non justifiée pour un débutant. La bêta se fait avec des early adopters de confiance, pas avec le grand public.

AsyncStorage n'est jamais utilisé pour des données sensibles (UUID, passphrase, clés).
`expo-secure-store` utilise le keychain iOS et Android Keystore — chiffrement natif, compatible Expo managed.

### Screenshot prevention

- Activé obligatoirement sur :
  - L'écran d'affichage de la passphrase de récupération
  - L'écran du Dashboard (valeurs financières)
- Désactivé partout ailleurs.
- Implémentation via `expo-screen-capture` ou équivalent.

### Clipboard — Clear automatique

- Quand l'utilisateur copie sa passphrase, le clipboard est vidé automatiquement après **30 secondes**.
- Un timer visible informe l'utilisateur : "Clipboard will be cleared in 30s."

### Export JSON — Avertissement explicite

- Au moment de l'export, un écran d'avertissement obligatoire :
  *"This file contains your complete stack data in plain text. Store it securely. Do not share it. Do not upload it to unencrypted cloud storage."*
- L'utilisateur doit confirmer avant l'export.
- Post-MVP : option d'export chiffré avec mot de passe.

### Secrets — Jamais dans le code client

- Aucune clé API, aucun secret, aucune URL de backend hardcodée dans le code client.
- Toutes les URLs et configurations via variables d'environnement Expo (`EXPO_PUBLIC_*`).
- Les variables `EXPO_PUBLIC_*` sont publiques par nature — ne jamais y mettre de secrets réels.
- Les vrais secrets (clé metals.dev, clé Stripe) vivent uniquement sur le serveur.

---

## Couche 2 — Backend Spring Boot

### Spring Security — Configuration obligatoire

- Spring Security activé sur toutes les routes sans exception.
- Headers HTTP sécurisés configurés :
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security` (HSTS)
  - `X-XSS-Protection: 1; mode=block`
- HTTPS uniquement en production. Aucune route HTTP non sécurisée.

### Rate Limiting — Obligatoire sur tous les endpoints

- Toutes les routes ont un rate limit explicite.
- Valeurs par défaut :

```
POST /sync          → 60 req/min par UUID
GET  /sync          → 120 req/min par UUID
POST /auth/recover  → 5 req/15min par IP
GET  /prices        → 300 req/min par IP (proxy metals.dev)
```

- Retourner `429 Too Many Requests` avec `Retry-After` header.
- Implémenter via Spring Boot + Bucket4j ou équivalent.

### Validation — Bean Validation (Jakarta)

- Toute donnée entrante est validée avec **Jakarta Bean Validation** (`@Valid`, `@NotNull`, `@Size`...).
- Jamais de données non validées persistées en base.
- Les erreurs de validation retournent `400 Bad Request` avec message générique — jamais de détail technique exposé.

### SQLi — Requêtes paramétrées uniquement

- Toutes les requêtes SQL passent par **JPA/Hibernate** ou **PreparedStatement**.
- Jamais de concaténation de strings dans les requêtes SQL.
- Jamais de requêtes SQL construites depuis des inputs utilisateur.

### Logs — Aucune donnée utilisateur

- Les logs ne contiennent jamais :
  - UUID utilisateur
  - Email utilisateur
  - Contenu des blobs chiffrés
  - Prix d'achat ou valeurs financières
- Les logs contiennent : timestamps, codes HTTP, durées de requête, erreurs techniques.
- Audit des logs Railway avant mise en production.

### Stripe — Validation des webhooks (post-bêta uniquement)

> Stripe n'est pas implémenté pendant la phase bêta. Ces règles s'appliquent au lancement premium.

- Chaque webhook Stripe est validé avec la **signature Stripe** (`Stripe-Signature` header).
- Un webhook sans signature valide est rejeté immédiatement avec `400`.
- Jamais de traitement d'un événement Stripe non vérifié.

```java
// Validation obligatoire
Event event = Webhook.constructEvent(payload, sigHeader, endpointSecret);
```

### CORS — Configuration stricte

- CORS configuré explicitement — pas de wildcard `*`.
- Origines autorisées : uniquement les domaines connus de l'app.
- Si aucune surface web n'est exposée en MVP : CORS restreint aux appels mobiles uniquement.

---

## Chiffrement — Cloud Sync uniquement (Phase 8)

### Principe

Le chiffrement E2EE s'applique uniquement aux données qui quittent le device pour le serveur.
Les données locales SQLite sont protégées par le sandbox natif en MVP.

Quand l'utilisateur active le cloud sync, les données sont chiffrées **côté client**
avant d'être envoyées au serveur. Le serveur stocke des blobs illisibles.

Le serveur ne connaît jamais la passphrase. Il ne peut pas déchiffrer les données.

### Architecture de chiffrement — Libs et rôles

```
react-native-bip39
→ Génération passphrase 12 mots (BIP39)
→ Dérivation seed via PBKDF2 intégré (2048 itérations — standard BIP39)

SubtleCrypto natif (crypto.subtle — disponible via Hermes RN 0.71+)
→ Dérivation clé AES-256 depuis le seed
→ PBKDF2-SHA256, 600 000 itérations (recommandation OWASP 2025)
→ Salt = APPLICATION_SALT fixe défini dans le code

expo-crypto
→ Chiffrement AES-256-GCM du blob SQLite
→ IV aléatoire (12 bytes) généré à chaque chiffrement

expo-secure-store
→ Stockage de la clé dérivée dans le keychain natif (iOS / Android Keystore)
```

**Flow complet :**

```
Passphrase 12 mots (BIP39)
→ react-native-bip39.mnemonicToSeed() → seed (PBKDF2, 2048 iterations)
→ SubtleCrypto.deriveKey(PBKDF2, 600 000 iterations) → clé AES-256
→ expo-crypto.aesEncryptAsync(blob, clé) → blob chiffré (IV + ciphertext + tag)
→ POST /sync → serveur stocke le blob opaque
```

**Même passphrase → même seed → même clé AES-256 sur n'importe quel device.**
C'est ce qui permet la restauration cross-device.

**Note implémentation Phase 8 :**
`crypto.subtle` est disponible via Hermes (RN 0.71+) mais doit être validé
sur vrai device iOS et Android avant de confirmer cette architecture.
Si indisponible → alternative : `react-native-quick-crypto` pour PBKDF2.
Voir TECH_STACK.md Phase 8 pour l'ordre de test.

### PBKDF2 — Paramètres

```
Algorithme  : PBKDF2-HMAC-SHA256
Itérations  : 600 000 (recommandation OWASP 2025)
Salt        : APPLICATION_SALT — constante dans le code (public en open source)
              Rôle : protection contre rainbow tables précalculées
              Ce n'est pas un secret — la passphrase utilisateur protège les données
Longueur clé: 256 bits
```

### UUID — Dérivation depuis passphrase

```
Passphrase 12 mots (BIP39)
→ react-native-bip39.mnemonicToSeed()
→ UUID déterministe généré depuis les 16 premiers bytes du seed
```

Le même UUID est toujours dérivé de la même passphrase.
Pas de stockage de passphrase côté serveur.

### Email — Chiffrement en base

- Si l'utilisateur fournit un email optionnel, il est chiffré en base avec AES-256.
- La clé de chiffrement de l'email est une clé serveur (variable d'environnement Railway).
- L'email n'est utilisé que pour envoyer la passphrase en cas de perte — jamais pour autre chose.

---

## Authentification Cloud Sync

### Flow complet

```
1. Activation cloud sync
   → App génère une passphrase 12 mots (BIP39-style)
   → Écran obligatoire : "Write this down. This is your only recovery key."
   → Confirmation utilisateur requise avant de continuer

2. Email optionnel
   → "Add an email as a backup. We only store your email. Never your data."
   → Si fourni : email chiffré en base, lié à l'UUID

3. Identification serveur
   → UUID dérivé cryptographiquement depuis la passphrase
   → Jamais de mot de passe traditionnel
   → Jamais de session cookie — JWT à courte durée de vie (1h)

4. Récupération
   → Via passphrase notée (chemin principal)
   → Via email si fourni (chemin secondaire — envoie la passphrase par email)
```

### Ce que le serveur stocke

```
uuid            Dérivé de la passphrase, non réversible
email           Optionnel, chiffré AES-256
blob_data       Données utilisateur chiffrées côté client, illisibles
created_at
updated_at
```

**Jamais** : passphrase, clé de déchiffrement, holdings en clair, valeurs financières.

---

## Open Source — Règles absolues

StackLab est entièrement open source (AGPL-3.0). Client, backend et proxy sont publics.

### Avant chaque push vers un repo public

- Scanner l'historique Git : `git log --all --full-history`
- Utiliser **truffleHog** ou **git-secrets** pour détecter des secrets accidentels
- Si un secret a été commité même une fois → rotation immédiate de la clé avant publication
- Vérifier le `.gitignore` couvre tous les fichiers sensibles

### .gitignore — Obligatoire dès le premier commit

```gitignore
.env
.env.local
.env.production
*.keystore
google-services.json
GoogleService-Info.plist
```

Ces fichiers ne doivent jamais apparaître dans aucun commit — ni privé ni public.

### Règle absolue — Zéro secret dans le code

```
Clé API metals.dev    → variable d'environnement Railway
Clé Stripe            → variable d'environnement Railway
JWT secret            → variable d'environnement Railway
Clé chiffrement email → variable d'environnement Railway
```

Un attaquant qui clone les repos publics ne trouve aucun secret — uniquement du code.

### GitHub — Configuration

- **Dependabot** activé sur tous les repos dès le premier push
- **Secret scanning** activé sur tous les repos publics
- **Branch protection** sur `main` — aucun push direct, PR obligatoire
- **Code scanning** (GitHub Actions) activé pour détecter les vulnérabilités

### Séparation des secrets et du code

```
stacklab/ (monorepo local privé)
├── client/   → mirrored → stacklab-client (public, AGPL)
├── backend/  → mirrored → stacklab-backend (public, AGPL)
├── proxy/    → mirrored → stacklab-proxy (public, AGPL)
└── .env.*    → JAMAIS commité, JAMAIS mirrored
```

Les variables d'environnement vivent sur Railway uniquement.

---

## Ce qui est hors scope MVP (post-MVP)

Ces mesures sont documentées ici comme intention future :

- **Certificate pinning** — protection contre les attaques man-in-the-middle
- **Jailbreak / Root detection** — avertissement si device compromis
- **Export JSON chiffré** — option de chiffrement du fichier avec mot de passe
- **Audit de sécurité externe** — avant lancement public si budget disponible
- **Conteneurisation Docker** — isolation des couches backend en production
- **2FA** — second facteur optionnel pour le cloud sync

---

## Checklist avant chaque déploiement en production

- [ ] Aucune clé API dans le code ou les logs
- [ ] Rate limiting actif sur tous les endpoints
- [ ] Stripe webhook signature validée (post-bêta uniquement)
- [ ] HTTPS uniquement, HTTP redirigé
- [ ] Headers Spring Security configurés
- [ ] Dependabot sans alertes critiques non résolues
- [ ] Logs auditées — aucune donnée utilisateur visible
- [ ] Screenshot prevention actif sur écrans sensibles

---

## Responsible Disclosure (version publique)

> Cette section est destinée aux chercheurs en sécurité qui consultent le repo public.

StackLab est open source sous AGPL-3.0. Le code de gestion des données et du chiffrement est entièrement auditable.

**Si vous trouvez une vulnérabilité :**
- Ne pas ouvrir une issue publique GitHub
- Contact : [à définir avant le lancement — email dédié security@stacklab.app]
- Délai de réponse cible : 48h
- Pas de bug bounty program en MVP — reconnaissance publique si souhaité

**Scope :**
- Client React Native (gestion des données, chiffrement)
- Proxy metals.dev (injection, rate limiting)
- Backend Spring Boot (auth, sync, injection)

**Hors scope :**
- Attaques nécessitant un accès physique au device
- Attaques social engineering
- Vulnérabilités dans les dépendances tierces (signaler directement aux mainteneurs)

---

*Dernière mise à jour : session design avril 2026*
*Propriétaire : Mounir*
