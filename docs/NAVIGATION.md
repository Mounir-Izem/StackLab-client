# NAVIGATION.md — StackLab MVP
> Structure de navigation complète. Toute déviation nécessite validation explicite du propriétaire.
> Stack technique : React Navigation v6, React Native + Expo.

---

## Architecture générale

```
RootNavigator (Stack)
├── OnboardingStack        → Premier lancement uniquement
└── MainNavigator (Tab)    → App principale
    ├── LabsTab
    ├── SpotTab
    └── DashboardTab
```

---

## Bottom Navigation — 3 Tabs

| Tab | Icône | Label |
|---|---|---|
| Labs | beaker ou stack icon | Labs |
| Spot | chart-line ou flame | Spot |
| Dashboard | pie-chart ou layout | Dashboard |

**Règles :**
- Tab actif : mis en évidence visuellement
- Pas de badge sur les tabs en MVP
- Settings accessible via icône gear top-right — présente sur tous les tabs

---

## Tab — Labs

```
LabsTab (Stack)
├── LabsHome               → Liste des Labs de l'utilisateur
├── LabDetail              → Contenu d'un Lab (Decks + items directs)
├── DeckDetail             → Contenu d'un Deck (sous-Decks + items)
└── ItemDetail             → Vue détail d'un item individuel
```

### LabsHome
- Liste des Labs créés
- Bouton "New Lab" si limite non atteinte (sinon modal bêta paywall)
- Empty state : CTA création du premier Lab

### LabDetail
- Header : nom du Lab + breadcrumb `Lab`
- Bouton **"Modifier"** : flow édition, vente, déplacement des items de ce Lab
- Gear icon : options du Lab uniquement (renommer, supprimer)
- Liste des Decks + items directs
- Bouton "+" : création d'item (modal)
- Bouton "New Deck" : création de Deck inline ou modal
- **Appui long sur une Lab card** (depuis LabsHome) → menu contextuel Lab

### DeckDetail
- Header : breadcrumb `Lab › Deck` (cliquable pour remonter)
- Bouton **"Modifier"** : flow édition, vente, déplacement des items de ce Deck
- Gear icon : options du Deck uniquement (renommer, déplacer, supprimer)
- Liste des sous-Decks + items
- Bouton "+" : création d'item (modal)
- Bouton "New Sub-Deck" si limite non atteinte
- **Appui long sur une Deck card** → menu contextuel Deck

### ItemDetail
- Header : breadcrumb `Lab › Deck › Item` (cliquable)
- Photo (grande) ou placeholder
- Tous les attributs de l'item
- Actions : Edit, Sell, Duplicate, Extract, Move, Delete
- Bouton "Add your photo" si pas de photo
- **Appui long sur une Item card** → menu contextuel Item

---

## Appui long — Menus contextuels

### Comportement général

**Déclencheur :** doigt maintenu immobile pendant 500ms sur une card.
**Animation :** card se soulève (scale 1.05) + vibration courte + ombre plus profonde.
**Fermeture :** tap en dehors du menu ou swipe down.

**Règles (EC-01 à EC-04) :**
- Si le doigt bouge pendant l'appui → le scroll prime, l'appui long est annulé
- Si la card est en animation → l'appui long est ignoré jusqu'à la fin
- Si un menu est déjà ouvert → tap ailleurs le ferme avant d'en ouvrir un autre
- Le menu ne sort jamais hors écran — il s'ouvre vers le haut si la card est en bas, vers le bas sinon

---

### Menu contextuel — Item card

```
┌──────────────────────────────────────┐
│ 📤 Share                             │
│                                      │
│ ⚡ Sell at melt  $34.82/unit  ←live  │
│    No price entry needed             │
│                                      │
│ 💰 Sell with price                   │
│    Set your own price                │
│                                      │
│ ✂️  Split                            │
│                                      │
│ 📦 Move                              │
│                                      │
│ 🗑️  Delete                 ← rouge  │
└──────────────────────────────────────┘
```

**Variantes selon le status et le contexte :**

Item `status: active`, quantity > 1 → menu complet ci-dessus.

Item `status: active`, quantity = 1 :
```
→ "Split" absent (pas de sens sur 1 unité)
→ "Sell at melt" et "Sell with price" présents
```

