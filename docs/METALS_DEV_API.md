# METALS_DEV_API.md — metals.dev API Reference
> Documentation des endpoints metals.dev utilisés par le proxy StackLab.
> Source : documentation officielle metals.dev (lue en avril 2026).
> À lire avant d'implémenter le proxy en Phase 3.
> Le proxy expose sa propre API au client — voir API_CONTRACTS.md section 1.

---

## Base URL

```
https://api.metals.dev/v1/
```

## Authentification

Clé API en query parameter sur chaque requête :
```
?api_key=YOUR_API_KEY
```

La clé API est stockée **uniquement en variable d'environnement Railway** — jamais dans le code.

---

## Endpoints utilisés par StackLab

### 1. Latest Rates — Endpoint principal

C'est l'endpoint utilisé par le proxy en Phase 3. Il retourne les prix spot de tous les métaux + les taux de change.

#### Requête

```
GET https://api.metals.dev/v1/latest?api_key=API_KEY&currency=USD&unit=toz
```

**Paramètres :**

| Paramètre | Requis | Défaut | Description |
|---|---|---|---|
| `api_key` | oui | — | Clé API du compte |
| `currency` | non | USD | Code devise ISO 4217 |
| `unit` | non | toz | Unité. `toz` = troy oz (StackLab utilise toz exclusivement) |

#### Réponse complète (200)

```json
{
  "status": "success",
  "currency": "USD",
  "unit": "toz",
  "metals": {
    "gold": 1923.86,
    "silver": 22.905,
    "platinum": 916.569,
    "palladium": 1229.684,
    "lbma_gold_am": 1929.75,
    "lbma_gold_pm": 1927.75,
    "lbma_silver": 23.005,
    "lbma_platinum_am": 922,
    "lbma_platinum_pm": 918,
    "lbma_palladium_am": 1251,
    "lbma_palladium_pm": 1241,
    "mcx_gold": 2212.307,
    "mcx_silver": 26.3951,
    "copper": 0.2584,
    "aluminum": 0.067,
    "nickel": 0.6355,
    "zinc": 0.0745
  },
  "currencies": {
    "USD": 1,
    "EUR": 1.08798,
    "GBP": 1.27026,
    "CAD": 0.75564,
    "AUD": 0.66825,
    "XAU": 1923.88,
    "XAG": 22.9155
  },
  "timestamps": {
    "metal": "2023-07-05T06:16:02.829Z",
    "currency": "2023-07-05T06:16:04.229Z"
  }
}
```

**Ce que le proxy extrait pour StackLab :**

```javascript
// Depuis la réponse metals.dev
const gold   = response.metals.gold;   // Prix spot XAU en toz
const silver = response.metals.silver; // Prix spot XAG en toz

// Taux de change si la devise demandée n'est pas USD
// Si currency=EUR : gold_en_eur = gold / currencies.EUR
// Note : les currencies sont exprimées en taux USD/devise
// Ex: EUR = 1.08798 signifie 1 USD = 0.92 EUR
// Pour convertir : prix_en_devise = prix_usd * (1 / currencies[devise])
```

**Note sur la conversion de devise :**

Les valeurs dans `currencies` sont des taux de change où USD = 1.
Pour convertir un prix gold de USD vers EUR :

```
gold_usd = 1923.86
eur_rate = 1.08798  // 1 USD = 1/1.08798 EUR... attention
```

**Attention piège :** les valeurs dans `currencies` représentent combien d'unités de cette devise valent 1 USD. Donc EUR = 1.08798 signifie que 1 EUR vaut 1.08798 USD, soit 1 USD = 0.919 EUR.

Pour convertir gold de USD → EUR :
```
gold_eur = gold_usd / currencies.EUR
gold_eur = 1923.86 / 1.08798 = 1768.25 EUR
```

---

### 2. Spot Metal Endpoint — Optionnel Phase 3

