# StackLab

**Track your precious metals stack. Own your data.**

StackLab is a privacy-first mobile app for gold and silver stackers. Your holdings stay on your device. No account required. No server ever sees what you own.

> Currently in active development. Beta coming soon.

---

## What it does

- **Real-time spot prices** — Gold and silver in USD, EUR, GBP, CAD, AUD
- **Portfolio tracking** — Track every coin, bar, and round with full details
- **Melt value calculator** — Instant valuation based on live spot prices
- **Organized collection** — Labs, Decks, and Items to structure your stack your way
- **Privacy by design** — Local-first SQLite, no account, no email required

---

## Privacy model

Your data lives on your device. Period.

```
Your holdings → SQLite on your device
Spot prices   → Fetched from our proxy (prices only, no user data sent)
Backup        → iCloud / Google Drive via your OS, or JSON export
Cloud sync    → Optional, E2E encrypted, opt-in only (coming later)
```

The server never receives your holdings, quantities, or values. Even with cloud sync enabled, data is encrypted on your device before leaving it. The server stores an opaque blob it cannot read.

---

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo (managed workflow) |
| Language | TypeScript (strict) |
| Local storage | expo-sqlite |
| State | Zustand |
| Validation | Zod |
| Backend | Spring Boot (Java 21) |
| Proxy | Spring Boot (Java 21) |
| Database | PostgreSQL (Railway) |
| Spot prices | metals.dev |
| Deployment | Railway |

No Node.js server. No Express. No Next.js.
Node.js is required as a local tooling dependency for Expo/npm — it is not part of the deployed stack.

---

## Repository structure

This is the public mirror of the client. The full project is a private monorepo:

```
stacklab/                    ← private monorepo (never public)
├── client/    → mirrored → stacklab-client  (this repo, AGPL)
├── backend/   → mirrored → stacklab-backend (AGPL)
├── proxy/     → mirrored → stacklab-proxy   (AGPL)
├── docs/      → mirrored → included in stacklab-client
└── assets/              → NEVER mirrored (skins, sounds — proprietary)
```

Changes are mirrored automatically via GitHub Actions. Do not push directly to this repo.

---

## Getting started

### Prerequisites

- Node.js 20 LTS — required for Expo/npm tooling (not part of the deployed stack)
- npm 10+
- Expo Go app on your phone (iOS or Android)
- Java 21 LTS — required for backend/proxy development only

### Install

```bash
git clone https://github.com/stacklab-app/stacklab-client.git
cd stacklab-client
npm install
npx expo start
```

Scan the QR code with Expo Go. The app runs on your phone immediately.

### Environment variables

Create a `.env.local` at the root:

```
EXPO_PUBLIC_PROXY_URL=http://localhost:8080
EXPO_PUBLIC_API_URL=http://localhost:8081
```

For production values, contact the maintainer or deploy your own proxy (see `stacklab-proxy`).

---

## Documentation

All design and technical decisions are documented in `/docs`:

| Document | Description |
|---|---|
| ARCHITECTURE.md | Code structure, layers, patterns |
| DATA_MODEL.md | Entities and business rules |
| DATABASE_SCHEMA.md | SQLite schema with all tables |
| API_CONTRACTS.md | All network endpoints |
| SECURITY.md | Security model and decisions |
| INTERACTIONS.md | Animations, haptics, sounds |
| NAVIGATION.md | Screens, flows, context menus |
| TESTING_STRATEGY.md | What to test and how |
| MIGRATION_STRATEGY.md | SQLite schema migrations |
| ERROR_HANDLING.md | Error codes and user messages |
| METALS_DEV_API.md | Spot price API reference |

---

## Roadmap

```
Phase 0  → Setup and documentation (current)
Phase 1  → SQLite schema + data model
Phase 2  → Labs, Decks, Items UI + cards
Phase 3  → Spot prices via proxy
Phase 4  → Portfolio dashboard
Phase 5  → Backup and JSON export/import
Phase 6  → Sharing
Phase 7  → Backend + waitlist
Phase 8  → Cloud sync (opt-in, E2E encrypted)
Phase 9  → Beta
Phase 10 → Premium launch
```

Current status: **Phase 0 — Documentation and architecture complete.**

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Bug reports and feature requests are welcome via GitHub Issues.

---

## License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

- Personal use and self-hosting: free
- Forks and modifications: allowed, but modified code must remain AGPL
- Commercial SaaS use of this code: requires explicit permission from the maintainer

The codebase is open. The assets (skins, sounds, animations) are proprietary and not included in this repository.

See [LICENSE](./LICENSE) for the full text.

---

## Security

Found a vulnerability? Please do not open a public issue.
Contact: [security contact to be defined before launch]

See [SECURITY.md](./docs/SECURITY.md) for the full security model.

---

*Built by a stacker, for stackers.*
