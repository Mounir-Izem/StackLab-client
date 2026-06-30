# TECH_STACK.md — StackLab
> Source unique de vérité pour le stack technique.
> Toute décision de bibliothèque ou de version est ici. Nulle part ailleurs.
> Toute déviation nécessite validation explicite du propriétaire.

---

## Principe

**Ne jamais choisir une bibliothèque ou une version qui n'est pas listée ici.**
Si un besoin n'est pas couvert — signaler et attendre validation avant d'ajouter.

---

## Mobile — React Native + Expo

| Élément | Choix | Raison |
|---|---|---|
| Framework | React Native | Cross-platform iOS + Android |
| Toolchain | Expo (managed workflow) | Simplicité, pas d'éjection nécessaire en MVP |
| Langage | TypeScript strict | Qualité, fiabilité, détection d'erreurs |
| Navigation | React Navigation v6 | Standard de l'écosystème RN |
| Storage local | expo-sqlite | Base relationnelle, requêtes complexes. Pas de SQLCipher en managed workflow — sandbox natif comme protection en MVP. Chiffrement applicatif prévu avant lancement public. |
| Clés sécurisées | expo-secure-store | UUID cloud sync et clés sensibles stockés dans keychain iOS / Keystore Android. Compatible Expo managed. Limite 2MB/valeur. Stocke aussi le PIN App Lock (Phase 7) — directement, pas haché, déjà chiffré par le Keychain/Keystore. Documenté depuis Phase 0 mais réellement installé seulement en Phase 7. |
| Biométrie | expo-local-authentication | Face ID / Touch ID / empreinte (Phase 7, App Lock). `disableDeviceFallback: true` — sans ça, un échec biométrique basculerait sur le code du téléphone, pas le PIN de l'app. Nécessite `NSFaceIDUsageDescription` dans `app.json` (iOS), config plugin auto-ajouté pour expo-secure-store. |
| Validation | Zod | Schémas partagés client/serveur |
| State management | Zustand | Performances supérieures à Context API sur gros volume. Sélecteurs = re-renders ciblés uniquement. |
| Backup fichier | expo-file-system | Accès répertoire Documents iCloud/Drive |
| Partage fichier (Android) | expo-sharing | `Share.share()` de react-native ne gère pas fiablement les URIs `file://` sur Android (nécessite un content provider). iOS utilise `Share` natif directement — pas besoin d'expo-sharing là. Décision validée Phase 6.1, déjà utilisée dans `useCardGestures.ts`. |
| Sélecteur fichier import | expo-document-picker | Laisse l'utilisateur choisir le fichier JSON à importer (Phase 6.2). Officiel Expo, compatible managed workflow. |
| Photos items | expo-image-picker | Accès galerie et appareil photo. Compatible Expo managed. |
| Screenshot | expo-screen-capture | Prevention sur écrans sensibles |
| Réseau / offline | @react-native-community/netinfo | Détection offline, fallback cache spot |
| HTTP client | fetch natif + wrapper api.ts | Zéro dépendance externe. Axios exclu définitivement — compromis supply chain mars 2026 (RAT nord-coréen, Sapphire Sleet). |

**Règle absolue — Expo managed workflow :**
Toute lib ajoutée doit être compatible Expo managed. Avant d'ajouter une lib, vérifier sur docs.expo.dev ou via `npx expo install`. Si une lib requiert `expo prebuild` ou `eject` — elle est interdite sans validation explicite du propriétaire.

**Ce qui est interdit côté client :**
- AsyncStorage pour des données sensibles
- JavaScript pur — TypeScript uniquement
- Bibliothèques non listées sans validation
- Toute lib qui force `expo prebuild` / sortie du managed workflow

---

## Backend — Spring Boot (Java)

| Élément | Choix | Raison |
|---|---|---|
| Framework | Spring Boot | Décision validée |
| Langage | Java | Décision validée |
| Sécurité | Spring Security | Headers HTTP, auth, rate limiting |
| ORM | JPA / Hibernate | Requêtes paramétrées, pas de SQL brut |
| Validation | Jakarta Bean Validation | `@Valid`, `@NotNull`, `@Size` |
| Rate limiting | Bucket4j | Intégration Spring Boot |
| Paiements | Stripe SDK Java | Post-bêta uniquement — webhooks validés par signature |

**Ce qui est interdit côté backend :**
- SQL construit par concaténation de strings
- Routes sans rate limiting
- Webhooks Stripe sans validation de signature
- Logs contenant des données utilisateur

---

## Base de données