Item `status: wishlist` :
```
→ "Sell at melt" remplacé par "Mark as Bought"
→ "Sell with price" absent
→ "Split" absent
→ Share et Move et Delete présents
```

Item `status: sold` :
```
→ Share uniquement
→ Toutes les actions de modification absentes
```

Spot indisponible (offline ou proxy down) :
```
→ "Sell at melt" grisé
→ Sous-titre : "Spot unavailable"
→ "Sell with price" reste actif (EC-05, EC-06)
```

---

### Quick Sell — Bottom sheet

**Déclencheur :** tap sur "Sell at melt" dans le menu contextuel item.
**Prérequis :** spot valide disponible. Sinon l'option est grisée (EC-05, EC-06).

```
┌────────────────────────────────────────┐
│  Sell at melt                          │
│  Maple Leaf 2022 BU                    │
│                                        │
│  Qty : [−] [1] [+]  / 7               │
│                                        │
│  At spot : $34.82/unit                 │
│  Total   : $34.82     ← mis à jour    │
│             en temps réel selon qty    │
│                                        │
│  [Confirm Sell at Melt]                │
└────────────────────────────────────────┘
```

**Règles Quick Sell :**
- Le prix affiché est toujours le spot actuel valide ou l'option est grisée
- Si le spot expire pendant que le bottom sheet est ouvert → "Price updated" + nouveau total, ou griser si proxy down (EC-10)
- qty min : 1, qty max : quantity disponible
- Bouton [−] désactivé si qty = 1 (EC-07)
- Résultat : identique à `vendre(n, meltValue, parUnite:true)` de DATA_MODEL.md

**Différence Quick Sell vs Sell with price :**

| | Quick Sell ⚡ | Sell with price 💰 |
|---|---|---|
| Prix | Melt value automatique | Saisi par l'utilisateur |
| Devise | Même que les settings | Au choix |
| Par unité/lot | Toujours par unité | Au choix |
| Vitesse | 2 taps | Flow complet |
| Cas d'usage | Vendu au cours | Prix négocié |

---

### Split — Bottom sheet

**Déclencheur :** tap sur "Split" dans le menu contextuel item.
**Absent si :** quantity = 1 (EC-13).

```
┌────────────────────────────────────────┐
│  Split — Maple Leaf 2022 BU × 7       │
│                                        │
│  "Create a separate card to add        │
│   a photo or note"                     │
│                                        │
│  Extract : [−] [1] [+]  / 6           │
│  ← max = quantity - 1 (EC-14)         │
│                                        │
│  [Split]  ← désactivé si qty = 0      │
└────────────────────────────────────────┘
```

**Résultat :** card originale quantity - n, nouvelle card quantity n au même emplacement.

---

### Menu contextuel — Deck card

```
┌──────────────────────────────────┐
│ ✏️  Rename                       │
│ 📤 Share value                   │
│ 📦 Move Deck                     │
│ 🗑️  Delete Deck       ← rouge   │
└──────────────────────────────────┘
```

Animation au déclenchement : les couches de stack derrière la card s'écartent légèrement — le Deck "s'ouvre".

---

### Menu contextuel — Lab card (depuis LabsHome)

```
┌──────────────────────────────────┐
│ ✏️  Rename                       │
│ 📤 Share stack                   │
│ 📊 Export                        │
│ 🗑️  Delete Lab        ← rouge   │
└──────────────────────────────────┘
```

**Note :** Lab ne se déplace pas — c'est le conteneur racine (PRODUCT_DECISIONS.md 6.5). "Move" est absent du menu Lab.

---

### Share — Comportement

**Déclencheur :** tap sur "Share" dans n'importe quel menu contextuel.

Ce qui est généré et partagé :

```
Item share :
→ Screenshot de la card FUT avec skin actif
→ Texte pré-rempli :
  "My Maple Leaf 2022 BU — 7 oz silver
   Melt value: $243.74
   Tracked with StackLab 🥈"

Deck share :
→ Card visuelle du Deck
→ Texte : nom + valeur totale + nb items

Lab share :
→ Card Lab
→ Texte : nom + valeur totale + total oz
```

Si spot indisponible : valeur affichée avec mention "estimated" ou "—" (EC-22).
Si item sans photo : placeholder silhouette utilisé (EC-23).
Le share sheet natif iOS/Android gère le reste — pas de lib supplémentaire.

