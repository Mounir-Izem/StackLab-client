// Résout un draft de création (mode simple ou mix) en items à créer, chacun
// avec son propre prix — jamais un prix global dupliqué silencieusement sur
// plusieurs items, jamais une répartition automatique (54 / 2), jamais 0 pour
// un prix non renseigné (null ≠ 0).
//
// Le type du mode 'mix' n'accepte structurellement pas de prix global : la
// duplication qui causait ce bug (54 € copié sur 2 items générés séparément)
// devient impossible à réintroduire par erreur, pas seulement évitée par une
// condition. Couvre symétriquement purchasePrice (actif) et observedPrice
// (wishlist) — le mode mix n'est conditionné par aucun des deux.

export type CreationPriceRow = {
    id: string;
    quantity: number;
    priceText: string;
};

export type CreationPriceInput =
    | { mode: 'simple'; quantity: number; priceText: string; isPerUnit: boolean }
    | { mode: 'mix'; rows: CreationPriceRow[] };

export type CreationPriceAllocation = {
    id: string;
    quantity: number;
    price: number | null;
};

function parsePriceText(text: string): number | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const parsed = parseFloat(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

export function resolveCreationPriceAllocation(input: CreationPriceInput): CreationPriceAllocation[] {
    if (input.mode === 'simple') {
        const parsed = parsePriceText(input.priceText);
        const price = parsed !== null && input.isPerUnit ? parsed * input.quantity : parsed;
        return [{ id: 'single', quantity: input.quantity, price }];
    }
    return input.rows.map(row => ({
        id: row.id,
        quantity: row.quantity,
        price: parsePriceText(row.priceText),
    }));
}
