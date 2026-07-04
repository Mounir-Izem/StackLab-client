// Résout un draft de saisie quantité (string libre pendant la frappe) en
// entier métier valide — jamais appelé pendant la frappe elle-même (onBlur /
// submit uniquement), pour ne pas piéger l'utilisateur qui vide le champ
// temporairement pour retaper une valeur.
// Règle métier : quantity finale toujours >= 1, jamais 0 ni NaN.
export function resolveQuantityDraft(draft: string, max?: number): number {
    const parsed = parseInt(draft, 10);
    const safe = !Number.isFinite(parsed) || parsed < 1 ? 1 : parsed;
    return max !== undefined ? Math.min(max, safe) : safe;
}
