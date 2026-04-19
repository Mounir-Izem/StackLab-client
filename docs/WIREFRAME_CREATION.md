# WIREFRAME_CREATION.md — Flow création d'item
> Documentation du flow de création d'item (3 écrans).
> Inclut les edge cases, points d'attention, et décisions de design.
> À lire avant d'implémenter la Phase 2 (ROADMAP.md).

---

## Vue d'ensemble du flow

```
Écran 1 — L'objet    →    Écran 2 — Le lot    →    Écran 3 — Physique + Create
(Metal, Série, Type)      (Quantité, Années,         (Poids, Pureté, Récap)
                          Strike finish)
```

**Principe :** chaque écran est autonome et validé avant de passer au suivant. L'utilisateur ne peut jamais avancer avec des données manquantes obligatoires.

---

## Écran 1 — L'objet

### Ce qui s'affiche

**Metal** — Deux cards visuelles avec logo StackLab :
- Une en doré (Gold / XAU)
- Une en argenté (Silver / XAG)
- Légère animation de flottement pour signaler qu'ils "vivent"
- Sélection : la card choisie s'illumine (effet néon violet), l'autre se grise

**Série** — Champ texte avec suggestions autocomplete :
- Placeholder : "e.g. Maple Leaf, Krugerrand..."
- Suggestions filtrées en temps réel sous le champ (chips sélectionnables)
- Sélection d'une chip auto-remplit le champ et auto-sélectionne le type

**Type** — Auto-rempli depuis la série (Maple Leaf → Coin automatiquement) :
- Affiché comme chips éditables : Coin · Bar · Token · Bust · Custom
- L'utilisateur peut corriger si l'auto-remplissage est faux
- Si Custom sélectionné → champ libre "Describe the shape" apparaît

**Mint** — Champ optionnel caché par défaut :
- Toggle discret "+ Add mint (optional)"
- Champ texte libre si ouvert
- Ne bloque jamais le Next

### Champs obligatoires / optionnels

| Champ | Statut | Bloque Next ? |
|---|---|---|
| Metal | Obligatoire | OUI |
| Série | Obligatoire | OUI |
| Type | Auto-rempli, modifiable | NON |
| Mint | Optionnel | NON |

### Validation

Le bouton **Next** est actif uniquement si Metal ET Série sont sélectionnés.

Si l'utilisateur clique Next sans avoir rempli un champ obligatoire :
```
Banner inline (non bloquant, visible) :
"Please select: metal, series before continuing."
```
Le banner disparaît dès que les champs manquants sont remplis.

### Edge cases Écran 1

**E1-01 — Série saisie librement (hors suggestions)**
L'utilisateur tape une série qui n'est pas dans l'autocomplete.
→ Accepté sans restriction. Le `family_key` est généré depuis le texte libre.
→ Le type reste sur la dernière valeur sélectionnée (défaut : Coin).
→ Aucun warning.

**E1-02 — Nom de série très long**
L'utilisateur tape un nom de 80+ caractères.
→ Accepté. Dans le récap (Écran 3), le nom est tronqué avec ellipsis si > 30 caractères.
→ Le `family_key` slugifie les 50 premiers caractères.

**E1-03 — Custom sans description**
L'utilisateur sélectionne "Custom" mais laisse le champ description vide.
→ Non bloquant en MVP. Le champ `shape_description` sera null en base.
→ Ajouter un placeholder instructif : "Skull, irregular ingot, custom shape..."

**E1-04 — Changement de metal après avoir saisi la série**
L'utilisateur sélectionne Gold, choisit "Maple Leaf", puis change pour Silver.
→ La série reste sélectionnée. Le `family_key` sera régénéré avec le nouveau métal.
→ Pas de warning — comportement attendu.

**E1-05 — Caractères spéciaux dans la série**
L'utilisateur tape "DC Comics™ Batman #1"
→ Accepté. Le slugifier retire les caractères spéciaux pour le `family_key`.
→ Le nom affiché dans l'UI reste intact.

