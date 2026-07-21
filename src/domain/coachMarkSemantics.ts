// Onboarding V2 Lot B — IDs stables persistés dans Settings.seenCoachMarks.
// Ne jamais renommer une valeur existante : ça referait réapparaître le mark
// pour les utilisateurs qui l'avaient déjà vu.
export const COACH_MARK_IDS = {
    wishlist: 'labs.wishlist',
    trash: 'labs.trash',
    dashboardValue: 'dashboard.totalValue',
    spotPrice: 'spot.price',
    settingsGear: 'settings.gear',
} as const;

export type CoachMarkId = typeof COACH_MARK_IDS[keyof typeof COACH_MARK_IDS];

export function hasSeenCoachMark(seenIds: string[], markId: CoachMarkId): boolean {
    return seenIds.includes(markId);
}

export function markCoachMarkSeen(seenIds: string[], markId: CoachMarkId): string[] {
    if (seenIds.includes(markId)) return seenIds;
    return [...seenIds, markId];
}
