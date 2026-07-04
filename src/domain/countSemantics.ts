import type { LabType } from '../types/lab.types';

export type CountUnit = 'lots' | 'units' | 'wishes' | 'sales' | 'soldUnits' | 'objects';

export type CountSegment = {
    unit: CountUnit;
    count: number;
};

export type CountDisplayModel =
    | { kind: 'segments'; segments: CountSegment[] }
    | { kind: 'empty'; emptyKind: 'trashEmpty' };

// Tous les counts sont supposés entiers >= 0 — fournis par les services/stores,
// pas revalidés ici.

// groupedLotCount = nombre d'items ("rows") avec quantity > 1 — jamais le
// nombre total de rows. Un item quantity=1 est une unité individuelle, pas un
// lot, pour l'utilisateur (même s'il occupe une row en base).
export type ActiveHoldingCountInput = {
    groupedLotCount: number;
    unitCount: number;
};

// groupedLotCount === 0 : aucun item groupé, tout est en unités simples —
// "N lot(s) · N unité(s)" serait redondant/trompeur, n'afficher que les unités.
export function getActiveHoldingCountDisplay(input: ActiveHoldingCountInput): CountDisplayModel {
    if (input.groupedLotCount === 0) {
        return {
            kind: 'segments',
            segments: [{ unit: 'units', count: input.unitCount }],
        };
    }
    return {
        kind: 'segments',
        segments: [
            { unit: 'lots', count: input.groupedLotCount },
            { unit: 'units', count: input.unitCount },
        ],
    };
}

export type WishlistCountInput = {
    wishCount: number;
};

export function getWishlistCountDisplay(input: WishlistCountInput): CountDisplayModel {
    return {
        kind: 'segments',
        segments: [
            { unit: 'wishes', count: input.wishCount },
        ],
    };
}

export type SoldHistoryCountInput = {
    saleCount: number;
    soldUnitCount: number;
};

// saleCount === soldUnitCount (chaque vente = 1 unité) : "N vente(s) · N
// unité(s) vendue(s)" est redondant — n'afficher que les ventes.
export function getSoldHistoryCountDisplay(input: SoldHistoryCountInput): CountDisplayModel {
    if (input.saleCount === input.soldUnitCount) {
        return {
            kind: 'segments',
            segments: [{ unit: 'sales', count: input.saleCount }],
        };
    }
    return {
        kind: 'segments',
        segments: [
            { unit: 'sales', count: input.saleCount },
            { unit: 'soldUnits', count: input.soldUnitCount },
        ],
    };
}

export type TrashCountInput = {
    objectCount: number;
};

export function getTrashCountDisplay(input: TrashCountInput): CountDisplayModel {
    if (input.objectCount === 0) {
        return { kind: 'empty', emptyKind: 'trashEmpty' };
    }
    return {
        kind: 'segments',
        segments: [
            { unit: 'objects', count: input.objectCount },
        ],
    };
}

export type LabCardCountInput =
    | { labType: Extract<LabType, 'standard'>; groupedLotCount: number; unitCount: number }
    | { labType: Extract<LabType, 'wishlist'>; wishCount: number }
    | { labType: Extract<LabType, 'trash'>; objectCount: number };

export function getLabCardCountDisplay(input: LabCardCountInput): CountDisplayModel {
    switch (input.labType) {
        case 'standard':
            return getActiveHoldingCountDisplay({ groupedLotCount: input.groupedLotCount, unitCount: input.unitCount });
        case 'wishlist':
            return getWishlistCountDisplay({ wishCount: input.wishCount });
        case 'trash':
            return getTrashCountDisplay({ objectCount: input.objectCount });
    }
}