Retourne bid, ask, high, low, change pour un métal spécifique.
Utile pour afficher les variations quotidiennes dans SpotHome.

#### Requête

```
GET https://api.metals.dev/v1/metal/spot?api_key=API_KEY&metal=gold&currency=USD
```

**Paramètres :**

| Paramètre | Requis | Valeurs |
|---|---|---|
| `api_key` | oui | — |
| `metal` | oui | gold, silver, platinum, palladium |
| `currency` | non | Code devise ISO 4217 |

#### Réponse (200)

```json
{
  "status": "success",
  "timestamp": "2023-07-05T07:10:01.933Z",
  "currency": "USD",
  "unit": "toz",
  "metal": "gold",
  "rate": {
    "price": 1923.76,
    "ask": 1923.63,
    "bid": 1922.96,
    "high": 1927.17,
    "low": 1920.91,
    "change": -2.67,
    "change_percent": -0.14
  }
}
```

**Usage StackLab :** si on veut afficher la variation quotidienne sur SpotHome.
En MVP Phase 3 : pas obligatoire — le Latest endpoint suffit.
Post-MVP : utile pour le widget de variation (+/- journalière).

---

### 3. Authority Endpoint — LBMA

Pour les fixings officiels LBMA (London Bullion Market Association).
Utile si StackLab veut afficher les prix officiels du fixing AM/PM.

#### Requête

```
GET https://api.metals.dev/v1/metal/authority?api_key=API_KEY&authority=lbma&currency=USD&unit=toz
```

#### Réponse (200)

```json
{
  "status": "success",
  "authority": "lbma",
  "currency": "USD",
  "unit": "default",
  "timestamp": "2023-07-05T07:39:01.363Z",
  "rates": {
    "lbma_gold_am": 1929.75,
    "lbma_gold_pm": 1927.75,
    "lbma_silver": 23.005,
    "lbma_platinum_am": 922,
    "lbma_platinum_pm": 918,
    "lbma_palladium_am": 1251,
    "lbma_palladium_pm": 1241
  }
}
```

**Note :** les fixings LBMA sont aussi disponibles directement dans le Latest endpoint
(`lbma_gold_am`, `lbma_gold_pm`, `lbma_silver`). Pas besoin d'un appel séparé.

---

### 4. Timeseries — Historique quotidien

Pour les graphiques historiques (feature premium Phase 4+).

#### Requête

```
GET https://api.metals.dev/v1/timeseries?api_key=API_KEY&start_date=2026-01-01&end_date=2026-01-10
```

**Contrainte importante :** maximum 30 jours par requête.
Pour plus de 30 jours → plusieurs requêtes.

#### Réponse (200) — Structure par date

```json
{
  "status": "success",
  "currency": "USD",
  "unit": "toz",
  "start_date": "2026-01-01",
  "end_date": "2026-01-10",
  "rates": {
    "2026-01-01": {
      "date": "2026-01-01",
      "metals": {
        "gold": 1824.0852,
        "silver": 23.969,
        "platinum": 1065.9958,
        "palladium": 1782.0547
      },
      "currencies": {
        "USD": 1,
        "EUR": 1.0696,
        "GBP": 1.2101,
        "CAD": 0.738798,
        "AUD": 0.681756
      }
    }
  }
}
```

**Usage StackLab :** non utilisé en MVP. Nécessaire pour les graphiques historiques premium (StackSnapshots visuels).

---

### 5. Usage Endpoint — Monitoring quota

Pour suivre la consommation API et anticiper les dépassements.

#### Requête

```
GET https://api.metals.dev/usage?api_key=API_KEY
```

**Note :** URL différente — pas de `/v1/` dans ce cas.

#### Réponse (200)

```json
{
  "status": "success",
  "timestamp": "2026-04-17T12:19:11.066Z",
  "plan": "Basic",
  "total": 1000,
  "used": 147,
  "remaining": 853
}
```