---

## Tab — Spot

```
SpotTab (Stack)
└── SpotHome               → Prix spot gold + silver en temps réel
```

### SpotHome
- Gold spot price
- Silver spot price
- Sélecteur devise (override temporaire de Settings)
- Sélecteur unité (oz / g / kg)
- Timestamp "Last updated X min ago"
- Indicateur offline si pas de connexion
- Auto-refresh toutes les 5 minutes (heures de marché)

---

## Tab — Dashboard

```
DashboardTab (Stack)
└── DashboardHome          → Vue financière du stack
```

### DashboardHome
- Valeur totale du stack (unrealized)
- Total investit (si purchase_price renseigné)
- Unrealized P&L global
- Total oz gold (fine oz)
- Total oz silver (fine oz)
- Maximum 1 insight simple MVP
- Screenshot prevention actif sur cet écran

---

## Modals — Inventaire complet

### Modal — Settings
**Déclencheur :** gear icon top-right (tous les tabs)
**Type :** bottom sheet ou modal plein écran

Contenu :
- Currency (USD | EUR | GBP | CAD | AUD)
- Weight unit (oz | g | kg)
- Cloud sync (toggle + flow activation si activé)
- **Last backup : X days ago** — indicateur toujours visible
  → Pulse amber si non backupé depuis > 7 jours
  → Vert si backupé aujourd'hui
- **Export JSON** (bouton)
  → Déclenche EH-16 si l'écriture échoue
- Backup reminder (toggle)
- **Transfer to new device** → guide iOS→Android (voir ci-dessous)
- Beta — "Join Premium Waitlist" (lien whitelist)
- Version app

**Timing du prompt de backup :**
```
Un prompt non bloquant apparaît dans ces situations :
1. Premier item créé → prompt obligatoire immédiat
2. AppState passe en "background" → si modifications depuis le dernier export
   (comparaison updated_at des items vs timestamp du dernier export)
3. Ouverture de l'app → si dernier export > 7 jours ET ≥ 1 item en base
```

### Modal — Transfer to new device (iOS→Android ou inverse)

**Déclencheur :** bouton "Transfer to new device" dans Settings
**Type :** modal plein écran — guide étapes

```
Step 1 — Export
"Let's get your data ready for transfer."
→ Bouton "Export my data" → déclenche l'export JSON
→ Confirmation : "File saved. Share it or store it somewhere you can access
                  from your new device."
→ Share sheet natif → envoyer vers email, Drive, Dropbox, etc.

Step 2 — Nouveau device
"On your new device:"
→ Install StackLab
→ Open Settings → Import JSON
→ Select your export file

Step 3 — Confirmation
"Done! Tap 'Import' to restore your stack."
```

**Note :** iCloud et Google Drive ne se synchronisent pas entre eux.
Ce flow est le seul moyen fiable de transférer entre écosystèmes différents.

### Modal — Cloud Sync Activation
**Déclencheur :** toggle Cloud Sync dans Settings
**Type :** modal plein écran étapes

Étapes :
```
1. Explication : "Your data will be encrypted before leaving your device."
2. Génération passphrase 12 mots — screenshot prevention ACTIF
3. Confirmation : "I have written down my recovery phrase"
4. Email optionnel : "Add a backup email (optional)"
5. Sync activé
```

### Modal — Création d'item
**Déclencheur :** bouton "+" dans LabDetail ou DeckDetail
**Type :** modal plein écran — flow guidé en 3 écrans
**Référence :** voir WIREFRAME_CREATION.md pour le détail complet, edge cases et points d'attention.

Écran 1 — L'objet :
```
Metal        : Gold | Silver (sélecteur visuel avec animation)
Série        : texte libre + autocomplete depuis AUTOCOMPLETE_SUGGESTIONS
Type/Shape   : auto-rempli depuis la série, chips éditables
               (coin | bar | token | bust | custom)
               → Custom : champ shape_description apparaît
Mint         : optionnel, caché par défaut
```

Validation : Metal + Série obligatoires. Next bloqué avec message si manquant.

