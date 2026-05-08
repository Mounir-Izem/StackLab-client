# ONBOARDING.md — StackLab MVP
> Flow d'onboarding complet. Toute déviation nécessite validation explicite du propriétaire.
> Principe : invitation à personnaliser, pas tutoriel fonctionnel.

---

## Principe fondamental

L'onboarding ne dit pas "voici comment utiliser l'app."
Il dit **"voici ton espace. Fais-en ce que tu veux."**

Chaque étape doit être rapide, non bloquante, et laisser l'utilisateur en contrôle.

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
Premier lancement → micro-animation logo → My Stack
Étape 1 — First Item (optionnel mais incité)
Étape 2 — Backup Prompt (déclenché au 5ème item créé)
→ MainNavigator
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
→ Modal création d'item s'ouvre (voir NAVIGATION.md)
→ Après création : retour dans My Stack, onboarding_step avancé

Si l'utilisateur clique **Skip** :
→ Atterrissage direct dans My Stack
→ Hint Deck affiché au premier accès au Lab (voir section Hints)

---

## Étape 2 — Backup Prompt

**Déclenché au 5ème item créé** — pas au premier, pas après un Skip.

```
"Your stack is yours.
Keep it safe."

"Export your data now — it takes 5 seconds.
If you lose your phone, you lose your stack."

[Export Now →]        [Later]
```

**Comportement :**
- Si "Export Now" → modal export JSON s'ouvre (voir NAVIGATION.md)
- Si "Later" → reminder silencieux activé, se redéclenche tous les **30 jours**
- Ce prompt ne peut pas être complètement ignoré sans afficher "Later" — pas de fermeture directe

Après cette étape → **MainNavigator (Tab)**. L'onboarding est terminé.

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
| Étape 1 (First Item) | Reprend à l'Étape 1 |
| Étape 2 (Backup) | Reprend à l'Étape 2 |

L'état d'avancement est persisté localement via un flag `onboarding_step` dans Settings.

```
Settings {
  ...
  onboarding_completed  BOOLEAN   false par défaut
  onboarding_step       INTEGER   0 par défaut (0-2)
}
```

---

## Ce que l'onboarding ne fait PAS

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

Dès que l'utilisateur termine l'Étape 2 (ou clique "Later") :
`onboarding_completed = true`

---

*Dernière mise à jour : session mai 2026*
*Propriétaire : Mounir*
