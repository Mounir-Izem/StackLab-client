# SETUP.md — StackLab
> Guide de démarrage complet. À lire et suivre une seule fois, dans l'ordre.
> Après ce guide : projet initialisé, versionné, visible sur GitHub, prêt à coder.
> Niveau requis : débutant. Chaque étape est expliquée.

---

## Avant de commencer — Ce que tu vas installer

| Outil | Quoi | Pourquoi |
|---|---|---|
| Node.js | Environnement JavaScript | Nécessaire pour Expo et npm |
| npm | Gestionnaire de paquets | Installe les libs |
| Git | Versionning | Sauvegarde ton code |
| Expo CLI | Outil de ligne de commande Expo | Crée et lance l'app |
| Java 21 | Langage backend | Spring Boot tourne sur Java |
| VS Code | Éditeur de code | Recommandé pour ce projet |

---

## Étape 1 — Prérequis système

### Node.js (version 20 LTS)

```bash
# Vérifie si tu l'as déjà
node --version   # doit afficher v20.x.x ou supérieur
npm --version    # doit afficher 10.x.x ou supérieur
```

Si absent : télécharge sur https://nodejs.org → choisir "LTS"

### Git

```bash
git --version    # doit afficher git version 2.x.x
```

Si absent : https://git-scm.com/downloads

### Java 21

```bash
java --version   # doit afficher openjdk 21 ou supérieur
```

Si absent : https://adoptium.net → Temurin 21 (LTS)

> **Pourquoi Java 21 ?** C'est la version LTS (Long Term Support) la plus récente. Spring Boot 3.x la supporte officiellement. LTS = stable, maintenue longtemps, pas de mauvaises surprises.

---

## Étape 2 — Créer les repos GitHub

### 2.1 Deux repos à créer — logique

Tu crées **un seul monorepo local** `stacklab/`. Il se connecte au repo privé GitHub. Les repos publics ne reçoivent jamais de push direct — ils sont alimentés automatiquement par GitHub Actions.

```
En local         → repo privé GitHub    → repos publics GitHub
stacklab/        → stacklab
  client/   ─────────────────────────────→ stacklab-client  (AGPL)
  backend/  ─────────────────────────────→ stacklab-backend (AGPL)
  proxy/    ─────────────────────────────→ stacklab-proxy   (AGPL)
  assets/   → JAMAIS mirroré — reste privé (skins, sons, animations)
  docs/     ─────────────────────────────→ inclus dans stacklab-client
```

Tu ne travailles que dans `stacklab/`. Tu ne touches jamais aux repos publics directement.

**`assets/` — Dossier privé, jamais mirroré :**
```
stacklab/assets/
├── sounds/           → Sons de création, vente, tap (mp3/ogg)
├── skins/            → Assets visuels des skins IAP
│   ├── phantom/
│   ├── bullion/
│   └── ...
└── animations/       → Animations milestone IAP
```

Ce dossier ne doit jamais apparaître dans un workflow mirror GitHub Actions.
Les assets sont propriétaires — non couverts par AGPL-3.0.

**Note sur les mises à jour App Store / Play Store :**
SQLite est stocké dans le sandbox de l'app. Il persiste automatiquement lors d'une mise à jour — l'utilisateur ne perd pas ses données. Aucune action requise côté développeur pour préserver les données lors d'un update.

**Repo 1 — stacklab (privé)**
- Nom : `stacklab`
- Visibilité : **Private**
- Ne pas initialiser avec README

**Repo 2 — stacklab-client (public)**
- Nom : `stacklab-client`
- Visibilité : **Public**
- Ne pas initialiser avec README

**Repo 3 — stacklab-backend (public)**
- Nom : `stacklab-backend`
- Visibilité : **Public**
- Ne pas initialiser avec README

**Repo 4 — stacklab-proxy (public)**
- Nom : `stacklab-proxy`
- Visibilité : **Public**
- Ne pas initialiser avec README

> **Pourquoi deux repos ?** Le backend contient des secrets (clés API, logique serveur). L'app client est open source. On sépare pour ne jamais exposer le backend par accident.

### 2.2 GitHub Actions — C'est quoi ?

GitHub Actions est un système d'automatisation intégré à GitHub. Tu écris des instructions (workflows) et GitHub les exécute automatiquement quand tu pousses du code.

Dans StackLab, on utilise GitHub Actions pour **une seule chose au départ** : copier automatiquement le dossier `client/` vers `stacklab-client` à chaque push. Tu ne touches pas à ça manuellement.

### 2.3 Token GitHub pour les mirrors

Pour que GitHub Actions puisse écrire dans les repos publics, il a besoin d'une autorisation.

1. Va sur GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. "Generate new token (classic)"
3. Note : `stacklab-mirror`
4. Expiration : No expiration
5. Scopes : coche uniquement `repo`
6. Génère et **copie le token immédiatement** — il ne s'affiche qu'une fois