| Élément | Choix |
|---|---|
| Locale (device) | SQLite via expo-sqlite |
| Serveur (opt-in) | PostgreSQL |
| Hébergement | Railway |
| ORM serveur | JPA / Hibernate |

---

## Infrastructure

| Élément | Choix |
|---|---|
| Hébergement backend | Railway |
| Hébergement proxy API | Railway (service séparé) |
| CI/CD | GitHub Actions |
| Secrets management | Variables d'environnement Railway |
| Monitoring | À décider post-MVP |
| Conteneurisation | Docker — post-MVP uniquement |

---

## Services tiers

| Service | Usage | Contrainte |
|---|---|---|
| metals.dev | Spot prices or/argent | Clé API côté serveur uniquement, jamais client. Fournit nativement les devises (USD, EUR, GBP, CAD, AUD...) — pas de service tiers de conversion nécessaire. TTL cache : 5 minutes pendant heures de marché uniquement. |
| Stripe | Paiements premium | IAP obligatoire sur iOS App Store |
| iCloud | Backup automatique iOS | Via expo-file-system, répertoire Documents |
| Google Drive | Backup automatique Android | Via expo-file-system, répertoire Documents |
| GitHub | Versionning + open source | Repo client public, backend public, proxy publique |
| Dependabot | Scan vulnérabilités | Activé dès le premier push |

---

## Monorepo — Structure

```
stacklab/ (repo privé — contient tout)
├── client/         → React Native + Expo (mirrored → stacklab-client public)
├── backend/        → Spring Boot (mirrored → stacklab-backend public)
├── proxy/          → Relay metals.dev (mirrored → stacklab-proxy public)
├── docs/           → Tous les fichiers .md de référence
└── .github/
    └── workflows/
        ├── mirror-client.yml    → Mirror client/ → stacklab-client
        ├── mirror-backend.yml   → Mirror backend/ → stacklab-backend
        └── mirror-proxy.yml     → Mirror proxy/ → stacklab-proxy
```

**Règle absolue :** aucun secret dans le code. Tous les secrets vivent dans les variables d'environnement Railway — jamais dans un fichier commité.

---

## Open Source

**Code : GNU Affero General Public License v3.0 (AGPL-3.0)**
**Assets : Propriétaires — tous droits réservés**

| Élément | Licence | Visibilité |
|---|---|---|
| `client/` | AGPL-3.0 | Repo public `stacklab-client` |
| `backend/` | AGPL-3.0 | Repo public `stacklab-backend` |
| `proxy/` | AGPL-3.0 | Repo public `stacklab-proxy` |
| `docs/` | AGPL-3.0 | Inclus dans `stacklab-client` |
| `assets/sounds/` | Propriétaire | Jamais public |
| `assets/skins/` | Propriétaire | Jamais public |
| `assets/animations/` | Propriétaire | Jamais public |

**Ce qui ne sera jamais public :**
- Variables d'environnement (clés API, secrets Railway)
- Fichiers `.env`
- Credentials de déploiement
- Le dossier `assets/` (sons, skins, animations IAP)

**AGPL-3.0 signifie :**
- Usage personnel et auto-hébergement : libre et gratuit
- Fork et modification : autorisés, mais le code modifié doit rester AGPL
- Usage commercial (SaaS) avec le code : interdit sans accord explicite du propriétaire

**Les assets propriétaires :**
- Les fichiers son, skins, et animations sont des œuvres artistiques
- Ils ne sont pas couverts par AGPL — ils restent propriétaires
- Un fork du code peut exister, mais ne peut pas utiliser ces assets
- Un fork doit produire ses propres assets pour proposer des fonctionnalités équivalentes

---

## Contraintes App Store / Play Store

### iOS App Store — Critique
**Apple impose ses In-App Purchases (IAP) pour les abonnements vendus dans l'app.**
Stripe ne peut pas être utilisé directement pour les abonnements iOS sans risquer le rejet.

Solution :
- Abonnements iOS → Apple IAP (StoreKit 2)
- Abonnements Android → Google Play Billing ou Stripe
- Bibliothèque recommandée : `react-native-purchases` (RevenueCat) pour unifier IAP iOS + Android

**Stripe et RevenueCat sont post-bêta — ne pas implémenter avant le lancement premium.**

**Cette décision doit être validée avant d'écrire une ligne de code de monétisation.**

---

## Décisions en attente — Ne pas implémenter avant validation

| Décision | Statut |
|---|---|
| IAP library (RevenueCat vs natif) | À valider — post-bêta |
| Expo SDK version cible | Dernière stable via npx create-expo-app |
| Java version | 21 LTS |

---

*Dernière mise à jour : session analyse produit avril 2026*
*Propriétaire : Mounir*