Écran 2 — Le lot :
```
Quantité     : boutons −/+ ET saisie directe (pas de clic 100×)
Année        : "All identical" → champ simple
               "Mix years/finish" → matrice Année × Strike Finish × Quantité
               Compteur : N/total assigné — warning discret si écart
Strike finish: intégré dans la matrice si mode Mix
               Sélecteur simple si mode "All identical"
```

Validation en mode Mix : Next bloqué tant que total assigné ≠ quantité.

Écran 3 — Physique + Confirmation :
```
Poids        : numérique + oz | g | kg
Pureté       : dropdown uniquement (pas de saisie libre)
Poids fin    : calculé automatiquement, affiché en vert
Récap        : série, quantité, poids total, fine oz total
Bouton       : "Create" (pas "Create lot")
```

Post-création si premier item : prompt export JSON.

### Modal — Modifier (point d'entrée édition groupée)
**Déclencheur :** bouton "Modifier" dans le header de LabDetail ou DeckDetail
**Type :** modal bottom sheet
**Référence :** voir WIREFRAME_MASS_EDIT.md pour le flow complet.

Contenu :
```
"Que voulez-vous modifier ?"
Contexte affiché : nom du Lab/Deck courant

→ [ Items ]          → sélection et action sur des items de cet emplacement
→ [ Ce Deck/Lab ]    → renommer, déplacer ou supprimer le conteneur courant
```

Scope : **parent direct et enfants directs uniquement.**
On ne peut pas modifier un Lab depuis un DeckDetail — il faut remonter au Lab via le breadcrumb.

### Modal — Sélection items (via Modifier → Items)
**Type :** écran plein écran

```
Header : "Sélectionner des items"
Breadcrumb visible en haut — non navigable pendant la sélection
Sous-titre : N items · M unités au total

Liste des items de cet emplacement avec checkboxes
Bouton "Continuer" : grisé si 0 sélection, actif dès 1 sélection

→ Écran choix d'action
```

### Modal — Choix d'action (après sélection items)
**Type :** écran

```
Header : "N items sélectionnés"
Breadcrumb visible
Liste des items sélectionnés (noms + qty)

Actions disponibles :
→ Vendre
→ Déplacer
→ Modifier un champ
→ Réassigner les années
→ Supprimer

Bouton "← Modifier la sélection" en bas
```

### Modal — Vente (Sell)
**Déclencheur :** action "Vendre" depuis le choix d'action, ou bouton "Sell" depuis ItemDetail
**Type :** écran
**Référence :** voir WIREFRAME_MASS_EDIT.md pour le flow complet et les edge cases.

```
Header : "Vendre" + breadcrumb

Sous-titre : "Définissez la quantité à vendre. Les unités restantes resteront actives."

Pour chaque item sélectionné :
┌────────────────────────────────────┐
│  [Thumb] Nom de l'item             │
│          × N disponibles           │
│                                    │
│  Vendre   [−] [qty] [+]  / max     │
│                                    │
│  Prix de vente (optionnel)         │
│  [ montant ] [ USD ▼ ]             │
│  [ Par unité ▼ / Par lot ]         │
└────────────────────────────────────┘

Résumé dynamique en bas :
"Vente : X unités. Y unités resteront actives."

[Confirmer la vente]
[← Retour]
```

Résultat : pour chaque item, `quantity -= n`, nouvel item `status:sold` créé.

### Modal — Déplacer (Move)
**Déclencheur :** action "Déplacer" depuis le choix d'action, ou bouton "Move" depuis ItemDetail
**Type :** écran

```
Header : "Déplacer" + breadcrumb

Pour chaque item sélectionné :
┌────────────────────────────────────┐
│  [Thumb] Nom de l'item             │
│          × N disponibles           │
│                                    │
│  Déplacer  [−] [qty] [+]  / max    │
└────────────────────────────────────┘

Destination :
Liste Labs et Decks accessibles (tous sauf emplacement courant)

Résumé dynamique :
"Déplacer X unités vers [destination]."

[Confirmer le déplacement]
[← Retour]
```

Résultat : N unités extraites vers la destination, `quantity` d'origine diminue.

### Modal — Modifier un champ (Edit field)
**Déclencheur :** action "Modifier un champ" depuis le choix d'action
**Type :** bottom sheet

