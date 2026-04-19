# AUTOCOMPLETE_SUGGESTIONS.md — StackLab
> Liste de suggestions pour l'autocomplete du champ "Série" lors de la création d'un item.
> Ce n'est pas un catalogue en base de données — c'est une liste statique côté client.
> Chaque suggestion pré-remplit : poids défaut (1oz), pureté défaut, shape défaut.
> L'utilisateur peut ignorer les suggestions et saisir librement.
> À compléter avec validation terrain avant implémentation.

---

## Rôle de ce fichier

Quand l'utilisateur commence à taper dans le champ "Série" :
- L'app suggère des noms de séries connues en autocomplete
- La sélection d'une suggestion pré-remplit : poids (1oz), pureté, shape
- L'utilisateur modifie ensuite librement ces valeurs sur son item
- Si aucune suggestion ne convient → saisie libre acceptée sans restriction

---

## Format des suggestions

```
{
  name: string           // Nom affiché dans l'autocomplete
  family_key: string     // Slug généré : {série-slug}-{metal}
  metal: gold | silver
  default_purity: number
  default_shape: coin | bar | token | bust | custom
}
```

Poids défaut : **1oz pour toutes les suggestions** sauf exceptions notées.

---

## SILVER — Bullion Standard

| Nom affiché | family_key | Pureté | Shape |
|---|---|---|---|
| American Silver Eagle | american-silver-eagle-silver | 0.999 | coin |
| Canadian Silver Maple Leaf | canadian-maple-leaf-silver | 0.9999 | coin |
| Australian Silver Kangaroo | australian-kangaroo-silver | 0.9999 | coin |
| British Silver Britannia | british-britannia-silver | 0.999 | coin |
| Vienna Silver Philharmonic | vienna-philharmonic-silver | 0.999 | coin |
| Silver Krugerrand | krugerrand-silver | 0.999 | coin |
| Mexican Silver Libertad | mexican-libertad-silver | 0.999 | coin |

---

## SILVER — Thématique (year obligatoire à la saisie)

| Nom affiché | family_key | Pureté | Shape |
|---|---|---|---|
| Perth Lunar Series III | perth-lunar-series-iii-silver | 0.9999 | coin |
| Perth Lunar Series II | perth-lunar-series-ii-silver | 0.9999 | coin |
| Perth Lunar Series I | perth-lunar-series-i-silver | 0.9999 | coin |
| Australian Silver Kookaburra | australian-kookaburra-silver | 0.9999 | coin |
| Australian Silver Koala | australian-koala-silver | 0.9999 | coin |
| Australian Silver Platypus | australian-platypus-silver | 0.9999 | coin |
| Australian Silver Swan | australian-swan-silver | 0.9999 | coin |
| RCM Predator Series | rcm-predator-silver | 0.9999 | coin |
| RCM Wildlife Series | rcm-wildlife-silver | 0.9999 | coin |
| Tudor Beasts | tudor-beasts-silver | 0.9999 | coin |
| Queen's Beasts | queens-beasts-silver | 0.9999 | coin |
| Chinese Silver Panda | chinese-panda-silver | 0.999 | coin |
| Scottsdale Stacker | scottsdale-stacker-silver | 0.999 | coin |
| Scottsdale Lion | scottsdale-lion-silver | 0.999 | coin |

---

## SILVER — Pop culture

| Nom affiché | family_key | Pureté | Shape |
|---|---|---|---|
| Perth Mint DC Comics | perth-dc-silver | 0.9999 | coin |
| Perth Mint Marvel | perth-marvel-silver | 0.9999 | coin |
| Perth Mint Star Wars | perth-star-wars-silver | 0.9999 | coin |
| Perth Mint Harry Potter | perth-harry-potter-silver | 0.9999 | coin |
| NZ Mint Marvel | nz-mint-marvel-silver | 0.9999 | coin |
| NZ Mint DC Comics | nz-mint-dc-silver | 0.9999 | coin |
| NZ Mint Star Wars | nz-mint-star-wars-silver | 0.9999 | coin |
| NZ Mint Disney | nz-mint-disney-silver | 0.9999 | coin |
| RCM Looney Tunes | rcm-looney-tunes-silver | 0.9999 | coin |
| RCM Star Trek | rcm-star-trek-silver | 0.9999 | coin |
| Kraken Series | kraken-silver | 0.999 | coin |