**E1-06 — Série effacée après sélection depuis autocomplete**
L'utilisateur sélectionne "Maple Leaf" puis efface manuellement le champ.
→ `series` repasse à null.
→ Le bouton Next se bloque immédiatement.
→ Pas de message tant que l'utilisateur n'a pas cliqué Next.

**E1-07 — Banners de validation distincts**
L'utilisateur clique Next avec uniquement le métal manquant :
→ Banner : "Please select: metal before continuing."
L'utilisateur clique Next avec uniquement la série manquante :
→ Banner : "Please select: series before continuing."
Les deux manquants :
→ Banner : "Please select: metal, series before continuing."

**⚠ PA-07 — Mint non lié au family_key**
Le mint est un attribut libre sur l'item. Deux Maple Leafs de mints différents (RCM vs Perth) peuvent coexister avec le même family_key — c'est le comportement voulu. Le mint n'influence pas le regroupement.

---

## Écran 2 — Le lot

### Ce qui s'affiche

**Tip banner** (non fermable) :
```
💡 You can add 50 Maple Leafs at once.
   Use the table below to distribute by year and strike finish.
```

**Quantité** — Combinaison de trois contrôles :
- Bouton − (min: 1)
- Valeur affichée en grand
- Bouton +
- **Champ texte numérique direct** — l'utilisateur peut taper directement la quantité sans cliquer 100 fois. Le champ et les boutons sont synchronisés en temps réel.

**Mode de distribution** — Toggle entre deux modes :
- **"All identical"** → simple : un champ année optionnel + un sélecteur strike finish optionnel
- **"Mix years / finish"** → matrice complète

**Matrice (mode Mix)** :
```
Année    | Strike finish  | Qty | ×
2022     | BU             |  7  | ×
2022     | Proof          |  5  | ×
2023     | BU             | 12  | ×
+ Add combination
─────────────────────────────────────
32 / 50 assigned  ⚠ 18 remaining
```

**Counter de distribution** :
- `Total / qty` affiché en permanence
- Si assigné = qty → vert ✓ "All N items assigned"
- Si assigné < qty → orange ⚠ "X remaining"
- Si assigné > qty → orange ⚠ "X over by N"
- Bouton Next grisé tant que total ≠ qty en mode Mix

### Champs obligatoires / optionnels

| Champ | Statut | Bloque Next ? |
|---|---|---|
| Quantité | Obligatoire (défaut 1) | NON — défaut valide |
| Mode distribution | Obligatoire | NON — "All identical" par défaut |
| Année (mode simple) | Optionnel | NON |
| Strike finish (mode simple) | Optionnel | NON |
| Distribution matrice | Obligatoire si mode Mix | OUI — total doit = qty |

### Edge cases Écran 2

**E2-01 — Quantité saisie : valeur 0 ou négative**
L'utilisateur tape 0 ou -5 dans le champ quantité.
→ Forcé à 1 automatiquement.
→ Pas de message — le champ se corrige silencieusement.

**E2-02 — Quantité saisie : valeur non entière**
L'utilisateur tape 3.7.
→ Arrondi à l'entier inférieur (3).
→ Champ mis à jour silencieusement.

**E2-03 — Quantité saisie : valeur très grande (ex: 10000)**
Pas de limite artificielle en MVP. 10000 Maple Leafs = valid.
→ Attention : la matrice de distribution avec 10000 items répartis sur 20 années peut être longue à saisir. L'utilisateur choisit.

**E2-04 — Changement de qty après distribution en mode Mix**
L'utilisateur assigne 50 items (10×2022, 40×2023), puis change qty à 30.
→ Counter passe immédiatement à "50 / 30 assigned ⚠ over by 20"
→ Bouton Next se grise
→ L'utilisateur doit ajuster ses lignes pour revenir à 30
→ Pas de redistribution automatique — l'utilisateur contrôle

