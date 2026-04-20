# INTERACTIONS.md — StackLab
> Animations, retours haptiques, sons, et mécanique dopamine.
> À lire avant d'implémenter toute interaction visuelle ou sensorielle.
> Toute déviation nécessite validation explicite du propriétaire.
> Cohérent avec NAVIGATION.md (appui long, menus contextuels), PRODUCT_DECISIONS.md section 11 (architecture card).

---

## Philosophie

**Les objets doivent être ressentis, pas seulement affichés.**

Un stacker qui tient une pièce dans la main la sent, l'entend, voit la lumière jouer dessus.
L'app simule ces sensations. Pas de façon exagérée — de façon juste.

Deux règles absolues :
1. **Jamais d'animation qui gêne l'usage** — la fluidité prime toujours sur l'effet
2. **Cohérence métal** — gold sonne sourd et chaud, silver sonne cristallin et froid

---

## Architecture des skins

### Principe de layering

Chaque card est composée de 3 couches superposées (PRODUCT_DECISIONS.md section 11) :

```
BaseLayer     → couleur métal (gold chaud / silver froid) — toujours visible
SkinLayer     → skin actif (null par défaut en free) — remplace ou enrichit le BaseLayer
ContentLayer  → données (nom, poids, valeur) — toujours au-dessus
```

Le SkinLayer est `null` en MVP free. L'emplacement est réservé.
Le badge "Standard" dans le coin indique l'absence de skin — emplacement réservé au nom du skin futur.

### Catégories de skins

**Skins de card item :**

| Skin | Tier | Description visuelle | Idle | Gyroscope | Tap glow |
|---|---|---|---|---|---|
| Standard | Free | Fond métal uni, glow basique | — | — | Couleur métal |
| Bullion | IAP | Texture métal brossé réaliste | Shimmer scroll | Parallax métal | Glow métal intense |
| Phantom | IAP | Noir profond + violet, holographique | Particules | Hologramme | Glow violet |
| Vintage | IAP | Sépia, bords usés, style numismatique | — | — | Glow ambre |
| Royal | IAP | Bordeaux et or, style certificat | Filigrane | — | Glow or |
| Frost | IAP | Bleu glacier — silver uniquement | Cristaux | Reflets glace | Glow bleu |
| Fire | IAP | Ambre et rouge — gold uniquement | Flammes subtiles | Reflets chaleur | Glow orange |
| Diamond | IAP rare | Transparent avec reflets | Arc-en-ciel | Prismatique | Glow blanc |

**Skins de Deck :**

| Skin | Description | Effet de stack |
|---|---|---|
| Standard | Sobre, dark | Couches grises |
| Leather | Cuir brun | Couches cuir |
| Velvet | Velours bordeaux | Couches velours |
| Steel | Métal brossé | Couches acier |

**Skins de Lab :**

| Skin | Description |
|---|---|
| Standard | Card sobre, dark |
| Swiss Vault | Coffre-fort suisse, serrure visible |
| Fort Knox | Style bunker militaire |
| Royal Mint | Style officiel, dorures |

### Règle skins par métal

Les skins `Frost` et `Fire` sont exclusifs à un métal :
```
Frost → silver uniquement (désactivé sur gold)
Fire  → gold uniquement (désactivé sur silver)
```
Si un utilisateur a les deux métaux dans un même Lab/Deck → skin neutre par défaut.

---

## Interactions — MVP Phase 2

Ces interactions sont implémentées en Phase 2, dès que les cards existent.

### 1. Tap feedback — Toutes les cards

**Déclencheur :** `Pressable` onPress sur toute card (item, deck, lab).

```typescript
import * as Haptics from 'expo-haptics';
import { Animated } from 'react-native';

// Scale
const scaleAnim = useRef(new Animated.Value(1)).current;

const handlePressIn = () => {
  Animated.spring(scaleAnim, {
    toValue: 0.97,
    useNativeDriver: true,
    speed: 50,
    bounciness: 0,
  }).start();
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const handlePressOut = () => {
  Animated.spring(scaleAnim, {
    toValue: 1,
    useNativeDriver: true,
    speed: 20,
    bounciness: 4,
  }).start();
};
```

