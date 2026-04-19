# WIREFRAME_MASS_EDIT.md — Flow Modifier (édition, vente, déplacement)
> Documentation complète du flow validé de bout en bout.
> Chaque écran, chaque état, chaque transition, chaque edge case.
> À lire avant d'implémenter les étapes 2.12 et 2.13 (ROADMAP.md).

---

## Philosophie — Object-first

L'utilisateur pense en objets, pas en blocs. Quand il a un lot de 7 Maple Leaf BU 2022, il peut :
- En vendre 2 à un acheteur
- En déplacer 3 dans un autre Deck
- En modifier le strike finish sur 5 d'entre elles
- En extraire 1 pour lui donner sa propre photo

Il ne doit jamais être contraint d'agir sur le lot entier. Le contrôle de quantité est systématique sur toute action impliquant un item avec `quantity > 1`.

---

## Architecture du flow

```
LabDetail ou DeckDetail
    ↓ bouton "Modifier" (header)
[Écran A] Modal choix : "Que voulez-vous modifier ?"
    ↓ "Items"                        ↓ "Ce Deck/Lab"
[Écran B] Sélection items        → Options conteneur (renommer, supprimer)
    ↓ "Continuer"
[Écran C] Choix d'action
    ↓
    ├── [Écran D] Vendre
    ├── [Écran E] Déplacer
    ├── [Écran F] Modifier un champ
    ├── [Écran G] Réassigner les années
    └── [Écran H] Supprimer
         ↓ Confirmation
    Retour LabDetail/DeckDetail
```

---

## Écran A — Modal choix

**Déclencheur :** tap sur le bouton "Modifier" dans le header de LabDetail ou DeckDetail.
**Type :** bottom sheet ou modal

**Contenu :**
```
"Que voulez-vous modifier ?"
Contexte : [nom du Lab/Deck courant]

┌────────────────────┐  ┌────────────────────┐
│       ○             │  │       ▣             │
│     Items           │  │   Ce Deck/Lab       │
│  Sélectionner des   │  │  Renommer, déplacer │
│  items dans cet     │  │  ou supprimer ce    │
│  emplacement        │  │  conteneur          │
└────────────────────┘  └────────────────────┘

[Annuler]
```

**Règle de scope :**
- Depuis un DeckDetail → "Ce Deck/Lab" = ce Deck uniquement
- Depuis un LabDetail → "Ce Deck/Lab" = ce Lab uniquement
- On ne modifie jamais un Lab depuis un DeckDetail — il faut remonter via le breadcrumb

---

## Écran B — Sélection items

**Type :** écran plein écran

**Header :**
```
"Sélectionner des items"                          [Annuler]
```

**Breadcrumb visible en haut, non navigable pendant la sélection :**
```
Standard Lab › Silver › DCA
```

**Sous-titre :**
```
3 items · 15 unités au total
```

**Liste des items de cet emplacement :**
```
[ ] Maple Leaf 2022 BU      Silver · ×7
[ ] Maple Leaf 2022 Proof   Silver · ×5
[ ] American Eagle 2024 BU  Silver · ×3
```

Chaque item : checkbox + thumbnail + nom + meta.
Tap sur un item = toggle la sélection.

**Bas de l'écran :**
```
Hint : "0 item sélectionné"  →  "N items sélectionnés"

[Continuer →]   ← grisé si 0 sélection, actif dès 1
```

**Règle :** la sélection est limitée aux items visibles à l'écran (emplacement courant uniquement). Pas de cross-labs.

---

## Écran C — Choix d'action

**Header :**
```
"N items sélectionnés"                            [Annuler]
```

**Breadcrumb visible (identique à Écran B)**

**Rappel des items sélectionnés :**
```
· Maple Leaf 2022 BU ×7
· Maple Leaf 2022 Proof ×5
```

