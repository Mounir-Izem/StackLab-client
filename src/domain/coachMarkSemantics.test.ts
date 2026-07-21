import { hasSeenCoachMark, markCoachMarkSeen, COACH_MARK_IDS } from './coachMarkSemantics';

describe('hasSeenCoachMark', () => {
    test('liste vide → jamais vu', () => {
        expect(hasSeenCoachMark([], COACH_MARK_IDS.wishlist)).toBe(false);
    });

    test('ID présent dans la liste → vu', () => {
        expect(hasSeenCoachMark([COACH_MARK_IDS.wishlist], COACH_MARK_IDS.wishlist)).toBe(true);
    });

    test('un autre ID présent ne compte pas comme vu', () => {
        expect(hasSeenCoachMark([COACH_MARK_IDS.trash], COACH_MARK_IDS.wishlist)).toBe(false);
    });
});

describe('markCoachMarkSeen', () => {
    test('ajoute un nouvel ID à la liste', () => {
        expect(markCoachMarkSeen([], COACH_MARK_IDS.wishlist)).toEqual([COACH_MARK_IDS.wishlist]);
    });

    test('conserve les IDs déjà présents', () => {
        expect(markCoachMarkSeen([COACH_MARK_IDS.trash], COACH_MARK_IDS.wishlist))
            .toEqual([COACH_MARK_IDS.trash, COACH_MARK_IDS.wishlist]);
    });

    test('idempotent — ne duplique pas un ID déjà présent', () => {
        expect(markCoachMarkSeen([COACH_MARK_IDS.wishlist], COACH_MARK_IDS.wishlist))
            .toEqual([COACH_MARK_IDS.wishlist]);
    });
});
