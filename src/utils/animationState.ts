// Ephemeral singleton — ID du dernier item créé, consommé une seule fois par LabDetail/DeckDetail.
// N'est pas un store : pas de réactivité, pas de persistence, clear immédiat après lecture.
export const animationState = {
    lastCreatedItemId: null as string | null,
};
