import React, { memo } from 'react';
import { Animated, View, Text, Image, StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useCardGestures } from '../../hooks/useCardGestures';
import { ShareCanvas } from './ShareCanvas';
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

type ItemCardProps = {
    item: Item;
    meltValue?: number | null;
    currency?: string;
    weightUnit?: WeightUnit;
    onPress?: () => void;
};

function ItemCardComponent({ item, meltValue, currency = 'USD', weightUnit = 'oz', onPress }: ItemCardProps) {
    const metal = metalTokens[item.metal];
    const { rates } = useSpotStore();

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

    const { cardRef, canvasRef, canvasOpacity, gesture, animatedStyle } = useCardGestures({
        onPress,
        buildShareText: () =>
            `My ${item.name}${item.year ? ` ${item.year}` : ''} — ${item.quantity}×${item.weightOz.toFixed(2)}oz ${item.metal}\nTracked with StackLab`,
    });

    return (
        <View>
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
            {/* Shimmer directionnel — source lumière haut-gauche */}
            <LinearGradient
                colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)', 'transparent']}
                locations={[0, 0.28, 0.65]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.9 }}
                style={StyleSheet.absoluteFill}
            />
            {/* Vignette coins */}
            <LinearGradient
                colors={['rgba(0,0,0,0.22)', 'transparent', 'rgba(0,0,0,0.32)']}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* ── SKIN LAYER — null MVP ── */}

            {/* ── CONTENT LAYER ── */}
            <View style={[styles.innerFrame, { borderColor: metal.frameBorder }]} pointerEvents="none" />

            {isSold ? (
                <View style={[styles.metalBadge, styles.soldBadge]}>
                    <Text style={[styles.metalBadgeText, { color: colors.crimson }]}>SOLD</Text>
                </View>
            ) : (
                <View style={[styles.metalBadge, { backgroundColor: metal.badgeBg, borderColor: metal.badgeBorder }]}>
                    <Text style={[styles.metalBadgeText, { color: metal.color }]}>{item.metal.toUpperCase()}</Text>
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
                        <Text style={styles.noPhotoText}>+ Add photo</Text>
                    </View>
                )}
            </View>

            {isWishlist && <View style={styles.wishlistVeil} pointerEvents="none" />}
            {isSold && <View style={styles.soldVeil} pointerEvents="none" />}

            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {sub ? <Text style={styles.sub}>{sub}</Text> : null}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>Wt</Text>
                        <Text style={styles.statVal}>{formatWeight(item.weightOz, weightUnit)}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>Fine</Text>
                        <Text style={styles.statVal}>{purityStr}</Text>
                    </View>
                    <View style={[styles.stat, { alignItems: 'flex-end' }]}>
                        <Text style={styles.statLabel}>
                            {isWishlist ? 'Observed' : isSold ? 'Sold' : 'Value'}
                        </Text>
                        <Text style={[styles.mainVal, { color: valueColor }]}>{displayValue}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
        </GestureDetector>
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
                        {isSold ? 'SOLD' : item.metal.toUpperCase()}
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
                            <Text style={styles.statLabel}>Wt</Text>
                            <Text style={styles.statVal}>{formatWeight(item.weightOz, weightUnit)}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Fine</Text>
                            <Text style={styles.statVal}>{purityStr}</Text>
                        </View>
                        <View style={[styles.stat, { alignItems: 'flex-end' }]}>
                            <Text style={styles.statLabel}>
                                {isWishlist ? 'Observed' : isSold ? 'Sold' : 'Value'}
                            </Text>
                            <Text style={[styles.mainVal, { color: valueColor }]}>{displayValue}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </ShareCanvas>
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
    sub: {
        fontSize: fontSize.cardSub,
        color: 'rgba(255,255,255,0.45)',
        marginTop: 1,
        marginBottom: 6,
        fontFamily: fonts.outfit,
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
