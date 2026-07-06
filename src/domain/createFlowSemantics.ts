// Résout les prix du mode "mix" (création multi-lignes : années/finitions
// différentes) en une allocation par ligne. Jamais de prix global dupliqué
// silencieusement sur plusieurs items, jamais de répartition automatique
// (54 / 2), jamais 0 pour un prix non renseigné (null ≠ 0) — la règle Lot 5.2.
//
// Lot D2 : chaque ligne porte sa propre base de prix (unit | lotTotal). Le
// montant BRUT saisi + isPerUnit sont transmis tels quels au service, qui
// normalise vers le total et dérive le basis persisté (Lot B) — on ne
// pré-normalise pas ici, pour que la base d'origine soit conservée en base.
//
// Une ligne quantity > 1 avec un prix mais sans base choisie est ambiguë : la
// résolution renvoie 'needsBasis' avec les ids concernés, et l'appelant bloque
// la création (aucun item partiel n'est créé).

import type { PriceBasis } from '../types/item.types';
import { resolvePriceEntry } from './lotUnitValueSemantics';

export type CreationPriceRow = {
    id: string;
    quantity: number;
    priceText: string;
    // Base choisie pour cette ligne. null = prix vide OU (quantity > 1) base pas
    // encore choisie. quantity === 1 : la base est déduite 'unit' automatiquement.
    priceBasis: PriceBasis | null;
};

export type CreationRowAllocation = {
    id: string;
    quantity: number;
    // Montant brut saisi (null si vide) — jamais pré-normalisé ici.
    price: number | null;
    // Dérivé de la base : le service multiplie par quantity si true.
    isPerUnit: boolean;
};

export type MixPriceAllocationResult =
    | { status: 'ok'; allocations: CreationRowAllocation[] }
    | { status: 'needsBasis'; rowIds: string[] };

function parsePriceText(text: string): number | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const parsed = parseFloat(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

export function resolveMixPriceAllocation(rows: CreationPriceRow[]): MixPriceAllocationResult {
    const needsBasis: string[] = [];
    const allocations: CreationRowAllocation[] = rows.map(row => {
        const amount = parsePriceText(row.priceText);
        // resolvePriceEntry gère : vide → empty ; quantity 1 → unit auto ;
        // quantity > 1 sans base → needsBasis ; sinon ok + isPerUnit.
        const resolution = resolvePriceEntry({ amount, basis: row.priceBasis, quantity: row.quantity });
        if (resolution.status === 'needsBasis') needsBasis.push(row.id);
        return {
            id: row.id,
            quantity: row.quantity,
            price: amount,
            isPerUnit: resolution.status === 'ok' ? resolution.isPerUnit : false,
        };
    });
    if (needsBasis.length > 0) return { status: 'needsBasis', rowIds: needsBasis };
    return { status: 'ok', allocations };
}