**Actions disponibles (toutes visibles, toujours) :**
```
┌─────────────────────────────────────────────┐
│ Vendre                                      │
│ Définir la quantité et le prix de vente     │
├─────────────────────────────────────────────┤
│ Déplacer                                    │
│ Choisir un autre Lab ou Deck                │
├─────────────────────────────────────────────┤
│ Modifier un champ                           │
│ Strike finish, poids, pureté, notes...      │
├─────────────────────────────────────────────┤
│ Réassigner les années                       │
│ Redistribuer les unités par année et finish │
├─────────────────────────────────────────────┤
│ Supprimer                    ← texte rouge  │
│ Supprimer définitivement les items          │
└─────────────────────────────────────────────┘

[← Modifier la sélection]
```

"← Modifier la sélection" → retour Écran B avec la sélection conservée.

---

## Écran D — Vendre

**Header :**
```
"Vendre"                                          [← Retour]
```

**Breadcrumb visible**

**Sous-titre :**
```
"Définissez la quantité à vendre pour chaque item.
Les unités restantes resteront actives."
```

**Pour chaque item sélectionné, une carte :**
```
┌──────────────────────────────────────────────┐
│  [Thumb]  Maple Leaf 2022 BU                 │
│           × 7 disponibles                   │
│                                              │
│  Vendre   [−]  [ 2 ]  [+]        / 7        │
│                ↑ saisie directe ET boutons   │
│                                              │
│  Prix de vente (optionnel)                   │
│  [ 69.50             ] [ USD ▼ ]             │
│  [ Par unité ▼                 ]             │
│    → Par unité / Par lot                     │
└──────────────────────────────────────────────┘
```

**Prix — toggle "Par unité / Par lot" :**
- **Par unité :** `sold_price = saisie × qty_vendue`
- **Par lot :** `sold_price = saisie` (prix total pour toutes les unités vendues de cet item)

Qty défaut : 0 pour chaque item. L'utilisateur choisit librement.
Qty max : `quantity` disponible de l'item. Impossible de dépasser.

**Résumé dynamique en bas (mis à jour à chaque changement) :**
```
Vente : 2 unités sur 10 sélectionnées.
Maple Leaf ×5 et American Eagle ×3 resteront actifs.
```

**Boutons :**
```
[Confirmer la vente]
[← Retour]
```

**Résultat après confirmation :**
Pour chaque item où qty vendue > 0 :
- Item original : `quantity -= qty_vendue`
- Nouvel item créé : `status: sold`, `quantity: qty_vendue`, `sold_price` calculé
- Si `qty_vendue = quantity` totale : l'item entier passe en sold, pas de résidu qty:0

---

## Écran E — Déplacer

**Header :**
```
"Déplacer"                                        [← Retour]
```

**Breadcrumb visible**

**Sous-titre :**
```
"Définissez la quantité à déplacer et choisissez la destination."
```

**Pour chaque item sélectionné, une carte :**
```
┌──────────────────────────────────────────────┐
│  [Thumb]  Maple Leaf 2022 BU                 │
│           × 7 disponibles                   │
│                                              │
│  Déplacer  [−]  [ 2 ]  [+]       / 7        │
└──────────────────────────────────────────────┘
```

**Destination :**
```
Standard Lab · DCA        ← emplacement courant (grisé, non sélectionnable)
Standard Lab · Liquidity  ← sélectionnable
Premium Lab               ← sélectionnable
Wishlist                  ← sélectionnable
```

**Résumé dynamique :**
```
Déplacer : 5 unités vers Standard Lab · Liquidity.
Maple Leaf ×2 et American Eagle ×3 resteront ici.
```

**Boutons :**
```
[Confirmer le déplacement]   ← grisé si aucune destination choisie
                               ← grisé si qty = 0 sur tous les items
[← Retour]
```

**Résultat après confirmation :**
Pour chaque item où qty déplacée > 0 :
- Item original : `quantity -= qty_déplacée`
- Nouvel item créé à la destination avec mêmes attributs, `quantity: qty_déplacée`
- Si `qty_déplacée = quantity` totale : l'item entier est déplacé, pas d'extraction