**Glow au tap :**
- Card gold → glow `#D4AF37` (or chaud)
- Card silver → glow `#C0C0C0` (argent froid)
- Durée : 120ms, opacity 0 → 0.4 → 0

**Vibration :**
- `ImpactFeedbackStyle.Light` — 120ms
- Simule le toucher physique d'une pièce

**Edge cases tap feedback :**
- Card en cours d'animation (création) → tap désactivé jusqu'à la fin de l'animation
- Tap rapide multiple (double tap) → une seule animation, pas de cumul
- Mode économie d'énergie iOS/Android → haptics désactivés — silent fail, pas d'erreur
- Device sans support haptics → silent fail via try/catch sur Haptics.impactAsync

---

### 2. Appui long — Scale + ombre

**Déclencheur :** 500ms sans mouvement du doigt (NAVIGATION.md EC-01 à EC-04).

```
Card se soulève :
→ scale 1.0 → 1.05
→ ombre plus profonde (shadowOpacity 0.2 → 0.5)
→ Haptics.impactAsync(ImpactFeedbackStyle.Medium)
→ Menu contextuel apparaît
```

**Durée :** 150ms (Animated.spring).
**Comportement EC-02 :** si la card est en animation → ignorer l'appui long.

**Edge cases appui long :**
- EC-01 : doigt qui bouge pendant l'appui → scroll prime, appui long annulé
- EC-02 : card en animation → appui long ignoré
- EC-03 : menu déjà ouvert → tap ailleurs ferme le menu actuel
- EC-04 : card en bas de l'écran → menu s'ouvre vers le haut
- App en background → appui long ignoré (onBlur désactive le handler)
- Deux doigts sur la card → ignorer (gesture à un doigt uniquement)

---

### 3. Animation d'entrée d'une card à la création

**Déclencheur :** nouvel item créé et ajouté à la liste.

```
Phase 1 : scale 0.8 → 1.05 (spring, 200ms)
Phase 2 : scale 1.05 → 1.0 (spring, 100ms)
Phase 3 : glow burst couleur métal (opacity 0 → 0.6 → 0, 300ms)
```

La card entre depuis le bas (translateY 40 → 0, 250ms).
La card n'apparaît pas abruptement — elle naît.

**Edge cases animation d'entrée :**
- Création multiple rapide (batch) → animer uniquement la dernière card créée, les précédentes apparaissent instantanément
- Liste qui scroll pendant l'animation → animation continue, le scroll ne l'interrompt pas
- Reduced Motion activé (accessibilité iOS/Android) → skip l'animation, card apparaît directement
- App passe en background pendant l'animation → animation annulée proprement

---

### 4. Son de création

**Déclencheur :** création d'un item confirmée (écran 3 du flow WIREFRAME_CREATION.md).

```
Gold : son sourd et dense — pièce lourde qui tombe sur velours
Silver : son cristallin — pièce fine qui tinte sur métal

Implémentation :
→ expo-av (Audio.Sound)
→ Fichiers : assets/sounds/create-gold.mp3 / create-silver.mp3 (assets privés)
→ Durée : 800ms max
→ Volume : 0.7 (respecte le mode silencieux iOS/Android)
```

**Note :** jouer le son uniquement si le device n'est pas en mode silencieux.
Vérifier via `expo-av` Audio mode avant de jouer.

**Edge cases son de création :**
- Mode silencieux → pas de son, vibration seule
- Volume device à 0 → pas de son, vibration seule
- Écouteurs connectés → son dans les écouteurs (comportement natif)
- Son précédent non terminé → interrompre et rejouer depuis le début
- Item avec les deux métaux (impossible — un item = un métal) → cas inexistant
- Erreur de chargement du fichier audio → silent fail, ne pas crasher

---

### 5. Vibration "solide" à la création

**Déclencheur :** même déclencheur que le son de création.