**E2-05 — Suppression d'une ligne avec items assignés**
L'utilisateur a 50 items assignés, supprime une ligne de 15.
→ Counter passe à "35 / 50 ⚠ 15 remaining"
→ Bouton Next se grise
→ L'utilisateur doit réassigner les 15 manquants

**E2-06 — Même combinaison Année + Strike finish en double**
L'utilisateur crée deux lignes "2022 BU".
→ En MVP : aucune vérification de doublon — les deux lignes coexistent.
→ Le résultat en base sera deux groupes d'items identiques (comportement acceptable).
→ Post-MVP : warning discret "Duplicate combination detected".

**⚠ Point d'attention E2-06** : Ne pas bloquer en MVP. Ajouter en backlog.

**E2-07 — Année invalide**
L'utilisateur tape 1800 ou 2099.
→ En MVP : aucune validation de plage. Accepté.
→ Post-MVP : warning si année < 1800 ou > année courante + 2.

**E2-08 — Mode Mix avec 0 lignes**
L'utilisateur passe en mode Mix et supprime toutes les lignes.
→ Counter affiche "0 / N ⚠ N remaining"
→ Bouton Next grisé
→ Le bouton "+ Add combination" reste toujours visible

**E2-09 — Switch de mode Mix → All identical après distribution**
L'utilisateur a rempli la matrice, puis bascule en "All identical".
→ La matrice est masquée mais les données sont conservées en mémoire.
→ Si l'utilisateur rebascule en "Mix", il retrouve ses lignes intactes.
→ Le mode actif au moment du Next est celui qui est pris en compte.

**E2-10 — Lignes avec combinaisons partielles**
Ligne avec seulement une année, sans finish → accepté, `strike_finish` = null.
Ligne avec seulement un finish, sans année → accepté, `year` = null.
Ligne avec ni année ni finish, juste une quantité → accepté — les deux champs sont optionnels.

**E2-11 — Quantité augmentée avec +  après saisie directe**
L'utilisateur tape 100 directement, puis clique +.
→ Quantité passe à 101. Les boutons et le champ sont toujours synchronisés.

**⚠ PA-08 — La matrice crée des items distincts en base**
Exemple : 50 Maple Leafs avec 3 lignes (2022/BU/10, 2022/Proof/15, 2023/BU/25)
→ 3 items créés en SQLite avec quantity 10, 15, 25. **Pas 50 lignes individuelles.**
C'est le comportement voulu — un item = un lot de même type.
Le counter ne bloque pas la saisie — il informe seulement. Le seul blocage est sur le bouton Next.

---

## Écran 3 — Physique + Confirmation

### Ce qui s'affiche

**Poids** — Champ numérique + sélecteur d'unité (oz / g / kg)
- Défaut : 1.000 oz (pré-rempli depuis les suggestions si série connue)

**Pureté** — Dropdown uniquement (pas de champ libre) :
- .9999 — 24k fine
- .999 — 24k
- .9583 — 23k
- .9167 — 22k (American Eagle)
- .925 — Sterling silver
- .916 — 22k Sovereign
- .900 — 90% junk silver
- .800 — 80%

**Poids fin** — Calculé automatiquement, affiché en vert :
```
Fine weight (auto)    0.9999 oz fine
```

**Récap compact** :
```
Series      Maple Leaf · Silver · Coin
Quantity    50 items
Total wt    50.000 oz
Fine oz     49.995 oz fine
```

**Bouton** : `Create` (pas "Create lot")

### Champs obligatoires / optionnels

| Champ | Statut | Bloque Create ? |
|---|---|---|
| Poids | Obligatoire | OUI — ne peut pas être 0 |
| Pureté | Obligatoire (défaut .9999) | NON — défaut valide |

### Edge cases Écran 3

**E3-01 — Poids = 0**
L'utilisateur efface le champ poids et laisse vide.
→ Le bouton Create se grise.
→ Fine weight affiche "— oz fine".

