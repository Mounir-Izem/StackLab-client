# DATA_MODEL.md — StackLab MVP
> Schéma de données de référence. Toute déviation nécessite validation explicite du propriétaire.
> Les champs marqués [RESERVED] existent en base mais ne sont pas exposés dans l'UI MVP.
> Paradigme : fonctionnel côté React Native (types + fonctions pures), POO côté Java Spring Boot.

---

## Entités principales

### Item

```
Item {
  id                      UUID          PK, généré côté client
  lab_id                  UUID          FK → Lab (toujours présent, même si dans un Deck)
  deck_id                 UUID?         FK → Deck (null si directement dans le Lab)

  // Identification
  name                    STRING        Nom de série saisi librement par l'utilisateur
  family_key              STRING        Slug généré depuis name + metal. Format: {slug-série}-{metal}. Ex: maple-leaf-silver
  metal                   ENUM          gold | silver
  mint                    STRING?       Optionnel. Saisi librement. Ex: Royal Canadian Mint, Perth Mint
  shape                   ENUM          coin | bar | token | bust | custom
  shape_description       STRING?       Champ libre si shape = custom

  // Métriques physiques
  weight_oz               DECIMAL       Poids brut en troy oz (converti automatiquement depuis weight_unit_input)
  weight_unit_input       ENUM          oz | g | kg (unité saisie par l'utilisateur)
  purity                  DECIMAL       Ex: 0.999, 0.9999, 0.925, 0.916, 0.800
  // fine_weight_oz est calculé — jamais stocké : weight_oz × purity

  // Attributs collection
  year                    INTEGER?      Optionnel
  strike_finish           ENUM?         BU | proof | reverse_proof | antique | matte | specimen | privy
  grade                   STRING?       [RESERVED] Ex: MS70, PF70
  notes                   TEXT?

  // Financier — items actifs
  quantity                INTEGER       Min: 1. Jamais null.
  purchase_price          DECIMAL?      Prix total payé (optionnel)
  purchase_price_unit     STRING?       Devise au moment de l'achat. Ex: USD, EUR, GBP
  purchase_exchange_rate  DECIMAL?      Taux de change au moment de l'achat vs devise d'affichage
  purchase_date           DATE?

  // Financier — items Wishlist uniquement
  observed_price          DECIMAL?      Prix constaté sur le marché (premium inclus). Fortement incité via icône nuage si absent.

  // Cycle de vie
  status                  ENUM          active | sold | wishlist
  sold_date               DATE?         Renseigné si status = sold
  sold_price              DECIMAL?      Prix de vente du lot (total ou par unité selon saisie utilisateur)

  // Média
  photo_url               STRING?       Chemin local ou URL si cloud sync activé

  // Localisation physique
  location                STRING?       [RESERVED] coffre_maison | coffre_bancaire | tiers | custom

  // Métadonnées
  created_at              TIMESTAMP
  updated_at              TIMESTAMP
}
```

**Comportements de Item :**
```
créer(metal, name, shape, poids, pureté, année?, finish?, quantité)
  → shape auto-rempli depuis la suggestion autocomplete si disponible
modifierAttributs(champs)
ajouterPhoto(uri)
supprimerPhoto()
extraire(n)
  → crée un nouvel item identique avec quantity:n, UUID distinct
  → item original : quantity -= n
  → usage : individualiser des unités pour photo séparée ou note spécifique
vendre(n, soldPrice?, parUnite)
  → item original : quantity -= n
  → crée un nouvel item status:sold, quantity:n, sold_price calculé
  → parUnite:true → sold_price = soldPrice × n
  → parUnite:false → sold_price = soldPrice (prix total du lot vendu)
déplacer(n, lab, deck?)
  → extrait n unités vers la destination (lab + deck optionnel)
  → item original : quantity -= n
  → si n = quantity totale : l'item entier est déplacé, pas d'extraction
reassignerAnnees(matrice)
  → matrice : [{year, finish, qty}]
  → réassigne les attributs year/finish sur N unités
  → unités non couvertes par la matrice conservent leurs valeurs actuelles
dupliquer()                → crée un nouvel item identique avec nouvel UUID, quantity identique
calculerPoidsFinOz()       → weight_oz × purity (jamais stocké)
calculerValeurActuelle()   → weight_oz × quantity × purity × spotPrice[metal]
calculerUnrealizedPnL()    → si purchase_price non null
calculerEcartWishlist()    → observed_price − valeur_melt_actuelle (Wishlist uniquement)
supprimer(n?)
  → sans n : suppression physique totale avec confirmation (items active uniquement)
  → avec n : supprime n unités, quantity -= n
marquerAcquis()            → depuis Wishlist : duplique vers Lab cible, apparence change
```