```
"Modifier un champ"
"Les modifications s'appliquent à N items sélectionnés."

Champ à modifier : [dropdown]
  → Strike finish : chips de sélection
  → Weight : numérique + unité
  → Purity : dropdown
  → Mint : texte libre
  → Purchase price : numérique + devise
  → Notes : textarea avec warning Replace

Note : "Photo non modifiable en masse — item par item uniquement."

Si valeurs différentes entre items : "Items had different values — overwrites all."

[Appliquer à N items]  (grisé si aucune valeur choisie)
[Annuler]
```

### Modal — Réassigner les années
**Déclencheur :** action "Réassigner les années" depuis le choix d'action
**Type :** écran

```
"Réassigner les années"
"N items · M unités au total"

Matrice Année × Strike Finish × Quantité :
[ Année ] [ Finish ]  [ Qty ] [ × ]
[ Année ] [ Finish ]  [ Qty ] [ × ]
+ Add combination

Compteur : X / M assignés
→ ok si X ≤ M (réassignation partielle autorisée)
→ warn si X > M (over by N)

"Unités non assignées : conservent leur année et finish actuels."

[Appliquer les changements]
[← Retour]
```

### Modal — Wishlist "Acheté"
**Déclencheur :** bouton "Bought" sur un item Wishlist
**Type :** modal

```
→ "How many?" (quantité)
→ Sélection du Lab de destination
→ "At what price?" (vide par défaut)
→ Confirmation
```

### Modal — Paywall bêta
**Déclencheur :** dépassement de limite free
**Type :** modal

Contenu :
```
"StackLab is currently in beta.
This feature will be available in the premium version.
Want to know more or give feedback?"
→ [Contact us]   [Not now]
```

### Modal — Whitelist Premium
**Déclencheur :** modal paywall bêta ou accès depuis Settings
**Type :** modal

Contenu :
```
"Be first. Get 20% off forever."
"Join the waitlist for StackLab Premium."
→ Email field
→ [Join Waitlist]
```

### Modal — Confirmation Suppression
**Déclencheur :** action Delete sur tout objet
**Type :** modal confirmation

Contenu selon le contexte :
- Item actif : "Delete this item? This cannot be undone."
- Deck non vide : "This Deck contains X items and Y sub-decks. They will be moved to [parent]. Delete anyway?"
- Lab non vide : "This Lab contains items. Move them to another Lab or delete everything."

### Modal — Export JSON
**Déclencheur :** bouton Export dans Settings, ou prompt automatique post-modification
**Type :** modal avec avertissement

Contenu :
```
"This file contains your complete stack data in plain text.
Store it securely. Do not share it."
→ [Export]   [Cancel]
```

---

## Navigations spéciales

### Breadcrumb
Présent sur LabDetail, DeckDetail, ItemDetail.
Chaque niveau est cliquable — permet de remonter directement sans faire "retour" multiple.

```
Standard › Silver › DCA › [item]
```

Implémentation : composant dédié, affiché dans le header React Navigation.

### Offline indicator
Affiché en permanence dans SpotTab si offline.
Affiché discrètement dans Dashboard si spot non rafraîchi.

### Screenshot prevention
Actif sur :
- Modal Cloud Sync Activation (étape passphrase)
- DashboardHome

---

## Transitions

| Navigation | Transition |
|---|---|
| Tab → Tab | Aucune animation (switch instantané) |
| Stack push (Lab → Deck → Item) | Slide horizontal (défaut React Navigation) |
| Modal | Slide vertical depuis le bas |
| Retour | Inverse de l'entrée |

---

## Empty states — CTA obligatoires

| Écran | Empty state |
|---|---|
| LabsHome sans Lab | "Create your first Lab" + bouton |
| LabDetail sans item | "Add your first item" + bouton "+" |
| DeckDetail sans item | "Add items to this Deck" + bouton "+" |
| SpotTab offline | "Last known price — connect to refresh" |
| Dashboard sans items | "Add items to see your portfolio value" |

---

## Ce qui n'est pas dans ce document

- Design visuel des composants → post-MVP design system
- Animations custom → post-MVP
- Gestures avancées (swipe to delete, etc.) → post-MVP
- Navigation tab premium exclusif → post-MVP

---

*Dernière mise à jour : session analyse produit avril 2026*
*Propriétaire : Mounir*
