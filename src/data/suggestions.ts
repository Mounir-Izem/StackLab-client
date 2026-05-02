import type { ItemMetal, ItemShape } from '../types/item.types';

export type Suggestion = {
    name: string;
    familyKey: string;
    metal: ItemMetal;
    defaultPurity: number;
    defaultShape: ItemShape;
};

export const SUGGESTIONS: Suggestion[] = [
    // SILVER — Bullion Standard
    { name: 'American Silver Eagle',       familyKey: 'american-silver-eagle-silver',   metal: 'silver', defaultPurity: 0.999,  defaultShape: 'coin' },
    { name: 'Canadian Silver Maple Leaf',  familyKey: 'canadian-maple-leaf-silver',     metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Australian Silver Kangaroo',  familyKey: 'australian-kangaroo-silver',     metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'British Silver Britannia',    familyKey: 'british-britannia-silver',       metal: 'silver', defaultPurity: 0.999,  defaultShape: 'coin' },
    { name: 'Vienna Silver Philharmonic',  familyKey: 'vienna-philharmonic-silver',     metal: 'silver', defaultPurity: 0.999,  defaultShape: 'coin' },
    { name: 'Silver Krugerrand',           familyKey: 'krugerrand-silver',              metal: 'silver', defaultPurity: 0.999,  defaultShape: 'coin' },
    { name: 'Mexican Silver Libertad',     familyKey: 'mexican-libertad-silver',        metal: 'silver', defaultPurity: 0.999,  defaultShape: 'coin' },

    // SILVER — Thématique
    { name: 'Perth Lunar Series III',      familyKey: 'perth-lunar-series-iii-silver',  metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Perth Lunar Series II',       familyKey: 'perth-lunar-series-ii-silver',   metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Perth Lunar Series I',        familyKey: 'perth-lunar-series-i-silver',    metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Australian Silver Kookaburra',familyKey: 'australian-kookaburra-silver',   metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Australian Silver Koala',     familyKey: 'australian-koala-silver',        metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Australian Silver Swan',      familyKey: 'australian-swan-silver',         metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'RCM Predator Series',         familyKey: 'rcm-predator-silver',            metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'RCM Wildlife Series',         familyKey: 'rcm-wildlife-silver',            metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Tudor Beasts',                familyKey: 'tudor-beasts-silver',            metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: "Queen's Beasts",              familyKey: 'queens-beasts-silver',           metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Chinese Silver Panda',        familyKey: 'chinese-panda-silver',           metal: 'silver', defaultPurity: 0.999,  defaultShape: 'coin' },
    { name: 'Scottsdale Stacker',          familyKey: 'scottsdale-stacker-silver',      metal: 'silver', defaultPurity: 0.999,  defaultShape: 'coin' },
    { name: 'Scottsdale Lion',             familyKey: 'scottsdale-lion-silver',         metal: 'silver', defaultPurity: 0.999,  defaultShape: 'coin' },

    // SILVER — Pop culture
    { name: 'Perth Mint DC Comics',        familyKey: 'perth-dc-silver',                metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Perth Mint Marvel',           familyKey: 'perth-marvel-silver',            metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Perth Mint Star Wars',        familyKey: 'perth-star-wars-silver',         metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Perth Mint Harry Potter',     familyKey: 'perth-harry-potter-silver',      metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'NZ Mint Marvel',              familyKey: 'nz-mint-marvel-silver',          metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'NZ Mint DC Comics',           familyKey: 'nz-mint-dc-silver',              metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'NZ Mint Star Wars',           familyKey: 'nz-mint-star-wars-silver',       metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'NZ Mint Disney',              familyKey: 'nz-mint-disney-silver',          metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'RCM Looney Tunes',            familyKey: 'rcm-looney-tunes-silver',        metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'RCM Star Trek',               familyKey: 'rcm-star-trek-silver',           metal: 'silver', defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Kraken Series',               familyKey: 'kraken-silver',                  metal: 'silver', defaultPurity: 0.999,  defaultShape: 'coin' },

    // SILVER — Barres
    { name: 'PAMP Suisse Silver Bar',      familyKey: 'pamp-suisse-silver',             metal: 'silver', defaultPurity: 0.999,  defaultShape: 'bar' },
    { name: 'Valcambi Silver Bar',         familyKey: 'valcambi-silver',               metal: 'silver', defaultPurity: 0.999,  defaultShape: 'bar' },
    { name: 'Scottsdale Silver Bar',       familyKey: 'scottsdale-silver',              metal: 'silver', defaultPurity: 0.999,  defaultShape: 'bar' },
    { name: 'RCM Silver Bar',              familyKey: 'rcm-silver',                     metal: 'silver', defaultPurity: 0.9999, defaultShape: 'bar' },
    { name: 'Perth Mint Silver Bar',       familyKey: 'perth-silver',                   metal: 'silver', defaultPurity: 0.9999, defaultShape: 'bar' },
    { name: 'Engelhard Silver Bar',        familyKey: 'engelhard-silver',               metal: 'silver', defaultPurity: 0.999,  defaultShape: 'bar' },
    { name: 'Johnson Matthey Silver Bar',  familyKey: 'jm-silver',                      metal: 'silver', defaultPurity: 0.999,  defaultShape: 'bar' },

    // GOLD — Bullion Standard
    { name: 'American Gold Eagle',         familyKey: 'american-gold-eagle-gold',       metal: 'gold',   defaultPurity: 0.9167, defaultShape: 'coin' },
    { name: 'American Gold Buffalo',       familyKey: 'american-gold-buffalo-gold',     metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Canadian Gold Maple Leaf',    familyKey: 'canadian-maple-leaf-gold',       metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Australian Gold Kangaroo',    familyKey: 'australian-kangaroo-gold',       metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'British Gold Britannia',      familyKey: 'british-britannia-gold',         metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'British Gold Sovereign',      familyKey: 'british-sovereign-gold',         metal: 'gold',   defaultPurity: 0.9167, defaultShape: 'coin' },
    { name: 'Vienna Gold Philharmonic',    familyKey: 'vienna-philharmonic-gold',       metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Gold Krugerrand',             familyKey: 'krugerrand-gold',                metal: 'gold',   defaultPurity: 0.9167, defaultShape: 'coin' },
    { name: 'Mexican Gold Libertad',       familyKey: 'mexican-libertad-gold',          metal: 'gold',   defaultPurity: 0.999,  defaultShape: 'coin' },

    // GOLD — Thématique
    { name: 'Perth Lunar Series III Gold', familyKey: 'perth-lunar-series-iii-gold',    metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Perth Lunar Series II Gold',  familyKey: 'perth-lunar-series-ii-gold',     metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'coin' },
    { name: 'Chinese Gold Panda',          familyKey: 'chinese-panda-gold',             metal: 'gold',   defaultPurity: 0.999,  defaultShape: 'coin' },

    // GOLD — Barres
    { name: 'PAMP Suisse Gold Bar',        familyKey: 'pamp-suisse-gold',               metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'bar' },
    { name: 'Valcambi Gold Bar',           familyKey: 'valcambi-gold',                  metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'bar' },
    { name: 'Credit Suisse Gold Bar',      familyKey: 'credit-suisse-gold',             metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'bar' },
    { name: 'Johnson Matthey Gold Bar',    familyKey: 'jm-gold',                        metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'bar' },
    { name: 'Perth Mint Gold Bar',         familyKey: 'perth-gold',                     metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'bar' },
    { name: 'RCM Gold Bar',                familyKey: 'rcm-gold',                       metal: 'gold',   defaultPurity: 0.9999, defaultShape: 'bar' },
];

export function filterSuggestions(query: string): Suggestion[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return SUGGESTIONS.filter(s => s.name.toLowerCase().includes(q)).slice(0, 6);
}