---

## Écran F — Modifier un champ

**Header :**
```
"Modifier un champ"                               [← Retour]
```

**Sous-titre :**
```
"Les modifications s'appliquent aux N items sélectionnés.
Photo non modifiable en masse — item par item uniquement."
```

**Dropdown "Champ à modifier" :**
```
— Choisir un champ —
Strike finish
Weight
Purity
Mint
Purchase price
Notes
```

**Selon le champ sélectionné :**

Strike finish :
```
Chips : [BU] [Proof] [Rev. Proof] [Matte] [Specimen] [Antique] [Privy]

Si valeurs différentes entre items :
"Items had different values — selecting here overwrites all."
```

Weight :
```
[valeur numérique]  [oz ▼ / g / kg]
```

Purity :
```
.9999 — 24k fine
.999 — 24k
.9167 — 22k
.925 — Sterling
.916 — 22k Sovereign
.900 — 90%
.800 — 80%
```

Mint :
```
[champ texte libre]
```

Purchase price :
```
[valeur numérique]  [USD ▼]
"Prix par unité — utilisé pour le calcul du P&L."
```

Notes :
```
⚠ "This will replace existing notes on N items.
   Any previous notes will be lost."

[Textarea]
```

**Boutons :**
```
[Appliquer à N items]   ← grisé tant qu'aucun champ ET valeur choisis
[Annuler]
```

---

## Écran G — Réassigner les années

**Header :**
```
"Réassigner les années"                           [← Retour]
```

**Sous-titre :**
```
"N items · M unités au total.
Les unités non assignées conservent leur année et finish actuels."
```

**Matrice identique à la création :**
```
Année      | Strike finish   | Qty | ×
[ 2022   ] [ BU ▼          ] [ 7 ] ×
[ 2022   ] [ Proof ▼        ] [ 5 ] ×
+ Add combination

───────────────────────────────────────────
12 / 12 assignés ✓                          ← vert si ok
5 / 12 assignés ⚠ 7 conserveront leur valeur actuelle  ← orange si partiel
15 / 12 ⚠ over by 3                         ← orange si dépassement
```

**Règles :**
- Réassignation partielle **autorisée** — les unités non couvertes gardent leurs valeurs
- Dépassement **bloqué** — bouton grisé si total > M
- Suppression d'une ligne : bouton × sur chaque ligne
- Ajout de ligne : "+ Add combination"
- Champ Finish optionnel dans la matrice

**Boutons :**
```
[Appliquer les changements]   ← grisé si total > M uniquement
[← Retour]
```

---

## Écran H — Supprimer

