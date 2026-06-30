import React, { memo } from 'react';
import { Animated, View, Text, Image, StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useCardGestures } from '../../hooks/useCardGestures';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, fontSize, labCard } from '../../utils/theme';
import { formatCardValue } from '../../utils/formatters';
import { ShareCanvas } from './ShareCanvas';
import type { Lab } from '../../types/lab.types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const STANDARD_COVER = require('../../../assets/themes/Lab-Standard.png') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WISHLIST_COVER = require('../../../assets/themes/WishList.png') as number;

type LabCardProps = {
    lab: Lab;
    cards?: number;
    units?: number;
    totalOzGold?: number;
    totalOzSilver?: number;
    totalValue?: number | null;
    currency?: string;
    onPress?: () => void;
};

function LabCardComponent({
    lab,
    cards = 0,
    units = 0,
    totalOzGold = 0,
    totalOzSilver = 0,
    totalValue,
    currency = 'USD',
    onPress,
}: LabCardProps) {
    const displayValue = totalValue != null ? formatCardValue(totalValue, currency) : '—';

    const ozParts = [
        totalOzGold > 0 ? `${totalOzGold.toFixed(2)}oz Au` : null,
        totalOzSilver > 0 ? `${totalOzSilver.toFixed(2)}oz Ag` : null,
    ].filter(Boolean).join('  ·  ');

    const coverSource = lab.coverPhotoUrl
        ? { uri: lab.coverPhotoUrl }
        : lab.type === 'wishlist' ? WISHLIST_COVER : STANDARD_COVER;

    const isWishlist = lab.type === 'wishlist';

    const countLabel = lab.type === 'wishlist'
        ? `${cards} wishlist item${cards !== 1 ? 's' : ''}`
        : lab.type === 'trash'
            ? `${cards} item${cards !== 1 ? 's' : ''}`
            : `${cards} card${cards !== 1 ? 's' : ''} · ${units} unit${units !== 1 ? 's' : ''}`;

    const { cardRef, canvasRef, canvasOpacity, gesture, animatedStyle } = useCardGestures({
        onPress,
        buildShareText: () => {
            const parts = [
                totalOzGold > 0 ? `${totalOzGold.toFixed(2)}oz Au` : null,
                totalOzSilver > 0 ? `${totalOzSilver.toFixed(2)}oz Ag` : null,
            ].filter(Boolean).join(' · ');
            return `${lab.name} — ${countLabel}${parts ? `  ·  ${parts}` : ''}\nTracked with StackLab`;
        },
    });

    return (
        <View>
        <GestureDetector gesture={gesture}>
        <Animated.View ref={cardRef as any} style={[styles.card, animatedStyle]}>
            <Image source={coverSource} style={styles.cover} resizeMode="cover" />

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.74)', 'rgba(0,0,0,0.97)']}
                locations={[0, 0.42, 0.76, 1.0]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {isWishlist && (
                <View style={styles.wishlistBadge}>
                    <Text style={styles.wishlistBadgeText}>☆  WISHLIST</Text>
                </View>
            )}

            <View style={styles.content}>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{lab.name}</Text>
                    <Text style={styles.value}>{displayValue}</Text>
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                    {countLabel}
                    {ozParts ? `  ·  ${ozParts}` : ''}
                </Text>
            </View>
        </Animated.View>
        </GestureDetector>
        <ShareCanvas canvasRef={canvasRef} opacity={canvasOpacity}>
            <View style={styles.scCardWrap}>
                <Image source={coverSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.74)', 'rgba(0,0,0,0.97)']}
                    locations={[0, 0.42, 0.76, 1.0]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.content}>
                    <Text style={styles.name} numberOfLines={1}>{lab.name}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                        {countLabel}{ozParts ? `  ·  ${ozParts}` : ''}
                    </Text>
                    <Text style={styles.value}>{displayValue}</Text>
                </View>
            </View>
        </ShareCanvas>
        </View>
    );
}

export const LabCard = memo(LabCardComponent);

const styles = StyleSheet.create({
    cover: {
        width: '100%',
        height: '100%',
    },
    card: {
        aspectRatio: 2,
        borderRadius: labCard.borderRadius,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.10)',
        shadowColor: '#000',
        shadowOpacity: 0.55,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
        elevation: 12,
    },
    wishlistBadge: {
        position: 'absolute',
        top: 12,
        right: 14,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.42)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.20)',
    },
    wishlistBadgeText: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.70)',
        fontFamily: fonts.outfitSemiBold,
        letterSpacing: 1.5,
    },
    content: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    name: {
        fontFamily: fonts.manrope,
        fontSize: fontSize.labName,
        color: colors.text,
        letterSpacing: -0.5,
        flex: 1,
        marginRight: 14,
    },
    value: {
        fontFamily: fonts.dmMono,
        fontSize: fontSize.labValue,
        color: colors.text,
    },
    meta: {
        fontSize: fontSize.labSub,
        color: 'rgba(255,255,255,0.45)',
        fontFamily: fonts.outfit,
    },
    scCardWrap: { flex: 1 },
});