---

### Lab

```
Lab {
  id              UUID      PK, généré côté client
  user_id         UUID?     FK → User (null si backend non activé)
  name            STRING    Nom libre (modifiable par l'utilisateur)
  type            ENUM      standard | premium | wishlist
  cover_photo_url STRING?   Chemin local ou URL distante (null si absent)
  position        INTEGER   Ordre d'affichage
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
}
```

**Comportements de Lab :**
```
créer(type, name)
renommer(name)
ajouterDeck(deck)
supprimerDeck(deck)
ajouterItem(item)
déplacerItem(item, destination)
calculerValeurTotale()     → SUM current_value des items actifs dans ce Lab
calculerOzTotales()        → SUM (weight_oz × quantity) des items actifs dans ce Lab
```

---

### Deck

```
Deck {
  id              UUID      PK, généré côté client
  lab_id          UUID      FK → Lab (toujours présent — même pour les sous-decks)
  parent_id       UUID?     FK → Deck (null si rattaché directement au Lab)
  name            STRING    Nom libre
  cover_photo_url STRING?   Chemin local ou URL distante (null si absent)
  position        INTEGER   Ordre d'affichage dans le parent
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
}
```

**Comportements de Deck :**
```
créer(name, lab, parent?)
renommer(name)
déplacer(nouveauParent)
ajouterItem(item)
retirerItem(item)
ajouterSousDeck(deck)
calculerValeurTotale()     → SUM current_value des items actifs dans ce Deck et ses sous-Decks
calculerOzTotales()        → SUM (weight_oz × quantity) des items actifs récursivement
```

**Règles de profondeur :**

| | Free | Premium |
|---|---|---|
| Decks par Lab | 3 | Illimité |
| Profondeur | 2 niveaux | 3 niveaux |

Navigation : breadcrumb obligatoire — `Lab › Deck › Sous-Deck › Item`

---

### StackSnapshot

Capture quotidienne silencieuse de la valeur du stack. Stockée localement sans opt-in.
L'UI d'affichage (graphe historique) est post-MVP — mais la capture commence dès le MVP pour ne pas perdre l'historique.

```
StackSnapshot {
  id                UUID        PK, généré côté client
  date              DATE        Date du snapshot (1 par jour max)
  total_value       DECIMAL     Valeur totale du stack ce jour
  total_oz_gold     DECIMAL     Total fine oz gold
  total_oz_silver   DECIMAL     Total fine oz silver
  spot_gold         DECIMAL     Prix spot gold au moment du snapshot
  spot_silver       DECIMAL     Prix spot silver au moment du snapshot
  currency          STRING      Devise utilisée pour total_value
  created_at        TIMESTAMP
}
```

**Règles :**
- 1 snapshot par jour maximum — si un snapshot existe déjà pour la date du jour, on ne crée pas de doublon
- Déclenché silencieusement en background une fois par jour quand l'app est ouverte
- Déclenché uniquement si au moins 1 item actif existe
- Déclenché uniquement si spot disponible (pas offline)
- Conservé sans limite de durée en MVP

---



```
User {
  id            UUID        Dérivé cryptographiquement depuis la passphrase utilisateur
  email         STRING?     Optionnel, chiffré AES-256 en base. Jamais en clair.
  created_at    TIMESTAMP
  // Pas de mot de passe — auth via passphrase 12 mots (BIP39-style)
  // La passphrase n'est jamais stockée — uniquement l'UUID dérivé
  // L'email sert uniquement à envoyer la passphrase en cas de perte
}
```

---

### WaitlistEntry (backend — phase bêta uniquement)

```
WaitlistEntry {
  id          UUID
  email       STRING    Chiffré AES-256 en base. Jamais en clair.
  created_at  TIMESTAMP
  promo_code  STRING?   Généré au lancement premium
  converted   BOOLEAN   false par défaut
}
```

**Règles :**
- Email chiffré côté serveur — même règle que User.email
- `converted = true` quand l'utilisateur active un abonnement payant
- Pas de lien avec l'entité User — la whitelist est anonyme par défaut

---

### Settings (stocké localement)

