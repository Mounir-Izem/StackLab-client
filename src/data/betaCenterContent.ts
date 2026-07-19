// Contenu du Centre bêta (Phase 10D) — 100% local, embarqué au build, pas de backend.
// CONTENT_VERSION change à chaque ajout d'entrée pour redéclencher le badge non-lu
// (comparé à settings.betaCenterLastSeenVersion, voir domain/betaCenterSemantics.ts).
export const BETA_CENTER_CONTENT_VERSION = '2026-07-24';

export const DISCORD_INVITE_URL = 'https://discord.gg/QK45sfx3M';

export type BetaCenterEntry = {
    id: string;
    titleKey: string;
    bodyKey: string;
};

export const BETA_CENTER_ENTRIES: BetaCenterEntry[] = [
    {
        id: 'welcome-beta',
        titleKey: 'betaCenter.entries.welcome.title',
        bodyKey: 'betaCenter.entries.welcome.body',
    },
];
