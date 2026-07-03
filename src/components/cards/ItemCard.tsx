import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, View, Text, Image, StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useCardGestures } from '../../hooks/useCardGestures';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ShareCanvas } from './ShareCanvas';
import { ContextMenu } from '../ui/ContextMenu';
import type { ContextMenuAction } from '../ui/ContextMenu';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
    colors, fonts, fontSize, letterSpacing,
    card, metalTokens,
} from '../../utils/theme';
import { formatCardValue, formatStrikeLabel, formatWeight } from '../../utils/formatters';
import { useSpotStore } from '../../stores/spotStore';
import type { Item } from '../../types/item.types';
import type { WeightUnit } from '../../types/settings.types';
import type { MeltBadge } from '../../utils/meltAnalysis';

type ItemCardProps = {
    item: Item;
    meltValue?: number | null;
    currency?: string;
    weightUnit?: WeightUnit;
    onPress?: () => void;
    isNew?: boolean;
    onNewAnimationEnd?: () => void;
    menuActions?: ContextMenuAction[];
    noAutoShare?: boolean;
    meltBadge?: MeltBadge;
    showMissingPrice?: boolean;
    showYearDot?: boolean;
};

function ItemCardComponent({
    item, meltValue, currency = 'USD', weightUnit = 'oz', onPress,
    isNew = false, onNewAnimationEnd, menuActions = [], noAutoShare = false,
    meltBadge = null, showMissingPrice = false, showYearDot = false,
}: ItemCardProps) {
    const { t } = useTranslation();
    const metal = metalTokens[item.metal];
    const { rates } = useSpotStore();
    const reduceMotion = useReducedMotion();

    const [menuVisible, setMenuVisible] = useState(false);

    // Entry animation — outer wrapper (translateY + scale)
    const entryTranslateY = useRef(new Animated.Value(0)).current;
    const entryScale = useRef(new Animated.Value(1)).current;
    // Glow burst — inside the card
    const glowBurstOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!isNew || reduceMotion) {
            entryTranslateY.setValue(0);
            entryScale.setValue(1);
            glowBurstOpacity.setValue(0);
            onNewAnimationEnd?.();
            return;
        }
        entryTranslateY.setValue(40);
        entryScale.setValue(0.8);
        glowBurstOpacity.setValue(0);

        Animated.parallel([
            Animated.spring(entryTranslateY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
            Animated.sequence([
                Animated.spring(entryScale, { toValue: 1.05, useNativeDriver: true, speed: 12, bounciness: 0 }),
                Animated.spring(entryScale, { toValue: 1.0, useNativeDriver: true, speed: 20, bounciness: 0 }),
            ]),
            Animated.sequence([
                Animated.timing(glowBurstOpacity, { toValue: 0.6, duration: 150, useNativeDriver: true }),
                Animated.timing(glowBurstOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
        ]).start(() => { onNewAnimationEnd?.(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isNew]);

    const strikeLabel = item.strikeFinish && item.strikeFinish !== 'unknown'
        ? formatStrikeLabel(item.strikeFinish) : null;
    const sub = [item.year?.toString(), strikeLabel].filter(Boolean).join(' · ');
    const purityStr = item.purity.toFixed(4).slice(1);

    let numericValue: number | null;
    let displayValue: string;

    if (item.status === 'sold') {
        numericValue = item.soldPrice ?? null;
        displayValue = formatCardValue(numericValue, item.soldCurrency ?? currency);
    } else if (item.status === 'wishlist') {
        numericValue = item.observedPrice ?? null;
        displayValue = formatCardValue(numericValue, item.observedCurrency ?? currency);
    } else {
        numericValue = meltValue ?? item.observedPrice ?? null;
        displayValue = formatCardValue(numericValue, currency);
    }

    const valueColor = (() => {
        if (numericValue === null) return colors.text;
        if (item.status !== 'active' || meltValue == null || item.purchasePrice === null) return colors.text;
        const purchaseCur = item.purchaseCurrency ?? 'USD';
        const purchaseUsd = purchaseCur === 'USD' ? item.purchasePrice
            : (rates[purchaseCur] ? item.purchasePrice * rates[purchaseCur] : null);
        if (purchaseUsd === null) return colors.text;
        const purchaseInDisplay = currency === 'USD' ? purchaseUsd
            : (rates[currency] ? purchaseUsd / rates[currency] : null);
        if (purchaseInDisplay === null) return colors.text;
        if (meltValue > purchaseInDisplay) return colors.green;
        if (meltValue < purchaseInDisplay) return colors.crimson;
        return colors.text;
    })();

    const isSold = item.status === 'sold';
    const isWishlist = item.status === 'wishlist';

    const observedPremiumAmount = (() => {
        if (!isWishlist || item.observedPrice == null || meltValue == null || meltValue <= 0) return null;
        const obsCur = item.observedCurrency ?? 'USD';
        const obsInUsd = obsCur === 'USD' ? item.observedPrice
            : (rates[obsCur] ? item.observedPrice * rates[obsCur] : null);
        if (obsInUsd === null) return null;
        const obsInDisplay = currency === 'USD' ? obsInUsd
            : (rates[currency] ? obsInUsd / rates[currency] : null);
        if (obsInDisplay === null) return null;
        return obsInDisplay - meltValue;
    })();
    const observedPremiumPct = observedPremiumAmount !== null && meltValue != null
        ? observedPremiumAmount / meltValue
        : null;

    const { cardRef, canvasRef, canvasOpacity, gesture, animatedStyle, glowAnim, handleShare } = useCardGestures({
        onPress,
        onLongPress: menuActions.length > 0 ? () => setMenuVisible(true) : undefined,
        buildShareText: () =>
            `My ${item.name}${item.year ? ` ${item.year}` : ''} — ${item.quantity}×${item.weightOz.toFixed(2)}oz ${item.metal}\nTracked with StackLab`,
        glowColor: metal.color,
        reduceMotion,
    });

    // Share injecté automatiquement entre les actions non-destructives et destructives
    const shareAction: ContextMenuAction = { label: t('item.actions.share'), icon: 'share-outline', onPress: handleShare };
    const effectiveMenuActions: ContextMenuAction[] = (menuActions.length > 0 && !noAutoShare) ? [
        ...menuActions.filter(a => !a.destructive),
        shareAction,
        ...menuActions.filter(a => a.destructive),
    ] : menuActions;

    return (
        <View>
        {/* Entry animation wrapper — translateY + scale séparés de l'animation tap */}
        <Animated.View style={{ transform: [{ translateY: entryTranslateY }, { scale: entryScale }] }}>
        <GestureDetector gesture={gesture}>
        <Animated.View
            ref={cardRef as any}
            style={[styles.wrapper, animatedStyle, {
                borderColor: metal.frameBorder,
                shadowColor: metal.color,
            }]}
        >
            {/* ── BASE LAYER ── */}
            <LinearGradient
                colors={metal.gradient}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)', 'transparent']}
                locations={[0, 0.28, 0.65]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.9 }}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={['rgba(0,0,0,0.22)', 'transparent', 'rgba(0,0,0,0.32)']}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* ── SKIN LAYER — null MVP ── */}

            {/* Glow tap overlay */}
            <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: metal.color, opacity: glowAnim }]}
            />

            {/* Glow burst entrée */}
            <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: metal.color, opacity: glowBurstOpacity }]}
            />

            {/* ── CONTENT LAYER ── */}
            <View style={[styles.innerFrame, { borderColor: metal.frameBorder }]} pointerEvents="none" />

            {isSold ? (
                <View style={[styles.metalBadge, styles.soldBadge]}>
                    <Text style={[styles.metalBadgeText, { color: colors.crimson }]}>{t('item.status.sold')}</Text>
                </View>
            ) : (
                <View style={[styles.metalBadge, { backgroundColor: metal.badgeBg, borderColor: metal.badgeBorder }]}>
                    <Text style={[styles.metalBadgeText, { color: metal.color }]}>{t(`item.metal.${item.metal}`)}</Text>
                </View>
            )}

            {isWishlist ? (
                <View style={styles.wishlistIcon}>
                    <Ionicons name="cloud-outline" size={13} color="rgba(255,255,255,0.85)" />
                </View>
            ) : item.quantity > 1 ? (
                <View style={[styles.qtyBadge, isSold && styles.qtyBadgeSold]}>
                    <Text style={[styles.qtyText, isSold && styles.qtyTextSold]}>×{item.quantity}</Text>
                </View>
            ) : null}

            <View style={styles.photoArea}>
                {item.photoUrl ? (
                    <View style={[styles.coinGlow, { shadowColor: metal.color, elevation: isSold ? 0 : 12 }]}>
                        <View style={[styles.coinRing, { borderColor: metal.frameBorder }]}>
                            <Image source={{ uri: item.photoUrl }} style={styles.coinPhoto} resizeMode="cover" />
                        </View>
                    </View>
                ) : (
                    <View style={[styles.coinPlaceholder, { borderColor: metal.frameBorder }]}>
                        <Text style={styles.cameraIcon}>⊕</Text>
                        <Text style={styles.noPhotoText}>{t('item.card.addPhoto')}</Text>
                    </View>
                )}
            </View>

            {isWishlist && <View style={styles.wishlistVeil} pointerEvents="none" />}
            {isSold && <View style={styles.soldVeil} pointerEvents="none" />}

            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {(sub || showYearDot) ? (
                    <View style={styles.subRow}>
                        {sub ? <Text style={styles.sub} numberOfLines={1}>{sub}</Text> : null}
                        {showYearDot ? <View style={styles.yearDot} /> : null}
                    </View>
                ) : null}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('item.card.wt')}</Text>
                        <Text style={styles.statVal}>{formatWeight(item.weightOz, weightUnit)}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('item.card.fine')}</Text>
                        <Text style={styles.statVal}>{purityStr}</Text>
                    </View>
                    <View style={[styles.stat, { alignItems: 'flex-end' }]}>
                        <Text style={styles.statLabel}>
                            {isWishlist ? t('item.card.observed') : isSold ? t('item.card.sold') : t('item.card.value')}
                        </Text>
                        <Text style={[styles.mainVal, { color: valueColor }]}>{displayValue}</Text>
                    </View>
                </View>
                {isWishlist && observedPremiumAmount !== null && observedPremiumPct !== null ? (
                    <View style={styles.meltBadgeWrap}>
                        <Text style={styles.meltBadgeText}>
                            {observedPremiumAmount >= 0 ? '+' : ''}{(observedPremiumPct * 100).toFixed(1)}%
                            {' · '}
                            {observedPremiumAmount >= 0 ? '+' : '-'}{formatCardValue(Math.abs(observedPremiumAmount), currency)}
                        </Text>
                    </View>
                ) : meltBadge ? (
                    <View style={[styles.meltBadgeWrap, meltBadge === 'under' && styles.meltBadgeUnder]}>
                        <Text style={styles.meltBadgeText}>
                            {t(meltBadge === 'under' ? 'item.badges.underMelt' : 'item.badges.nearMelt')}
                        </Text>
                    </View>
                ) : showMissingPrice ? (
                    <View style={styles.missingPriceRow}>
                        <Ionicons name="add-circle-outline" size={9} color="rgba(255,255,255,0.30)" />
                        <Text style={styles.missingPriceText}>{t('item.hints.addPurchasePrice')}</Text>
                    </View>
                ) : null}
            </View>
        </Animated.View>
        </GestureDetector>
        </Animated.View>

        <ShareCanvas canvasRef={canvasRef} opacity={canvasOpacity}>
            <View style={styles.scCardWrap}>
                <LinearGradient colors={metal.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'transparent']}
                    locations={[0, 0.3, 0.7]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.9 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.metalBadge, isSold ? styles.soldBadge : { backgroundColor: metal.badgeBg, borderColor: metal.badgeBorder }]}>
                    <Text style={[styles.metalBadgeText, { color: isSold ? colors.crimson : metal.color }]}>
                        {isSold ? t('item.status.sold') : t(`item.metal.${item.metal}`)}
                    </Text>
                </View>
                {item.quantity > 1 && (
                    <View style={styles.qtyBadge}>
                        <Text style={styles.qtyText}>×{item.quantity}</Text>
                    </View>
                )}
                <View style={styles.scPhotoArea}>
                    {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={styles.scPhoto} resizeMode="cover" />
                    ) : null}
                </View>
                <View style={styles.scContent}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    {sub ? <Text style={styles.sub}>{sub}</Text> : null}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.card.wt')}</Text>
                            <Text style={styles.statVal}>{formatWeight(item.weightOz, weightUnit)}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.card.fine')}</Text>
                            <Text style={styles.statVal}>{purityStr}</Text>
                        </View>
                        <View style={[styles.stat, { alignItems: 'flex-end' }]}>
                            <Text style={styles.statLabel}>
                                {isWishlist ? t('item.card.observed') : isSold ? t('item.card.sold') : t('item.card.value')}
                            </Text>
                            <Text style={[styles.mainVal, { color: valueColor }]}>{displayValue}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </ShareCanvas>

        <ContextMenu
            visible={menuVisible}
            actions={effectiveMenuActions}
            onClose={() => setMenuVisible(false)}
        />
        </View>
    );
}