```
Settings {
  currency              ENUM      USD | EUR | GBP | CAD | AUD  (défaut: USD)
  weight_unit           ENUM      oz | g | kg                   (défaut: oz)
  cloud_sync            BOOLEAN   false par défaut
  backup_reminder       BOOLEAN   true par défaut
  hide_values           BOOLEAN   false par défaut
  subscription_status   ENUM      free | monthly | annual       (défaut: free)
  subscription_expiry   DATE?     null si free
  onboarding_completed  BOOLEAN   false par défaut
  onboarding_step       INTEGER   0 par défaut (0 = Privacy & Backup choice, 1 = Labs, 2 = First Item, 3 = Export completed)
}
```

---

## Règles métier — NON NÉGOCIABLES

### Règle 1 — Quantity
`quantity` est toujours un entier ≥ 1. Un item avec quantity: 5 représente 5 unités identiques.

### Règle 2 — Poids
Le poids est toujours stocké en **troy oz** en base, quelle que soit l'unité saisie.
```
1 oz  = 1 troy oz
1 g   = 0.0321507 troy oz
1 kg  = 32.1507 troy oz
```

### Règle 3 — Status
Un item `status: sold` n'est jamais supprimé physiquement. Il reste en base, invisible dans les Labs actifs.

### Règle 4 — Prix inconnu
Si `purchase_price` est null, le P&L n'est jamais affiché, estimé ou interpolé. L'item est inclus dans la valeur totale (melt value) mais exclu des calculs P&L.

### Règle 5 — family_key

Le `family_key` est généré automatiquement côté client depuis le nom de série saisi + le métal.
Format : `{slug-série}-{metal}`. Ex: `maple-leaf-silver`, `american-eagle-gold`.
Le mint n'est pas dans le family_key — c'est un attribut optionnel séparé sur l'item.
Le `family_key` est un identifiant de groupe — plusieurs items peuvent partager le même family_key.
En cas de collision entre deux séries distinctes → suffixe numérique automatique. Ex: `lunar-dragon-silver-2`.
Le `family_key` ne peut pas être modifié après création de l'item.

### Règle 6 — lab_id toujours présent

Un item a toujours un `lab_id`, même s'il est dans un sous-Deck. Cela permet les requêtes rapides sans remonter l'arborescence.

### Règle 7 — Champs RESERVED

Les champs marqués [RESERVED] existent dans le schema dès le MVP. Ils ne sont pas exposés dans l'UI. Ne pas les supprimer, ne pas les renommer.

### Règle 8 — Personnalisation (Skins)

La personnalisation visuelle (skins Labs, Decks, Items) est **post-MVP**. Aucun champ d'apparence n'est ajouté en base pour le MVP.

### Règle 9 — Tout objet est supprimable, modifiable, déplaçable

Dans le respect de la hiérarchie parent-enfant :
- Item → peut aller dans n'importe quel Deck ou Lab
- Deck → peut aller dans n'importe quel Lab ou Deck parent (dans les limites de profondeur)
- Lab → ne se déplace pas — c'est le conteneur racine

Suppression Deck non vide : items et sous-Decks remontent au parent. Modal de confirmation obligatoire.
Suppression Lab non vide : modal proposant migration vers un autre Lab ou suppression totale avec double confirmation + export automatique forcé.

### Règle 10 — Suppression physique vs soft delete

- `status: sold` → soft delete uniquement. Jamais de suppression physique.
- Items `active` et items Wishlist → suppression physique autorisée avec confirmation obligatoire.

### Règle 11 — Import safety

Zéro perte de données tolérée lors d'un import.

- Chaque export JSON contient un champ `schema_version`
- Fichier invalide (JSON malformé, schema_version trop récent) → import annulé, données existantes intactes
- Deux stratégies disponibles au moment de l'import :

**Merge (défaut) — résolution de conflits par updated_at :**
```
Pour chaque entité dans le JSON importé :
→ Si l'entité n'existe pas en base → créée
→ Si l'entité existe et updated_at(JSON) > updated_at(base) → remplacée
→ Si l'entité existe et updated_at(JSON) ≤ updated_at(base) → ignorée (base plus récente)
→ Jamais de suppression lors d'un Merge — une entité absente du JSON reste en base
```

**Replace (dangereux) — remplacement complet :**
```
→ Export automatique forcé des données actuelles AVANT toute écriture (MS-05)
→ Double confirmation obligatoire de l'utilisateur
→ Toutes les données en base sont remplacées par le contenu du JSON
→ À utiliser uniquement pour restaurer depuis un backup connu
```

### Règle 14 — Entités IAP et skins (post-MVP)

Les skins et IAP possédés par l'utilisateur sont des entités à part entière.