Garde ce token dans ton gestionnaire de mots de passe. Il sera utilisé pour les 3 mirrors.

---

## Étape 3 — Initialiser le monorepo

```bash
mkdir stacklab && cd stacklab
git init
mkdir client backend proxy docs .github
mkdir .github/workflows
```

### 3.1 Fichier LICENSE — OBLIGATOIRE

Crée un fichier `LICENSE` à la racine avec le texte AGPL-3.0 :

```bash
curl https://www.gnu.org/licenses/agpl-3.0.txt > LICENSE
```

Ou copie le texte manuellement depuis https://www.gnu.org/licenses/agpl-3.0.txt

---

## Étape 3 — Initialiser le monorepo

```bash
# Crée le dossier principal
mkdir stacklab && cd stacklab

# Initialise Git
git init

# Crée la structure de dossiers
mkdir client backend proxy docs .github
mkdir .github/workflows
```

### 3.1 .gitignore — OBLIGATOIRE avant le premier commit

Crée un fichier `.gitignore` à la racine :

```gitignore
# Variables d'environnement — JAMAIS dans Git
.env
.env.local
.env.development
.env.production
.env.test

# Android
*.keystore
*.jks
google-services.json

# iOS
GoogleService-Info.plist
*.mobileprovision
*.p12
*.cer

# Node
node_modules/
npm-debug.log*

# Expo
.expo/
dist/

# Java / Spring Boot
target/
*.class
*.jar
*.war
*.ear
HELP.md
.mvn/

# IDE
.idea/
.vscode/settings.json
*.iml

# OS
.DS_Store
Thumbs.db
```

> **Pourquoi c'est obligatoire avant le premier commit ?** Si tu commites un `.env` avec une clé API, cette clé est dans l'historique Git pour toujours — même si tu la supprimes ensuite. C'est une faille de sécurité permanente.

### 3.2 Premier commit

```bash
git add .gitignore
git commit -m "chore: initial setup with .gitignore"
```

### 3.3 Connecter au repo GitHub

```bash
git remote add origin https://github.com/TON_USERNAME/stacklab.git
git branch -M main
git push -u origin main
```

---

## Étape 4 — Initialiser le client Expo

```bash
cd client

# Crée le projet Expo avec TypeScript
npx create-expo-app@latest . --template blank-typescript

# Vérifie que ça fonctionne
npx expo start
```

> **Ce que fait `npx create-expo-app`** : installe la dernière version stable d'Expo SDK avec TypeScript préconfigué. Le `--template blank-typescript` donne un projet vide en TypeScript. Tu n'as pas à choisir la version manuellement.

> **`npx expo start`** lance le serveur de développement. Sur ton téléphone, installe l'app **Expo Go** (App Store / Play Store). Scanne le QR code — tu vois l'app sur ton téléphone en temps réel.

### 4.1 Configurer TypeScript strict

Ouvre `client/tsconfig.json` et assure-toi qu'il contient :

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

> **Pourquoi strict ?** TypeScript en mode strict détecte les erreurs avant qu'elles arrivent en production. `noImplicitAny` interdit les types implicites. `strictNullChecks` force à gérer les valeurs nulles. C'est plus contraignant mais ça évite des bugs silencieux.

### 4.2 Installer les dépendances de départ

```bash
cd client

# Navigation
npx expo install @react-navigation/native @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# Storage local
npx expo install expo-sqlite

# Chiffrement clés sensibles
npx expo install expo-secure-store

# Validation
npm install zod

# State management
npm install zustand

# Réseau / offline
npx expo install @react-native-community/netinfo

# Backup fichier
npx expo install expo-file-system

# Screenshot prevention
npx expo install expo-screen-capture
```

> **Pourquoi `npx expo install` et pas `npm install` ?** `npx expo install` choisit automatiquement la version compatible avec ta version d'Expo SDK. `npm install` peut installer une version incompatible et casser l'app.

### 4.3 Tableau des libs installées

| Lib | Quoi | Force eject ? |
|---|---|---|
| @react-navigation/native | Navigation entre écrans | NON |
| @react-navigation/bottom-tabs | Barre de tabs en bas | NON |
| react-native-screens | Optimisation navigation | NON |
| react-native-safe-area-context | Gestion des encoches | NON |
| expo-sqlite | Base de données locale | NON |
| expo-secure-store | Stockage chiffré clés | NON |
| zod | Validation des données | NON |
| zustand | State management | NON |
| @react-native-community/netinfo | Détection offline | NON |
| expo-file-system | Accès fichiers iCloud/Drive | NON |
| expo-screen-capture | Bloquer les screenshots | NON |

**Toutes ces libs sont compatibles Expo managed workflow. Aucune ne force un eject.**