```typescript
// Différente du tap — plus longue, plus "dense"
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

Simule le fait de poser quelque chose de lourd dans la main.

---

### 6. Counter animation sur les valeurs au chargement

**Déclencheur :** chargement de DashboardHome ou d'un LabDetail avec spot disponible.

```
Valeur part de 0 et compte jusqu'à la valeur réelle
Durée : 600ms
Easing : ease-out (rapide au début, ralentit à la fin)
```

```typescript
// Pattern avec Animated.timing ou react-native-reanimated
const animatedValue = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(animatedValue, {
    toValue: targetValue,
    duration: 600,
    easing: Easing.out(Easing.quad),
    useNativeDriver: false, // pas de useNativeDriver pour les valeurs numériques
  }).start();
}, [targetValue]);
```

**Ne pas animer si :** spot indisponible, valeur = 0, ou l'utilisateur a déjà vu cet écran dans la session (uniquement au premier chargement par session).

**Edge cases counter animation :**
- Valeur change pendant l'animation (nouveau spot reçu) → terminer l'animation courante, relancer vers la nouvelle valeur
- Valeur = null (aucun item, aucun spot) → afficher "--" sans animation
- Valeur négative (impossible en logique métier — melt value toujours positive) → afficher 0
- Reduced Motion activé → afficher directement la valeur finale sans animation
- Devise changée pendant l'animation → relancer depuis 0 vers la valeur dans la nouvelle devise

---

### 7. "You got it under melt" — Deal detector

**Déclencheur :** création d'item avec `purchase_price` < valeur melt actuelle.
**Prérequis :** spot disponible (Phase 3).

```
Au moment du récapitulatif (écran 3 du flow création) :
→ Si purchase_price < fine_weight_oz × spot_price :
   Afficher discrètement sous le prix d'achat :
   "🎯 You got it under melt!"
   Couleur verte, texte small, pas de son
```

**Edge cases :**
- Spot indisponible → ne pas afficher (pas de calcul possible)
- purchase_price = null → ne pas afficher
- Wishlist items → ne pas afficher (prix non finalisé)

---

### 8. Share — Capture et partage de card

**Déclencheur :** tap "Share" dans le menu contextuel d'une card.

```typescript
import { captureRef } from 'react-native-view-shot';
import { Share } from 'react-native';

// Capturer la card comme image
const imageUri = await captureRef(cardRef, {
  format: 'png',
  quality: 1.0,
  result: 'tmpfile',
});

// Share sheet natif
await Share.share({
  url: imageUri, // iOS
  message: buildShareText(item), // Android + texte
});
```

**Texte pré-rempli :**
```
Item : "My [Série] [Année] [Finish] — [qty] oz [métal]\nMelt value: $[valeur]\nTracked with StackLab 🥈"
Deck : "[Nom du Deck] — [qty] items · $[valeur]\nTracked with StackLab"
Lab  : "My [Nom] stack — [oz gold] oz gold · [oz silver] oz silver · $[valeur total]\nTracked with StackLab"
```

**Logo StackLab** : watermark discret en bas à droite de l'image capturée. C'est la vraie pub.

**EC-22 :** si spot indisponible → valeur remplacée par "--" dans le texte et sur la card capturée.
**EC-23 :** si pas de photo → placeholder silhouette utilisé.

**Edge cases share :**
- captureRef échoue (card hors écran) → scroll vers la card avant capture, retry une fois
- Share sheet annulé par l'utilisateur → silent, aucun message d'erreur
- Fichier temporaire trop grand → compresser en JPEG qualité 0.85 si PNG > 5MB
- Aucune app de partage installée → iOS gère nativement (copier, AirDrop...), pas de gestion côté app
- Item sold → share disponible mais la card affiche le badge "Sold"
- Skin premium actif → skin visible sur l'image partagée (encourage les achats IAP)

---

### 9. Placeholder "card incomplète" — Itch à gratter

**Principe :** une card sans photo, sans purchase_price, ou sans year affiche des indicateurs visuels de complétion manquante. Le cerveau du collectionneur veut compléter.

```
Sans photo :
→ Zone photo avec icône caméra + "Add photo"
→ Pas d'animation — juste présent et visible

Sans purchase_price :
→ Zone valeur P&L avec "Add purchase price" en gris
→ Pas de valeur P&L affichée