> **Note :** Le pop culture gold est à compléter — validation terrain requise avant ajout.

---

## SILVER — Barres

| Nom affiché | family_key | Pureté | Shape |
|---|---|---|---|
| PAMP Suisse Silver Bar | pamp-suisse-silver | 0.999 | bar |
| Valcambi Silver Bar | valcambi-silver | 0.999 | bar |
| Scottsdale Silver Bar | scottsdale-silver | 0.999 | bar |
| RCM Silver Bar | rcm-silver | 0.9999 | bar |
| Perth Mint Silver Bar | perth-silver | 0.9999 | bar |
| Engelhard Silver Bar | engelhard-silver | 0.999 | bar |
| Johnson Matthey Silver Bar | jm-silver | 0.999 | bar |

---

## GOLD — Bullion Standard

| Nom affiché | family_key | Pureté | Shape |
|---|---|---|---|
| American Gold Eagle | american-gold-eagle-gold | 0.9167 | coin |
| American Gold Buffalo | american-gold-buffalo-gold | 0.9999 | coin |
| Canadian Gold Maple Leaf | canadian-maple-leaf-gold | 0.9999 | coin |
| Australian Gold Kangaroo | australian-kangaroo-gold | 0.9999 | coin |
| British Gold Britannia | british-britannia-gold | 0.9999 | coin |
| British Gold Sovereign | british-sovereign-gold | 0.9167 | coin |
| Vienna Gold Philharmonic | vienna-philharmonic-gold | 0.9999 | coin |
| Gold Krugerrand | krugerrand-gold | 0.9167 | coin |
| Mexican Gold Libertad | mexican-libertad-gold | 0.999 | coin |

---

## GOLD — Thématique (year obligatoire à la saisie)

| Nom affiché | family_key | Pureté | Shape |
|---|---|---|---|
| Perth Lunar Series III Gold | perth-lunar-series-iii-gold | 0.9999 | coin |
| Perth Lunar Series II Gold | perth-lunar-series-ii-gold | 0.9999 | coin |
| Chinese Gold Panda | chinese-panda-gold | 0.999 | coin |

---

## GOLD — Barres

| Nom affiché | family_key | Pureté | Shape |
|---|---|---|---|
| PAMP Suisse Gold Bar | pamp-suisse-gold | 0.9999 | bar |
| Valcambi Gold Bar | valcambi-gold | 0.9999 | bar |
| Credit Suisse Gold Bar | credit-suisse-gold | 0.9999 | bar |
| Johnson Matthey Gold Bar | jm-gold | 0.9999 | bar |
| Perth Mint Gold Bar | perth-gold | 0.9999 | bar |
| RCM Gold Bar | rcm-gold | 0.9999 | bar |

---

## Règles d'implémentation

- La liste est chargée statiquement côté client — pas d'appel API
- La recherche dans l'autocomplete est case-insensitive
- Si la saisie ne correspond à aucune suggestion → family_key généré depuis le texte libre
- La redondance du métal dans le family_key est un comportement accepté : "American Silver Eagle" → `american-silver-eagle-silver`. C'est mécanique et prévisible — ne pas corriger.
- Les items custom (hors suggestions) ne sont pas préfixés `custom-` — le slug est généré normalement depuis le nom saisi

---

## À compléter avant implémentation

- Pop culture gold (Perth DC gold, Perth Star Wars gold, etc.) — validation terrain requise
- Séries régionales manquantes identifiées par les premiers utilisateurs
- Rounds privés US (SilverTowne, Golden State Mint, etc.) — à confirmer avec la cible

---

*Dernière mise à jour : session analyse produit avril 2026*
*Ce fichier est une liste statique côté client — pas une entité base de données.*
*Propriétaire : Mounir*