**E3-02 — Poids très petit (ex: 0.001 oz)**
Poids minimum : 0.001 oz. Valide.
→ Fine weight calculé et affiché normalement.

**E3-03 — Changement d'unité**
L'utilisateur saisit "31.1" en grammes (= 1 oz).
→ La conversion se fait en temps réel : poids fin affiché en oz fine.
→ Le récap affiche le total en oz (unité de référence interne).

**E3-04 — Pureté custom non listée**
Le dropdown ne propose pas de champ libre en MVP.
→ Si la pureté de l'objet n'est pas dans la liste : utiliser la valeur la plus proche.
→ Post-MVP : champ numérique libre avec validation 0.001 < purity ≤ 1.000.

**E3-05 — Quantité très grande × poids large**
L'utilisateur crée 1000 items × 1 kg chacun.
→ Poids total = 32 150.7 oz, valeur potentiellement en millions.
→ Vérifier l'affichage sur mobile — risque d'overflow dans le récap.
→ Utiliser un format condensé si la valeur dépasse 6 chiffres (ex: "$2.1M" au lieu de "$2,100,000.00").

---

## Points d'attention généraux

**⚠ PA-01 — Vente partielle post-création**
Si l'utilisateur crée 50 items et en vend 3, il utilise le bouton "Modifier" dans LabDetail ou DeckDetail → sélectionne l'item concerné → Vendre → choisit la quantité (3 sur 7 par exemple). Le flow est limité à l'emplacement courant. Voir WIREFRAME_MASS_EDIT.md Écran D.

**⚠ PA-02 — Photo par item uniquement**
La photo ne peut pas être assignée en masse. C'est le seul attribut qui nécessite une action item par item. L'utilisateur est informé de ça dans l'empty state de la card (icône nuage / placeholder) après création.

**⚠ PA-03 — family_key généré une seule fois**
Le `family_key` est généré à la création et ne peut jamais être modifié. Si l'utilisateur fait une faute de frappe dans le nom de série, il doit supprimer l'item et le recréer. Voir DATA_MODEL.md Règle 5.

**⚠ PA-04 — Création en mode offline**
Si l'utilisateur est offline lors de la création, les items sont créés normalement en SQLite local. Le spot price n'est pas disponible → la valeur actuelle ne s'affiche pas sur les cards jusqu'au retour en ligne.

**⚠ PA-05 — Gestion du purchase_price**
Le flow de création actuel ne demande pas le prix d'achat. C'est volontaire — il est ajouté dans ItemDetail post-création. L'absence de prix d'achat ne bloque pas la création. Sans prix d'achat, le P&L n'est pas affiché.

**⚠ PA-06 — Limite free (3 Labs, 3 Decks)**
La modal de création d'item est accessible depuis LabDetail ou DeckDetail. Si l'utilisateur est en free et a atteint la limite de Labs, il ne peut pas créer de nouveau Lab — mais peut créer des items dans ses Labs existants sans restriction. Les items sont illimités en free.

---

## Décisions de design validées

| Décision | Raison |
|---|---|
| Quantité : boutons +/− ET champ texte direct | Cliquer 100× pour qty=100 n'est pas acceptable |
| Type auto-rempli depuis série | Le type est rarement différent de celui de la série |
| Mint optionnel caché | Réduire la charge cognitive — la majorité des stackers n'ont pas besoin du mint |
| Matrice Année × Finish × Qty | Seule façon de gérer des lots hétérogènes sans multiplier les créations |
| Distribution non automatique lors du changement de qty | L'utilisateur garde le contrôle — pas de redistribution surprise |
| Doublon Année+Finish : pas bloquant en MVP | Complexité non justifiée pour un cas < 5% |
| Pureté : dropdown uniquement | Évite les erreurs de saisie (0.9999 vs .9999 vs 99.99%) |
| Bouton "Create" sans "lot" | Plus direct, moins intimidant |

---

*Dernière mise à jour : session design avril 2026*
*Propriétaire : Mounir*