### 4.4 Structure de dossiers client

```
client/
├── app/               → Écrans et navigation (Expo Router si utilisé)
├── components/        → Couche UI — composants React Native
│   ├── cards/
│   ├── common/
│   └── screens/
├── stores/            → Couche State — stores Zustand
├── services/          → Couche Services — logique métier
├── repositories/      → Couche Data — accès SQLite
├── db/                → Instance SQLite + migrations
├── schemas/           → Schémas Zod (validation)
├── types/             → Types TypeScript partagés
├── hooks/             → Hooks React personnalisés
├── utils/             → Fonctions pures (calculs financiers, formatage)
├── api/               → Wrapper fetch (api.ts)
└── __tests__/         → Tests (voir TESTING_STRATEGY.md)
```

**Référence :** voir ARCHITECTURE.md pour les règles de séparation des responsabilités entre ces dossiers.

---

## Étape 5 — Initialiser le backend Spring Boot

### 5.1 Créer le projet via Spring Initializr

Va sur https://start.spring.io et configure :

| Champ | Valeur |
|---|---|
| Project | Maven |
| Language | Java |
| Spring Boot | 3.x.x (dernière stable) |
| Group | com.stacklab |
| Artifact | backend |
| Packaging | Jar |
| Java | 21 |

Dépendances à ajouter :
- Spring Web
- Spring Security
- Spring Data JPA
- PostgreSQL Driver
- Validation

Clique "Generate" → télécharge le zip → décompresse dans `stacklab/backend/`

### 5.2 Structure de dossiers backend

```
backend/
├── src/main/java/com/stacklab/
│   ├── config/        → Configuration Spring (Security, CORS...)
│   ├── controller/    → Endpoints REST
│   ├── service/       → Logique métier
│   ├── repository/    → Accès base de données (JPA)
│   ├── model/         → Entités JPA
│   └── dto/           → Data Transfer Objects
└── src/main/resources/
    └── application.properties → Configuration (jamais de secrets ici)
```

### 5.3 Variables d'environnement backend

Crée `backend/.env` (jamais commité grâce au .gitignore) :

```env
DATABASE_URL=postgresql://localhost:5432/stacklab
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=ton_mot_de_passe_local
METALS_DEV_API_KEY=ta_clé_api
JWT_SECRET=une_longue_chaine_aleatoire
```

---

## Étape 6 — Configurer GitHub Actions

### 6.1 Secret GitHub pour le mirror

Dans le repo `stacklab` sur GitHub :
1. Settings → Secrets and variables → Actions
2. "New repository secret"
3. Name : `MIRROR_TOKEN`
4. Value : le token que tu as copié à l'Étape 2.3
5. "Add secret"

### 6.2 Créer les workflows mirror

Crée `.github/workflows/mirror-client.yml` :

```yaml
name: Mirror client to public repo

on:
  push:
    branches: [main]
    paths: ['client/**']

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: s0/git-publish-subdir-action@develop
        env:
          REPO: https://github.com/TON_USERNAME/stacklab-client.git
          BRANCH: main
          FOLDER: client
          GITHUB_TOKEN: ${{ secrets.MIRROR_TOKEN }}
```

Crée `.github/workflows/mirror-backend.yml` :

```yaml
name: Mirror backend to public repo

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: s0/git-publish-subdir-action@develop
        env:
          REPO: https://github.com/TON_USERNAME/stacklab-backend.git
          BRANCH: main
          FOLDER: backend
          GITHUB_TOKEN: ${{ secrets.MIRROR_TOKEN }}
```

Crée `.github/workflows/mirror-proxy.yml` :

```yaml
name: Mirror proxy to public repo

on:
  push:
    branches: [main]
    paths: ['proxy/**']

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: s0/git-publish-subdir-action@develop
        env:
          REPO: https://github.com/TON_USERNAME/stacklab-proxy.git
          BRANCH: main
          FOLDER: proxy
          GITHUB_TOKEN: ${{ secrets.MIRROR_TOKEN }}
```

> **Comment ça fonctionne ?** À chaque fois que tu pousses du code dans `main` ET que des fichiers dans `client/` ont changé, GitHub Actions copie automatiquement le contenu de `client/` vers `stacklab-client`. Tu ne fais rien manuellement.

### 6.3 Configurer Dependabot

Crée `.github/dependabot.yml` :

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/client"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "maven"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "maven"
    directory: "/proxy"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

> **Dependabot** surveille tes dépendances et crée automatiquement des Pull Requests quand une mise à jour de sécurité est disponible. Tu n'as pas à vérifier manuellement.

---

## Étape 7 — Variables d'environnement Expo