**Usage StackLab :** le proxy peut appeler cet endpoint au démarrage pour logger le quota restant. Utile pour anticiper les dépassements avant la fin du mois.

---

## Réponse d'erreur

```json
{
  "status": "failure",
  "error_code": 1101,
  "error_message": "Unauthorized. The API Key provided is invalid."
}
```

**Codes d'erreur importants pour le proxy :**

| Code | Description | Action proxy |
|---|---|---|
| 1101 | Clé API invalide | Log erreur critique — vérifier variable env |
| 1201 | Plan inactif | Log erreur critique — vérifier paiement |
| 1203 | Quota mensuel dépassé | Retourner 503 au client avec last_known |
| 2101 | Paramètre non supporté | Log + retourner 400 |
| 2103 | Devise non supportée | Retourner 400 au client |

---

## Ce que le proxy fait avec la réponse metals.dev

Le proxy ne transmet pas la réponse brute au client. Il la normalise :

```java
// Réponse metals.dev → réponse proxy StackLab

// Entrée metals.dev
{
  "status": "success",
  "metals": { "gold": 3287.40, "silver": 33.47, ... },
  "currencies": { "USD": 1, "EUR": 1.08798, ... },
  "timestamps": { "metal": "2026-04-17T14:32:00Z", ... }
}

// Sortie proxy (API_CONTRACTS.md)
{
  "gold": 3287.40,
  "silver": 33.47,
  "currency": "USD",
  "updated_at": "2026-04-17T14:32:00Z",
  "source": "metals.dev",
  "cached": false
}
```

**Logique de conversion devise dans le proxy :**

```java
// Si currency=EUR demandé par le client
double goldUsd = metalsDevResponse.metals.gold;
double eurRate = metalsDevResponse.currencies.get("EUR"); // ex: 1.08798

// EUR rate = "1 EUR = 1.08798 USD" → pour USD→EUR : diviser par rate
double goldEur = goldUsd / eurRate;
```

**Cache 5 minutes dans le proxy :**

Le proxy met en cache la réponse metals.dev pendant 5 minutes.
Pendant ce temps, toutes les requêtes client reçoivent la réponse cachée
avec `"cached": true`.
À l'expiration du cache, le proxy rappelle metals.dev.

---

## Unités supportées

metals.dev supporte plusieurs unités. **StackLab utilise exclusivement `toz` (troy oz).**

```
toz  → troy ounce  (défaut StackLab — toujours passer &unit=toz)
g    → gram
kg   → kilogram
oz   → ounce (avoirdupois — différent du troy oz)
```

**Toutes les conversions d'unité dans StackLab se font côté client**,
pas en demandant une unité différente à metals.dev.
Le proxy appelle toujours metals.dev avec `unit=toz`.

---

## Devises supportées par StackLab

StackLab supporte 5 devises (PRODUCT_DECISIONS.md section Settings) :

| Devise | Code | Disponible dans metals.dev |
|---|---|---|
| Dollar US | USD | ✅ |
| Euro | EUR | ✅ |
| Livre Sterling | GBP | ✅ |
| Dollar Canadien | CAD | ✅ |
| Dollar Australien | AUD | ✅ |

Toutes présentes dans la réponse Latest. Aucun appel supplémentaire nécessaire.

---

## Quotas et TTL

| Plan | Requêtes/mois | Prix |
|---|---|---|
| Free | 100 | 0€ |
| Paid (starting) | + | $1.49/mois |

**Calcul de consommation StackLab :**

```
TTL cache proxy = 5 minutes
Heures de marché ≈ 160h/mois (8h/jour × 20 jours ouvrés)
Requêtes/mois = 160h × 60min / 5min = 1 920 requêtes/mois
```

Le plan gratuit (100 req/mois) est insuffisant.
Le premier plan payant est suffisant pour la phase de développement et bêta.

---

*Dernière mise à jour : session design avril 2026*
*Source : https://metals.dev/docs*
*Propriétaire : Mounir*