**Pas d'écran séparé.** Déclenché depuis l'Écran C (Choix d'action).

Tap sur "Supprimer" → affiche inline dans l'Écran C :

```
⚠ Avertissement en rouge :
"Vous allez supprimer N items (M unités).
 Cette action est irréversible.
 Les items vendus (sold) ne sont pas affectés."

[Supprimer N items définitivement]   ← texte + bouton en rouge
[Annuler]
```

Pas de double modal. Le warning inline suffit.

---

## Edge cases — Flow Modifier (bouton header)

**ME-01 — Vendre qty = 0 sur un item**
L'utilisateur laisse qty à 0.
→ Aucune action sur cet item. Ignoré silencieusement.

**ME-02 — Vendre qty = quantity totale**
→ L'item entier passe `status: sold`. Pas d'item résiduel avec qty:0.

**ME-03 — Déplacer vers l'emplacement courant**
→ Emplacement courant grisé dans la liste. Non sélectionnable.

**ME-04 — Déplacer qty = 0 sur tous les items**
→ Bouton "Confirmer" grisé. Aucune action possible.

**ME-05 — Prix de vente : Par unité vs Par lot**
- Par unité : `sold_price = saisie × qty_vendue`
- Par lot : `sold_price = saisie` (prix total du lot vendu)

**ME-06 — Modifier un champ : valeurs différentes entre items**
→ Aucune valeur pré-sélectionnée.
→ Message : "Items had different values — selecting here overwrites all."
→ L'utilisateur choisit → appliqué à tous.

**ME-07 — Réassignation : total > unités disponibles**
→ Bouton "Appliquer" grisé. Counter : "X / M ⚠ over by N".

**ME-08 — Réassignation partielle (total < M)**
→ Counter : "X / M ⚠ Y unités conserveront leur valeur actuelle."
→ Bouton "Appliquer" actif.

**ME-09 — "Modifier la sélection" depuis Écran C**
→ Retour Écran B avec la sélection conservée.

**ME-10 — Annuler depuis n'importe quel écran**
→ Retour immédiat à LabDetail/DeckDetail. Aucune modification.

**ME-11 — Item avec qty = 1 dans Vendre ou Déplacer**
→ Contrôle [−] [1] [+] / 1. Bouton − désactivé (min: 0 = aucune action).

**ME-12 — Notes : items sans notes parmi la sélection**
→ Warning affiché si au moins 1 item a des notes.
→ Pour les items sans notes : les nouvelles notes sont simplement ajoutées.

**ME-13 — Modifier un champ : weight sur items avec puretés différentes**
→ Le poids est appliqué identiquement.
→ Le poids fin est recalculé pour chaque item selon sa propre pureté (non modifiée).
→ Résultat correct mais non-intuitif : documenter dans l'UX post-MVP.

---

## Edge cases — Menu contextuel (appui long)

**EC-01 — Appui long pendant un scroll**
→ Le scroll prime. L'appui long se déclenche uniquement si le doigt
  ne bouge pas pendant 500ms. Seuil standard iOS/Android — ne pas customiser.

**EC-02 — Appui long sur une card en cours d'animation**
→ Si la card est en train d'apparaître (création) ou de disparaître →
  l'appui long est ignoré jusqu'à la fin de l'animation.

**EC-03 — Menu déjà ouvert**
→ Tap ailleurs = fermer le menu ouvert avant d'en ouvrir un autre.
→ Impossible d'avoir deux menus ouverts simultanément.

**EC-04 — Menu contextuel partiellement hors écran**
→ Card en bas de l'écran → menu s'ouvre vers le haut.
→ Card en haut → menu s'ouvre vers le bas.
→ Jamais coupé par un bord.

**EC-05 — Spot indisponible : "Sell at melt" grisé**
→ Si offline ou proxy down, "Sell at melt" est grisé avec sous-titre "Spot unavailable".
→ "Sell with price" reste actif — l'utilisateur peut toujours saisir son prix.

**EC-06 — Spot expiré (TTL dépassé)**
→ Même comportement que EC-05.
→ On ne vend jamais sur un prix potentiellement périmé.
→ L'affichage de prix dans le menu doit être le spot actuel valide ou grisé.

**EC-07 — Quick Sell avec qty = 1**
→ Contrôle [−] [1] [+] / 1. Bouton [−] désactivé.
→ Total fixe, pas de calcul dynamique nécessaire.

**EC-08 — Quick Sell qty = quantity totale**
→ L'item entier passe en sold. Pas de card résiduelle qty:0.
→ Identique à ME-02.

**EC-09 — Quick Sell confirmé sans spot valide**
→ Impossible — bouton "Confirm Sell at Melt" désactivé si spot absent.
→ Le spot est toujours requis pour Quick Sell.

**EC-10 — Spot expire pendant que le bottom sheet Quick Sell est ouvert**
→ Si le TTL expire pendant la session : afficher "Price updated" + nouveau total.
→ Si le proxy devient indisponible : griser le bouton confirm +
  "Spot unavailable. Use Sell with price."

**EC-11 — Quick Sell sur item Wishlist**
→ "Sell at melt" remplacé par "Mark as Bought" dans le menu.
→ "Sell with price" absent.
→ Quick Sell bottom sheet non accessible depuis Wishlist.

**EC-12 — Menu contextuel sur item sold**
→ "Share" uniquement. Toutes les actions de modification absentes.

**EC-13 — Split sur item quantity = 1**
→ "Split" absent du menu contextuel. Pas de sens d'extraire 1 sur 1.

**EC-14 — Split qty max = quantity - 1**
→ Le bouton [+] est bloqué à quantity - 1.
→ On ne peut pas extraire la totalité via Split.
→ Pour déplacer tout l'item → utiliser Move.

**EC-15 — Split qty = 0**
→ Bouton "Split" désactivé. Min : 1 unité extraite.

**EC-16 — Split depuis item sold**
→ Impossible — Split absent du menu item sold.

**EC-17 — Move (menu contextuel) vers l'emplacement courant**
→ Emplacement courant grisé dans la liste. Non sélectionnable.
→ Identique à ME-03.

**EC-18 — Move (menu contextuel) qty = 0**
→ Bouton "Move" désactivé. Identique à ME-04.

**EC-19 — Move (menu contextuel) qty = quantity totale**
→ L'item entier est déplacé, pas d'extraction inutile.
→ Identique à la règle DATA_MODEL.md Règle 13.

**EC-20 — Move depuis item sold**
→ Move absent du menu item sold.

**EC-21 — Aucune destination disponible pour Move**
→ Si l'utilisateur n'a qu'un seul Lab sans Deck et l'item est déjà dedans :
→ Message dans le bottom sheet :
  "No other destination available. Create a new Lab or Deck first."
→ Bouton "Create Deck" → flow création Deck.

**EC-22 — Share sans spot disponible**
→ La valeur affichée sur la card partagée est "—" ou "estimated".
→ Le partage n'est pas bloqué — c'est une action sociale.

**EC-23 — Share sur item sans photo**
→ La card partagée utilise le placeholder silhouette.
→ Qualité d'image identique — visuellement différente.

**EC-24 — Rate limit du share sheet iOS/Android**
→ Géré nativement par l'OS. Aucune gestion côté app.

---

## Ce qui N'EST PAS dans ce flow

| Feature | Pourquoi | Alternative |
|---|---|---|
| Photo en masse | Chaque photo = spécifique à 1 pièce physique | ItemDetail → Add photo |
| Vente cross-labs | Scope limité à l'emplacement courant | Répéter le flow depuis chaque Lab |
| Modification de la série | Immuable après création | Supprimer + recréer |
| Modification du métal | Immuable après création | Supprimer + recréer |
| Modification du family_key | Immuable après création (DATA_MODEL Règle 5) | — |

---

## Décisions de design validées

| Décision | Raison |
|---|---|
| Bouton "Modifier" dans le header | Plus clair qu'un mode sélection flottant |
| Modal de choix Items / Ce conteneur | Évite confusion entre modifier items ET conteneur |
| Scope limité à l'emplacement courant | Prévient erreurs cross-labs non intentionnelles |
| Breadcrumb visible pendant tout le flow | L'utilisateur sait toujours où il est |
| Qty individuelle par item dans Sell et Move | Respect de la philosophie object-first |
| Prix par unité ou par lot | Un vendeur ne pense pas toujours en prix unitaire |
| Réassignation partielle autorisée | L'utilisateur ne devrait pas tout réassigner pour corriger quelques items |
| Notes : Replace avec warning inline | Append est contre-intuitif, warning seul suffit |
| Supprimer : warning inline, pas double modal | Friction suffisante sans être frustrant |
| Photo exclue du mass edit | Spécifique à 1 pièce physique — pas de logique groupée |

---

*Dernière mise à jour : session design avril 2026*
*Propriétaire : Mounir*