Sans year :
→ Petit point orange sur l'année si absent
→ Subtil — pas alarmant
```

**Règle :** les placeholders sont informatifs, jamais anxiogènes.

---

### 9b. Animation appui long — Deck card

**Déclencheur :** appui long sur une Deck card (NAVIGATION.md).

```
Les couches de stack derrière la card s'écartent :
→ Couche -1 (derrière) : translateY +4px, translateX +4px, opacity 0.6 → 0.8
→ Couche -2 (derrière) : translateY +8px, translateX +8px, opacity 0.4 → 0.6
Durée : 150ms (Animated.spring)
Effet : le Deck "s'ouvre" visuellement

En même temps :
→ Card principale scale 1.0 → 1.05
→ Haptics.impactAsync(ImpactFeedbackStyle.Medium)
→ Menu contextuel Deck apparaît
```

**Edge cases :**
- Deck vide (aucun item) → même animation, les couches sont des placeholders vides
- Deck avec 1 item → 1 seule couche derrière visible
- Appui long pendant scroll → EC-01 (scroll prime)

---

### 9c. Stack qui grossit — Ajout d'item dans un Deck

**Déclencheur :** item créé dans un Deck qui a déjà des items.

```
Les cards existantes se décalent légèrement vers le haut
pour "faire de la place" à la nouvelle card :
→ Cards existantes : translateY 0 → -8px (spring, 150ms)
→ Nouvelle card entre depuis le bas (interaction 3)
→ Cards existantes reviennent à 0 (spring, 200ms)

Effet global : le stack s'agrandit physiquement
```

**Ne pas animer si :** liste vide (premier item du Deck) → animation d'entrée seule suffit.

---

### 9d. Wishlist gap — Signal d'opportunité d'achat

**Déclencheur :** `observed_price` d'un item Wishlist ≤ melt value × 1.05 (à 5% du melt).
**Prérequis :** spot disponible (Phase 3).

```
Sur la card Wishlist :
→ Badge discret "Near melt" en vert pâle
→ Pas d'animation — juste visible en permanence
→ Pas de notification push en MVP

Sur le détail de l'item Wishlist :
→ Ligne verte : "This item is trading near melt price 🎯"
→ Sous-ligne : "Current: $[observed_price] · Melt: $[melt_value]"
```

**Edge cases :**
- observed_price = null → pas de badge
- Spot indisponible → badge masqué (pas de calcul possible)
- observed_price > melt × 1.05 → badge absent

---

## Interactions — Post-MVP

Ces interactions sont documentées maintenant mais implémentées après la bêta.

### 10. Gyroscope / Tilt parallax — Skins premium

**Quand :** implémenté avec les skins (post-MVP).
**Lib :** `expo-sensors` (DeviceMotion) — disponible Expo managed.

```typescript
import { DeviceMotion } from 'expo-sensors';

DeviceMotion.addListener(({ rotation }) => {
  // rotation.alpha, beta, gamma en radians
  const tiltX = rotation.beta * 15;  // max ±15px de déplacement
  const tiltY = rotation.gamma * 15;
  setSkinOffset({ x: tiltX, y: tiltY });
});
```

**Comportement par skin :**
```
Bullion  → le reflet métal brossé se déplace avec l'inclinaison
Phantom  → l'hologramme tourne légèrement
Diamond  → l'arc-en-ciel prismatique change de teinte
Frost    → les cristaux scintillent différemment
```

**Free (Standard) :** pas de gyroscope — effet statique uniquement.
**Impact batterie :** désactiver le listener quand la card n'est pas visible (onViewableItemsChanged).

**Edge cases gyroscope :**
- Device à plat (pas de rotation) → effet statique, pas de déplacement
- Rotation trop rapide → clamper le déplacement à ±20px maximum
- DeviceMotion non disponible sur le device → fallback silencieux vers skin statique
- App en background → suspendre le listener (DeviceMotion.removeAllListeners)
- Utilisateur a désactivé les capteurs de mouvement dans les Settings → fallback silencieux

---

### 11. Idle shimmer — Skins premium

**Quand :** implémenté avec les skins (post-MVP).
**Déclenché par :** scroll ou gyroscope — jamais en continu.

```
Free : aucun shimmer
Premium skins : shimmer déclenché pendant 2s après un scroll
                puis s'arrête

