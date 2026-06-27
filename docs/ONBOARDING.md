# ONBOARDING.md — StackLab MVP
> Flow d'onboarding complet. Toute déviation nécessite validation explicite du propriétaire.
> Principe : invitation à personnaliser, pas tutoriel fonctionnel.

---

## Principe fondamental

L'onboarding ne dit pas "voici comment utiliser l'app."
Il dit **"voici ton espace. Fais-en ce que tu veux."**

La première minute répond à la question inconsciente du stacker :
**"Est-ce que cette app va faire honneur à ma collection ?"**

Chaque étape est rapide, non bloquante, et laisse l'utilisateur en contrôle.

---

## Déclencheur

L'onboarding se déclenche uniquement au **premier lancement** de l'app.
Il est persisté en base locale — si l'utilisateur quitte à mi-chemin, il reprend là où il s'est arrêté au prochain lancement.

```
Premier lancement → OnboardingStack
Lancements suivants → MainNavigator (Tab)
```

---

## Flow complet

```
Premier lancement → micro-animation logo → My Stack (vide)
Étape 1 — First Item (flow création complet)
Étape 1b — Backup prompt (juste après l'animation d'entrée de la card)
→ MainNavigator (onboarding_completed = true)

Reminder silencieux — au 5ème item si backup jamais activé (système séparé)
```

---

## Premier lancement — My Stack

Au tout premier lancement, l'app affiche une **micro-animation du logo StackLab** puis atterrit directement sur **My Stack**.

Les **3 labs système** existent dès ce premier lancement — ils sont fixes et non supprimables :

| Lab | Rôle |
|---|---|
| My Stack | Stack principal de l'utilisateur |
| Wishlist | Items convoités, non encore acquis |
| Trash | Items supprimés, récupérables |

Aucun écran de sélection de labs. Aucun écran de bienvenue. L'utilisateur est immédiatement dans son espace.

---

## Étape 1 — First Item (optionnel mais incité)

**L'app propose d'ajouter le premier item immédiatement.**

```
"Add your first item.
Your stack is waiting."

[Add Item →]          [Skip for now]
```

Si l'utilisateur clique **Add Item** :
→ Flow création d'item complet (3 écrans, voir NAVIGATION.md)
→ Card animée à l'entrée dans My Stack ← moment de rétention
→ Étape 1b déclenchée dans la continuité de l'animation

Si l'utilisateur clique **Skip** :
→ `onboarding_completed = true` immédiatement
→ Atterrissage direct dans My Stack
→ Hint Deck affiché au premier accès au Lab (voir section Hints)
→ Reminder au 5ème item si backup jamais activé

---

## Étape 1b — Backup prompt (post-premier item)

**Déclenché une seule fois, juste après l'animation d'entrée de la card.**

L'utilisateur vient de voir son premier item apparaître. L'émotion est là. C'est le moment exact pour parler de protection — il a maintenant quelque chose à perdre.

```
"Your stack is on your phone.
If you lose your phone, you lose your stack.
Choose how you want to protect it."

[Enable auto-backup]           [I'll export manually]
```

**[Enable auto-backup]** :
→ Ouvre les paramètres système (iCloud sur iOS / Google Drive sur Android)
→ L'utilisateur active, revient dans l'app
→ `auto_backup_enabled = true`
→ `onboarding_completed = true`

**[I'll export manually]** :
→ Pas de blocking, pas de modal supplémentaire
→ `backup_reminder = true`
→ `onboarding_completed = true`

Ce prompt ne peut pas être fermé sans choisir une option — pas de × en haut à droite.
Ce n'est pas un blocage : les deux options avancent vers l'app.

---

## Reminder silencieux — 5ème item

Système séparé de l'onboarding. Déclenché si :
- `auto_backup_enabled = false`
- Aucun export JSON jamais effectué
- `item_count (active) >= 5`

```
Bannière discrète en haut de My Stack :
"5 items tracked. Back up your stack."  [Export]  [×]
```

Apparaît une seule fois. Si l'utilisateur ferme (×), la bannière ne réapparaît pas. Son choix est respecté.

---

## Hints post-onboarding

### Hint — Decks (non bloquant)

**Déclencheur :** première ouverture d'un Lab vide après l'onboarding

```
Tooltip discret en bas de l'écran :
"Tip: Create Decks to organize your items your way."
[Got it]
```

Apparaît une seule fois. Disparaît au tap ou après 5 secondes.
Ne bloque pas l'interaction.

### Hint — Photo (non bloquant)

**Déclencheur :** premier item créé sans photo

```
Tooltip sur la card :
"Add a photo to bring this item to life."
```

Disparaît au tap ou si l'utilisateur navigue ailleurs.

### Hint — Wishlist observed_price (non bloquant)

**Déclencheur :** premier item Wishlist créé sans observed_price

```
Icône nuage ☁️ persistante sur la card tant que observed_price est absent.
```

Pas de tooltip — l'icône suffit comme signal visuel.

---

## Reprise après abandon

Si l'utilisateur quitte l'app pendant l'onboarding :

| Étape abandonnée | Reprise |
|---|---|
| Avant Étape 1 (My Stack vide) | Reprend à l'Étape 1 |
| Pendant création item | Reprend à l'Étape 1 |
| Étape 1b (Backup prompt) | Reprend à l'Étape 1b |

L'état d'avancement est persisté localement via un flag `onboarding_step` dans Settings.

```
Settings {
  ...
  onboarding_completed  BOOLEAN   false par défaut
  onboarding_step       INTEGER   0 par défaut (0–1)
}
```

| Valeur | Signification |
|---|---|
| 0 | Premier lancement, Étape 1 non commencée |
| 1 | 1er item créé, Étape 1b (backup prompt) non traitée |

---

## Ce que l'onboarding ne fait PAS

- Pas d'écran Privacy & Backup avant les données (aucune valeur = aucune raison d'écouter)
- Pas d'export JSON blocking (tue le moment de rétention)
- Pas de tutoriel sur les features
- Pas d'explication sur les Decks (seulement un hint post-onboarding)
- Pas de demande de notifications
- Pas de demande de compte ou email (sauf si cloud sync activé manuellement)
- Pas de walkthrough avec flèches et overlays
- Pas de skip global — chaque étape a sa propre action secondaire

---

## Persistance de l'état

```
onboarding_completed = false → OnboardingStack au lancement
onboarding_completed = true  → MainNavigator au lancement
```

`onboarding_completed = true` est positionné dès que l'Étape 1b est traitée (Enable ou I'll export manually), ou immédiatement si l'utilisateur clique Skip à l'Étape 1.

---

*Dernière mise à jour : session mai 2026*
*Propriétaire : Mounir*
