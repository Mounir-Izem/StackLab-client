export const colors = {
    bg: '#13111A',
    surface: '#1E1B2E',
    surface2: '#252238',
    border: 'rgba(255,255,255,0.08)',
    text: '#FFFFFF',
    text2: '#888899',
    text3: 'rgba(255,255,255,0.30)',
    violet: '#9945FF',
    green: '#00D26A',
    gold: '#C9A84C',
    silver: '#A8A9AD',
    orange: '#FF9944',
    crimson: '#B41E1E',
} as const;

export const fonts = {
    outfit: 'Outfit_400Regular',
    outfitMedium: 'Outfit_500Medium',
    outfitSemiBold: 'Outfit_600SemiBold',
    manrope: 'Manrope_700Bold',
    dmMono: 'DMMono_500Medium',
} as const;

export const fontSize = {
    cardName: 13,
    cardSub: 9,
    cardStatLabel: 7,
    cardStatValue: 10,
    cardMainValue: 13,
    cardBadge: 8,
    cardQtyBadge: 9,
    labName: 17,
    labSub: 11,
    labValue: 18,
    labStatValue: 13,
    labStatLabel: 9,
    deckName: 15,
    deckMeta: 11,
    deckValue: 15,
    deckCount: 10,
} as const;

export const letterSpacing = {
    badge: 1.5,
    label: 1,
    sectionLabel: 2,
    pageTitle: 3,
} as const;

export const card = {
    aspectRatio: 2 / 3,
    borderRadius: 16,
    frameInset: 4,
    frameRadius: 12,
    gridGap: 12,
    contentPaddingH: 10,
    contentPaddingV: 8,
    photoPaddingTop: 32,
    photoPaddingH: 16,
    badgeOffset: 10,
} as const;

export const labCard = {
    borderRadius: 18,
} as const;

export const deckCard = {
    borderRadius: 16,
} as const;

export const metalTokens = {
    gold: {
        color: colors.gold,
        badgeBg: 'rgba(0,0,0,0.32)',
        badgeBorder: 'rgba(255,205,70,0.55)',
        frameBorder: 'rgba(255,205,70,0.55)',
        gradient: ['#DEB840', '#A07820', '#5A3A08'] as [string, string, string],
    },
    silver: {
        color: colors.silver,
        badgeBg: 'rgba(0,0,0,0.32)',
        badgeBorder: 'rgba(200,204,212,0.55)',
        frameBorder: 'rgba(200,204,212,0.55)',
        gradient: ['#C0C4CC', '#888C96', '#484C55'] as [string, string, string],
    },
} as const;