Bullion  → shimmer métal lent, gauche→droite
Diamond  → shimmer arc-en-ciel
Phantom  → particules violettes qui flottent 2s
```

**Règle performance :** shimmer uniquement sur les cards visibles à l'écran.
Utiliser `FlatList` avec `onViewableItemsChanged` pour détecter la visibilité.

**Edge cases idle shimmer :**
- Liste longue (50+ items) → shimmer uniquement sur les 6 cards visibles, jamais sur toute la liste
- Scroll rapide → shimmer déclenché une seule fois après arrêt du scroll (debounce 200ms)
- Reduced Motion activé → shimmer désactivé complètement
- App en background → arrêter toutes les animations de shimmer

---

### 12. Milestone celebrations

**Quand :** implémenté en Phase 2+, détection via calcul dashboard.
**Déclencheur :** seuils de fine oz franchis pour la première fois.

```
Milestones silver : 10 oz, 25 oz, 50 oz, 100 oz, 250 oz, 500 oz, 1 000 oz
Milestones gold   : 0.5 oz, 1 oz, 5 oz, 10 oz, 20 oz, 50 oz

Règle "première fois uniquement" :
→ Flag booléen par milestone dans settings_extended
→ Ex: "milestone_silver_100": "true"
→ Une fois affiché → jamais re-déclenché
```

**Célébration standard (free) :**
```
Modal plein écran :
→ Titre : "100 oz Silver 🥈"
→ Sous-titre : "You crossed a major milestone."
→ Animation confetti basique (react-native-confetti-cannon ou similaire)
→ Vibration forte (NotificationFeedbackType.Success)
→ Bouton "Share" → share sheet avec image milestone
→ Bouton "Continue"
```

**Célébrations premium (IAP animations) :**
```
"Silver Rain"  → cascade d'argent animée
"Gold Rush"    → pluie de pièces d'or
"Vault Unlock" → animation de coffre qui s'ouvre
"Prestige"     → explosion de lumière
```

**Edge cases milestones :**
- Plusieurs milestones franchis en même temps (import JSON d'un gros stack) → célébrer uniquement le plus grand milestone, ignorer les intermédiaires
- Milestone déjà célébré (flag "true" dans settings_extended) → ne jamais re-déclencher
- Vente qui fait redescendre sous un milestone → ne pas re-déclencher lors du prochain franchissement vers le haut
- App fermée pendant la célébration → la modal n'apparaît pas au prochain lancement (le flag est set avant d'afficher la modal)
- Item sold contribue toujours aux fine oz totales → non, les items sold sont exclus du calcul dashboard

---

### 13. Dashboard — Comparaison temporelle

**Quand :** disponible après Phase 4 (StackSnapshots en base).
**Données :** `stack_snapshots` — 1 par jour.

```
Affichages disponibles sur DashboardHome :
→ "Your stack is worth $243 more than yesterday"
→ "Up 12.4% in the last 30 days"
→ "Since you started stacking: +$1,204 (18.3%)"

Animation : valeur qui change → flash vert si hausse, neutre si baisse
Règle : jamais de rouge sur une baisse — les stackers pensent long terme
```

**Edge cases comparaison temporelle :**
- Aucun snapshot d'hier → afficher uniquement "Since you started stacking"
- Snapshot d'hier incomplet (spot absent ce jour-là) → ne pas afficher la comparaison J-1
- Spot actuel indisponible → utiliser le dernier spot connu, mentionner "estimated"
- Stack vide → pas de comparaison affichée

---

### 14. Dashboard — Progression vers prochain milestone

**Quand :** disponible Phase 2+ (calcul local, pas besoin de backend).

```
En dessous du total d'onces :
"12.3 oz to 100 oz silver"

Barre de progression horizontale :
→ 0% → milestone précédent
→ position actuelle
→ 100% → prochain milestone