export const ItemCard = memo(ItemCardComponent);

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: card.borderRadius,
        overflow: 'hidden',
        aspectRatio: card.aspectRatio,
        borderWidth: 0.5,
        shadowOpacity: 0.55,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    innerFrame: {
        position: 'absolute',
        top: card.frameInset,
        left: card.frameInset,
        right: card.frameInset,
        bottom: card.frameInset,
        borderRadius: card.frameRadius,
        borderWidth: 0.5,
        pointerEvents: 'none',
    },
    metalBadge: {
        position: 'absolute',
        top: card.badgeOffset,
        left: card.badgeOffset,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 0.5,
        zIndex: 3,
    },
    soldBadge: {
        backgroundColor: 'rgba(180,30,30,0.22)',
        borderColor: 'rgba(180,30,30,0.45)',
    },
    metalBadgeText: {
        fontSize: fontSize.cardBadge,
        letterSpacing: letterSpacing.badge,
        fontFamily: fonts.outfitSemiBold,
        textTransform: 'uppercase',
    },
    wishlistIcon: {
        position: 'absolute',
        top: card.badgeOffset,
        right: card.badgeOffset,
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: 'rgba(153,69,255,0.28)',
        borderWidth: 0.5,
        borderColor: 'rgba(153,69,255,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    wishlistVeil: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(153,69,255,0.18)',
        zIndex: 1,
    },
    qtyBadge: {
        position: 'absolute',
        top: card.badgeOffset,
        right: card.badgeOffset,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.28)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.20)',
        zIndex: 3,
    },
    qtyText: {
        fontSize: fontSize.cardQtyBadge,
        color: 'rgba(255,255,255,0.75)',
        fontFamily: fonts.outfitSemiBold,
    },
    qtyBadgeSold: {
        backgroundColor: 'rgba(180,30,30,0.22)',
        borderColor: 'rgba(180,30,30,0.45)',
    },
    qtyTextSold: {
        color: colors.crimson,
    },
    photoArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: card.photoPaddingTop,
        paddingHorizontal: card.photoPaddingH,
    },
    coinGlow: {
        width: '88%',
        aspectRatio: 1,
        borderRadius: 999,
        shadowOpacity: 0.75,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 6 },
    },
    coinRing: {
        width: '100%',
        height: '100%',
        borderRadius: 999,
        borderWidth: 0.5,
        overflow: 'hidden',
    },
    coinPhoto: {
        width: '100%',
        height: '100%',
    },
    coinPlaceholder: {
        width: '88%',
        aspectRatio: 1,
        borderRadius: 999,
        borderWidth: 0.5,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    cameraIcon: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.30)',
    },
    noPhotoText: {
        fontSize: 7,
        color: 'rgba(255,255,255,0.30)',
        letterSpacing: 0.5,
        fontFamily: fonts.outfit,
    },
    content: {
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: card.contentPaddingH,
        paddingTop: 8,
        paddingBottom: card.contentPaddingV,
    },
    name: {
        fontFamily: fonts.manrope,
        fontSize: fontSize.cardName,
        color: colors.text,
        letterSpacing: -0.5,
    },
    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 1,
        marginBottom: 6,
    },
    sub: {
        fontSize: fontSize.cardSub,
        color: 'rgba(255,255,255,0.45)',
        fontFamily: fonts.outfit,
        flexShrink: 1,
    },
    yearDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    meltBadgeWrap: {
        alignSelf: 'flex-start',
        marginTop: 5,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.20)',
    },
    meltBadgeUnder: {
        backgroundColor: 'rgba(80,200,120,0.15)',
        borderColor: 'rgba(80,200,120,0.40)',
    },
    meltBadgeText: {
        fontSize: 8,
        fontFamily: fonts.outfitSemiBold,
        color: 'rgba(255,255,255,0.65)',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    missingPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 5,
    },
    missingPriceText: {
        fontSize: 8,
        fontFamily: fonts.outfit,
        color: 'rgba(255,255,255,0.28)',
        letterSpacing: 0.3,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    stat: { gap: 2 },
    statLabel: {
        fontSize: fontSize.cardStatLabel,
        letterSpacing: letterSpacing.label,
        color: 'rgba(255,255,255,0.30)',
        fontFamily: fonts.outfit,
    },
    statVal: {
        fontSize: fontSize.cardStatValue,
        color: 'rgba(255,255,255,0.80)',
        fontFamily: fonts.outfitMedium,
    },
    mainVal: {
        fontFamily: fonts.dmMono,
        fontSize: fontSize.cardMainValue,
    },
    soldVeil: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.40)',
        zIndex: 2,
    },
    scCardWrap: { flex: 1 },
    scPhotoArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scPhoto: { width: 56, height: 56, borderRadius: 28 },
    scContent: {
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: card.contentPaddingH,
        paddingTop: 8,
        paddingBottom: card.contentPaddingV,
    },
});