```
OwnedIAP {
  id          UUID      PK
  iap_id      STRING    Identifiant produit (ex: "skin_phantom", "pack_vault")
  iap_type    ENUM      skin_item | skin_deck | skin_lab | sound_pack | animation
  purchased_at TIMESTAMP
  source      ENUM      purchase | subscription | promo
}

ActiveSkin {
  context     ENUM      item_global | deck_global | lab_global | item:{id}
  iap_id      STRING    FK → OwnedIAP.iap_id
}
```

`ActiveSkin.context` permet d'appliquer un skin globalement ou sur un item spécifique.
Ex: `item_global` = skin actif sur tous les items, `item:uuid` = skin sur un item précis.

### Règle 12 — Queryabilité globale

Les items doivent être queryables globalement (index local) pour :
- Le Dashboard (valeur totale cross-labs)
- Les StackSnapshots (capture quotidienne silencieuse)
- Les exports JSON (toutes les données)

Le flow de vente et d'édition (Modifier) est limité à l'emplacement courant — pas de recherche cross-labs requise pour ces actions.

### Règle 13 — Modèle lot et comportement object-first

**1 item en base = 1 lot** défini par `(série × année × strike finish)`.

Le lot est une commodité de création. Toute action sur un item avec `quantity > 1` déclenche une étape de sélection de quantité avant d'agir. Le résultat opère sur N unités, pas sur le lot entier.

Comportements résultants :
- `vendre(n)` → item original quantity -= n, nouvel item sold quantity:n
- `déplacer(n)` → item original quantity -= n, nouvel item à destination quantity:n
- `extraire(n)` → identique à déplacer mais dans le même emplacement, usage : individualisation
- `supprimer(n)` → item original quantity -= n (pas de soft delete sur des unités supprimées)

**Exception :** si n = quantity totale de l'item, l'item entier est affecté — pas d'extraction inutile.

La photo est le seul attribut non mass-éditable — elle se gère item par item.

---

## Calculs financiers

### Poids fin d'un item (jamais stocké — toujours calculé)
```
fine_weight_oz = weight_oz × purity
```

### Valeur actuelle d'un item
```
current_value = weight_oz × quantity × purity × spot_price[metal][devise_affichage]
```

### Unrealized P&L d'un item
```
// Seulement si purchase_price non null
// Si purchase_price_unit ≠ devise d'affichage : convertir via purchase_exchange_rate
purchase_price_converted = purchase_price × purchase_exchange_rate  // si devise différente
unrealized_pnl           = current_value - purchase_price_converted
unrealized_pnl_pct       = (unrealized_pnl / purchase_price_converted) × 100
```

### Écart Wishlist (signal d'achat)
```
// Seulement si observed_price non null
wishlist_gap = observed_price - current_value
// Si positif → premium au-dessus du melt → attendre
// Si négatif → prix constaté en dessous du melt → opportunité
```

### Valeur totale du stack (Dashboard)
```
total_value          = SUM(current_value) pour tous items status=active
total_invested       = SUM(purchase_price_converted) pour items status=active ET purchase_price non null
total_unrealized_pnl = total_value - total_invested
total_fine_oz_gold   = SUM(fine_weight_oz × quantity) pour items status=active ET metal=gold
total_fine_oz_silver = SUM(fine_weight_oz × quantity) pour items status=active ET metal=silver
```

### Realized P&L [RESERVED MVP UI]
```
realized_pnl = SUM(sold_price - purchase_price_converted) pour tous items status=sold
// realized_pnl est un calcul — jamais un champ stocké
```

---

## Organisation UI — Labs et Decks

L'organisation des items est **entièrement contrôlée par l'utilisateur** via les Decks.
Il n'y a pas de grouping automatique imposé par l'app.

```
Lab Standard
├── Deck "Silver"
│   ├── Deck "DCA"
│   │   └── Maple Leaf × 10
│   └── Deck "Liquidity"
│       └── ASE × 5
├── Deck "Gold"
│   └── Krugerrand × 1
└── [Items sans Deck]
    └── Britannia × 2
```

**Règles :**
- Un Deck appartient toujours à un Lab (`lab_id` obligatoire)
- Un Deck peut avoir un parent Deck (`parent_id`) ou être directement dans le Lab
- Un item peut être dans un Deck ou directement dans le Lab
- La navigation entre niveaux utilise un breadcrumb
- Les calculs de valeur et d'oz sont récursifs — un Deck agrège ses items et ses sous-Decks

---

*Dernière mise à jour : session analyse produit avril 2026*
*Propriétaire : Mounir*
