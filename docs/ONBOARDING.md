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
Étape 0 — Welcome
Étape 1 — Lab Creation
Étape 2 — First Item (optionnel mais incité)
Étape 3 — Backup Prompt
→ MainNavigator
```

---

## Étape 0 — Welcome

**Écran sobre. Un seul message.**

```
[Logo StackLab]

"Bring your stack to life."

[Get Started →]
```

Pas d'explication, pas de liste de features, pas de screenshots.
La proposition de valeur seule. L'utilisateur clique et entre.

---

## Étape 1 — Lab Creation

**Écran de choix des Labs.**

```
"Your stack starts here.
Choose the Labs you want to create."

[ ] Standard     — Build your stack
[ ] Premium      — Your finest pieces
[ ] Wishlist     — What you're after

[Create selected Labs →]
```

**Règles :**
- Minimum 1 Lab sélectionné pour continuer
- Tous les 3 sont présélectionnés par défaut — l'utilisateur déselectionne ce qu'il ne veut pas
- Si l'utilisateur désélectionne tout → bouton désactivé + message "Select at least one Lab"
- Pas d'explication sur ce que sont les Labs — les noms parlent d'eux-mêmes

---

## Étape 2 — First Item (optionnel mais incité)

**L'app propose d'ajouter le premier item immédiatement.**

```
"Add your first item.
Your stack is waiting."

[Add Item →]          [Skip for now]
```

Si l'utilisateur clique **Add Item** :
→ Modal création d'item s'ouvre (voir NAVIGATION.md)
→ Après création : Étape 3

Si l'utilisateur clique **Skip** :
→ Étape 3 directement
→ Hint Deck affiché au premier accès au Lab (voir section Hints)

---

## Étape 3 — Backup Prompt

**Déclenché après le premier item créé, ou après Skip si Skip choisi.**

```
"Your stack is yours.
Keep it safe."

"Export your data now — it takes 5 seconds.
If you lose your phone, you lose your stack."

[Export Now →]        [Later]
```

**Comportement :**
- Si "Export Now" → modal export JSON s'ouvre (voir NAVIGATION.md)
- Si "Later" → reminder activé dans Settings par défaut
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
| Étape 0 (Welcome) | Reprend à l'Étape 0 |
| Étape 1 (Lab Creation) | Reprend à l'Étape 1 |
| Étape 2 (First Item) | Reprend à l'Étape 2 |
| Étape 3 (Backup) | Reprend à l'Étape 3 |

L'état d'avancement est persisté localement via un flag `onboarding_step` dans Settings.

```
Settings {
  ...
  onboarding_completed  BOOLEAN   false par défaut
  onboarding_step       INTEGER   0 par défaut (0-3)
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

Dès que l'utilisateur termine l'Étape 3 (ou clique "Later") :
`onboarding_completed = true`

---

*Dernière mise à jour : session analyse produit avril 2026*
*Propriétaire : Mounir*