Couleur : argent pour silver, or pour gold
```

**Edge cases progression :**
- Au-delà du dernier milestone → afficher "Maximum milestone reached 🏆"
- Stack vide → premier milestone affiché comme objectif, barre à 0%
- Silver et gold simultanément → deux barres séparées, une par métal
- Vente qui fait redescendre → barre mise à jour immédiatement, pas d'animation régressive

---

### 15. Son au Quick Sell

**Quand :** post-MVP Phase 2+.
**Déclencheur :** confirmation d'une vente (Quick Sell ou Sell with price).

```
Son de transaction : court, satisfaisant, neutre
Fichier : assets/sounds/sell.mp3 (asset privé)
Durée : 400ms max
```

**Edge cases son vente :**
- Mode silencieux → pas de son, vibration seule
- Vente annulée avant confirmation → pas de son
- Quick Sell sans spot disponible → impossible (bouton grisé EC-09), cas inexistant

---

### 16. Packs de sons — IAP

**Structure :**

| Pack | Son création | Son vente | Son tap |
|---|---|---|---|
| Standard (free) | Pièce simple | Transaction neutre | — |
| Vault | Coffre-fort qui se ferme | Verrou | Métal lourd |
| Mint | Frappe de monnaie | Caisse enregistreuse | Timbre officiel |
| ASMR Silver | Tinte cristallin | Glissement métal froid | Frottement fin |
| ASMR Gold | Sourd et dense | Bruit de tiroir | Velours épais |

**Edge cases packs de sons :**
- Pack ASMR Silver sur item gold → utiliser le son standard (cohérence métal)
- Pack ASMR Gold sur item silver → utiliser le son standard
- Pack non possédé (IAP non acheté) → fallback silencieux vers Standard
- Mise à jour app qui supprime un pack → fallback vers Standard, pas de crash
- Deux sons simultanés (création rapide) → interrompre le premier, jouer le second

---

### 17. Animation de vente — Realized P&L

**Quand :** post-MVP Phase 2+.
**Déclencheur :** confirmation d'une vente avec profit.

```
Si sold_price > purchase_price (P&L positif) :
→ Écran de confirmation enrichi :
  "+$47.20 realized 🎯"
  Couleur verte, scale animation
  Vibration moyenne
  Son de transaction (selon pack actif)

Si sold_price <= purchase_price :
→ Confirmation sobre, pas de célébration
  "Sale recorded."
```

**Edge cases P&L animation :**
- purchase_price = null → pas de comparaison possible, afficher "Sale recorded." sans P&L
- Vente partielle (qty < quantity totale) → P&L calculé sur les unités vendues uniquement
- purchase_price_unit ≠ devise courante → convertir avec le taux stocké (purchase_exchange_rate)
- sold_price = 0 (cadeau) → "Sale recorded." sans célébration
- P&L exactement = 0 → "Sale recorded." sans célébration

---

### 18. Streak sur ouverture quotidienne

**Quand :** post-MVP.
**Déclencheur :** ouverture de l'app après 20h sans ouverture.

```
Streak ≥ 7 jours → badge "🔥 7-day streak" discret sur l'icône tab Dashboard
Streak ≥ 30 jours → badge doré
Streak brisé → pas de punition — juste reset à 0

Stocké dans settings_extended : "daily_streak": "7", "last_open": "2026-04-17"
```

**Règle :** la streak est sur l'ouverture — jamais sur l'achat.
Un stacker qui n'a pas acheté cette semaine ne doit pas se sentir en échec.

**Edge cases streak :**
- Première ouverture → streak = 1, pas de badge
- Ouverture plusieurs fois le même jour → incrémenter une seule fois
- last_open date absente (premier lancement) → initialiser à 1
- Changement de timezone → tolérance de ±4h sur le seuil de 20h
- Device sans date système correcte → utiliser last_open relative, pas la date absolue
- Import JSON avec historique → ne pas recalculer la streak depuis l'historique

---

### 19. Flip animation à la création — Post-MVP

**Déclencheur :** animation d'entrée de la card à la création.
**Comportement :** la card fait un demi-tour (face → revers) avant de se stabiliser.

```
Phase 1 : card entre depuis le bas
Phase 2 : rotation Y 0° → 90° (disparaît)
Phase 3 : rotation Y 90° → 0° (réapparaît — face finale)
Durée totale : 600ms