Crée `client/.env` (jamais commité) :

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8080
EXPO_PUBLIC_PROXY_URL=http://localhost:8081
```

> **`EXPO_PUBLIC_`** : les variables avec ce préfixe sont accessibles dans le code client. **Ne jamais mettre de secrets réels** dans des variables `EXPO_PUBLIC_` — elles sont visibles dans le bundle de l'app. Les vrais secrets (clés API) restent côté serveur.

---

## Étape 8 — Umami Analytics

Umami est un outil analytics open source, privacy-first. Il te permet de savoir ce que tes utilisateurs font dans l'app sans stocker de données personnelles.

### 8.1 Déployer Umami sur Railway

1. Va sur https://railway.app
2. "New Project" → "Deploy from template" → cherche "Umami"
3. Railway déploie automatiquement Umami + sa base PostgreSQL
4. Une fois déployé, note l'URL de ton instance Umami

### 8.2 Configurer dans l'app

Umami pour React Native utilise des events personnalisés. Tu trackeras :
- Ouverture de l'app
- Création d'un Lab
- Création d'un item
- Activation cloud sync
- Inscription whitelist

**Ce qu'on ne tracke JAMAIS :**
- Le contenu des Labs ou items
- Les valeurs financières
- Les données personnelles

> **Pourquoi Umami et pas Google Analytics ?** Google Analytics envoie des données à Google. Umami est self-hosted sur Railway — les données restent sur ton serveur. Cohérent avec la philosophie privacy-first de StackLab.

---

## Étape 9 — Commit et push final

```bash
cd stacklab

# Ajoute tout
git add .

# Commit de setup
git commit -m "chore: project structure, expo init, spring boot init, github actions"

# Push
git push origin main
```

À ce moment GitHub Actions se déclenche et mirror `client/` vers `stacklab-client`.

---

## Étape 10 — Vérifications finales

**Checklist avant de commencer à coder :**

- [ ] `node --version` affiche v20+
- [ ] `java --version` affiche 21+
- [ ] `npx expo start` dans `client/` lance l'app sur ton téléphone
- [ ] Fichier `LICENSE` (AGPL-3.0) à la racine du monorepo
- [ ] Repo `stacklab` privé visible sur GitHub
- [ ] Repo `stacklab-client` public visible sur GitHub
- [ ] Repo `stacklab-backend` public visible sur GitHub
- [ ] Repo `stacklab-proxy` public visible sur GitHub
- [ ] `.env` n'apparaît dans aucun des repos (vérifie sur github.com)
- [ ] Dependabot activé — vérifie dans Settings → Security
- [ ] Les 3 GitHub Actions mirror visibles dans l'onglet "Actions"

---

## Décisions en attente — À résoudre avant le premier écran

Ces décisions sont maintenant prises.

**State management : Zustand** ✅

Context API a un problème de performance — quand le contexte change, tous les composants qui le consomment re-rendent. Sur StackLab avec un spot price qui se met à jour toutes les 5 minutes et potentiellement des centaines d'items, ça devient un vrai problème.

Zustand résout ça avec des sélecteurs — un composant ne re-rend que si la donnée qu'il utilise spécifiquement a changé. Plus simple que Redux, moins verbeux que Context pour des états complexes.

```bash
cd client
npm install zustand
```

**HTTP client : fetch natif + wrapper `api.ts`** ✅

**Axios est définitivement exclu.** Le 31 mars 2026, Axios a subi une attaque supply chain attribuée à Sapphire Sleet (acteur étatique nord-coréen). Les versions `1.14.1` et `0.30.4` contenaient un RAT (Remote Access Trojan). Les versions malveillantes ont été retirées mais l'incident confirme que chaque dépendance est une surface d'attaque.

Fetch natif = zéro dépendance externe pour les appels HTTP. On écrit un wrapper `api.ts` dans `client/utils/` qui centralise la gestion des erreurs, les headers, et les timeouts.

---

## Résumé de ce qui est installé

### Client (React Native + Expo managed)
- Expo SDK (dernière stable via create-expo-app) + TypeScript strict
- Navigation : React Navigation v6
- Storage : expo-sqlite + expo-secure-store
- Validation : Zod
- State : Zustand
- Réseau : @react-native-community/netinfo
- Fichiers : expo-file-system
- Sécurité UI : expo-screen-capture
- HTTP : fetch natif + wrapper api.ts (**Axios définitivement exclu — supply chain attack mars 2026**)

### Backend (Spring Boot Java 21)
- Spring Web + Spring Security
- JPA / Hibernate + PostgreSQL
- Jakarta Bean Validation
- Bucket4j (rate limiting — à ajouter à la première route)

### Infrastructure
- GitHub : repo privé + repo public mirroré
- GitHub Actions : mirror automatique + Dependabot
- Railway : backend + proxy + Umami (à déployer au Bloc 3)

---

*Dernière mise à jour : session analyse produit avril 2026*
*Propriétaire : Mounir*
