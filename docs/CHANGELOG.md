# Changelog

All notable changes to StackLab will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added
- **P1 — Screen Protection** : `expo-screen-capture ~8.0.9` ; hooks `useScreenProtection(active, tag)` et `useAppSwitcherProtection(active, tag)` (ref-count iOS via `Set<string>` module-level pour éviter conflits sur l'API globale) ; protection permanente sur PinSetupModal/PinVerifyModal/PinInputModal/LockScreen ; protection globale pilotée par `screenProtectionEnabled` dans App.tsx ; toggle dans SettingsModal → Security ; i18n EN/FR. Migration V8 : `screen_protection_enabled INTEGER NOT NULL DEFAULT 0`. QA device Android validée. Mergé sur main 2026-07-03. (commit `7c8e81f`)
- **Scripts CI** : `typecheck = tsc --noEmit`, `check = npm run typecheck && npm test`, `ci = npm run check` — ajoutés dans `client/package.json`. (2026-07-03)
- **Phase 10B — Indicateurs micro-UX melt** : `meltBadge` (under/near melt), `showMissingPrice`, `showYearDot`, avertissement "under melt" dans CreateItemStep4. 19 nouveaux tests `meltAnalysis`. Mergé sur main 2026-07-03. (commit `8941c49`)
- **`itemService.updateObservedPrice()`** : nouvelle méthode service avec garde `ITEM_NOT_WISHLIST`, normalisation per-unit identique à `updatePurchasePrice`. Propagée dans `itemStore`.
- **Migration V7** : migration data-only réparant les rows wishlist corrompus — copie `purchase_price` → `observed_price` si null, puis vide les champs purchase sur tous les items `status = 'wishlist' AND purchase_price IS NOT NULL`.
- **TECH_DEBT_AUDIT.md** : audit global de la dette technique (20 sections, 8 questions ouvertes avant Phase 11/bêta). Dans `docs/private/`. (commit `b1e5ba9`)

### Fixed
- **P1 (visuel) — SettingsModal Switch non visible** : `rowLeft` sans `flex: 1` → la description longue poussait le Switch hors écran sur Android. Corrigé par ajout `flex: 1` sur le View parent et le View texte interne. (commit `d912fb8`, 2026-07-03)
- **P0 — EditItemFlow wishlist** : `handleSave` appelait `updatePurchasePrice()` pour tous les statuts, écrasant silencieusement `purchase_price` sur les rows wishlist en violation de `BUSINESS_LOGIC.md §11`. Corrigé par branching sur `item.status === 'wishlist'` dans `EditItemFlow`, garde `ITEM_NOT_WISHLIST` dans `updateObservedPrice`, et migration V7. (commit `6859301`, 2026-07-03)

### Tests
- 240/240 — `tsc --noEmit` propre.

---

### Archive — travaux antérieurs (non versionnés)
- Phase 0 — Documentation et architecture
- Phase 1 — Schéma SQLite et modèle de données
- Phase 2 — Labs, Decks, Items (core MVP)
- Phase 3 — Proxy metals.dev + prix spot
- Phase 4 — Dashboard
- Phase 5 — Onboarding + navigation complète
- Phase 6 — Backup + Export JSON (iCloud/Drive)
- Phase 7 — App Lock (PIN + biométrie)
- Phase 8 — Export chiffré (AES-256-GCM depuis PIN)
- Phase 9 — Localisation FR (i18n complet EN/FR)

---

## Version history

*No releases yet. First release will be the beta (Phase 9).*

---

## Release naming convention

```
0.x.x → Pre-beta development builds
1.0.0 → Beta launch
1.x.x → Beta iterations
2.0.0 → Premium launch (Phase 10)
```

---

*This file will be updated at each release with a summary of changes, bug fixes, and breaking changes.*