Simule le geste naturel de retourner une pièce dans la main.
```

**Edge cases flip animation :**
- Reduced Motion activé → skip le flip, garder uniquement l'entrée depuis le bas
- Création rapide multiple → flip uniquement sur la dernière card, les précédentes apparaissent sans flip
- Skin avec gyroscope actif → désactiver le gyroscope pendant le flip pour éviter un conflit d'animation

---

### 20. Cinématique de création — Post-MVP

**Quand :** post-MVP. Remplace l'animation d'entrée simple (interaction 3) une fois les skins implémentés.
**Déclencheur :** bouton "Create" sur l'écran 3 du flow création.
**Référence visuelle :** `assets/references/item-creation-cinematic.html`

```
Acte 1 — Charge (0–600ms)
→ Logo StackLab apparaît au centre
→ Symboles cryptiques flottent (.9999, XAU/XAG, 1.000oz)
→ Anneaux d'énergie se forment
→ Logo pulse et s'accumule
→ Couleur selon le métal : violet+gold pour gold / violet+blue pour silver

Acte 2 — Explosion (600–1000ms)
→ Logo explose vers l'extérieur (scale 1 → 4 → 0)
→ 12 rayons de lumière
→ 4 anneaux explosent en cascade
→ Flash blanc
→ Particules gold (#FFD700) ou silver (#C0D8FF) selon le métal

Acte 3 — Révélation (1000ms+)
→ Titre drop depuis le haut ("Maple Leaf · Gold")
→ Card flip 3D — rotation Y 0° → 90° → 0°
→ Spring landing avec rebond
→ Sweep de lumière sur la card
→ Particules finales
```

**Durée totale :** ~3 secondes.
**Libs requises :** Reanimated 3 (withSpring, withTiming, withSequence), expo-sensors (gyroscope).
**Assets requis :** particles gold/silver (privés), sons selon le pack actif.

**Adaptation par métal :**
```
Gold   → particules #FFD700 + #FFA500, flash chaud
Silver → particules #C0D8FF + #90B8FF, flash froid
```

## Récapitulatif — MVP vs Post-MVP

### MVP Phase 2 — Implémenter maintenant

```
✅ Tap feedback (scale + glow métal + vibration légère)
✅ Appui long item (scale + ombre + vibration medium)
✅ Appui long deck (couches de stack qui s'écartent)
✅ Stack qui grossit (cards existantes se décalent)
✅ Animation d'entrée card à la création (scale + fade + glow burst)
✅ Son de création gold / silver
✅ Vibration "solide" à la création
✅ Counter animation sur les valeurs au chargement
✅ Share — capture card + share sheet natif + watermark logo
✅ Placeholder "card incomplète" (photo, purchase_price, year)
✅ Architecture SkinLayer (null en MVP, emplacement réservé)
```

### MVP Phase 3 — Après spot disponible

```
✅ "You got it under melt" — deal detector
✅ Wishlist gap — badge "Near melt"
```

### Post-MVP — Après bêta

```
→ Gyroscope / tilt parallax (lié aux skins premium)
→ Idle shimmer (lié aux skins premium)
→ Milestone celebrations (free + animations IAP)
→ Dashboard comparaison temporelle (après Phase 4 StackSnapshots)
→ Dashboard progression vers prochain milestone
→ Son au Quick Sell
→ Packs de sons IAP
→ Animation Realized P&L
→ Streak quotidien sur ouverture
→ Flip animation à la création
→ Skins complets item / deck / lab
```

---

## Libs requises

### MVP Phase 2

| Lib | Usage | Compatible Expo managed | Install |
|---|---|---|---|
| expo-haptics | Vibrations et retours haptiques | ✅ | `npx expo install expo-haptics` |
| expo-av | Sons de création et vente | ✅ | `npx expo install expo-av` |
| react-native-view-shot | Capture card pour Share | ✅ (listé dans Expo docs) | `npx expo install react-native-view-shot` |

### Post-MVP

| Lib | Usage | Compatible Expo managed | Install |
|---|---|---|---|
| expo-sensors | Gyroscope / tilt parallax | ✅ | `npx expo install expo-sensors` |
| react-native-confetti-cannon | Milestone celebrations | À vérifier | `npm install` |

---

## Ce qui N'EST PAS dans ce document

```
→ Animations de navigation (React Navigation gère ça)
→ Animations de loading / skeleton (à définir si nécessaire)
→ Animations des modals et bottom sheets (React Native Modal gère ça)
→ Animations de la map (non applicable)
```

---

*Dernière mise à jour : session design avril 2026*
*Propriétaire : Mounir*
