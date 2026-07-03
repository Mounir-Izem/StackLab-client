import React, { memo, useRef, useState } from 'react';
import { Animated, View, Text, Image, StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useCardGestures } from '../../hooks/useCardGestures';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, fontSize, deckCard } from '../../utils/theme';
import { formatCardValue } from '../../utils/formatters';
import { ShareCanvas } from './ShareCanvas';
import { ContextMenu } from '../ui/ContextMenu';
import type { ContextMenuAction } from '../ui/ContextMenu';
import type { Deck } from '../../types/deck.types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DECK_COVER = require('../../../assets/themes/Deck-Standard.png') as number;

type DeckCardProps = {
    deck: Deck;
    itemCount?: number;
    totalValue?: number | null;
    currency?: string;
    subDeckCount?: number;
    onPress?: () => void;
    menuActions?: ContextMenuAction[];
};

function DeckCardComponent({
    deck,
    itemCount = 0,
    totalValue,
    currency = 'USD',
    subDeckCount = 0,
    onPress,
    menuActions = [],
}: DeckCardProps) {
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();

    const [menuVisible, setMenuVisible] = useState(false);

    // Layers spread sur long press — s'écartent vers l'extérieur puis reviennent
    const layerSpread = useRef(new Animated.Value(0)).current;

    const displayValue = totalValue != null ? formatCardValue(totalValue, currency) : '—';
    const coverSource = deck.coverPhotoUrl ? { uri: deck.coverPhotoUrl } : DECK_COVER;

    function triggerLayerSpread() {
        if (reduceMotion) return;
        Animated.sequence([
            Animated.spring(layerSpread, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
            Animated.delay(350),
            Animated.spring(layerSpread, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 0 }),
        ]).start();
    }

    const { cardRef, canvasRef, canvasOpacity, gesture, animatedStyle, glowAnim, handleShare } = useCardGestures({
        onPress,
        onLongPress: menuActions.length > 0 ? () => { setMenuVisible(true); triggerLayerSpread(); } : undefined,
        buildShareText: () =>
            `${deck.name} — ${t('common.lots', { count: itemCount })}\nTracked with StackLab`,
        glowColor: 'rgba(200,200,230,0.5)',
        reduceMotion,
    });

    const shareAction: ContextMenuAction = { label: t('item.actions.share'), icon: 'share-outline', onPress: handleShare };
    const effectiveMenuActions: ContextMenuAction[] = menuActions.length > 0 ? [
        ...menuActions.filter(a => !a.destructive),
        shareAction,
        ...menuActions.filter(a => a.destructive),
    ] : menuActions;

    const layer3Transform = reduceMotion ? undefined : {
        transform: [
            { translateY: layerSpread.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
            { translateX: layerSpread.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
        ],
    };

    const layer2Transform = reduceMotion ? undefined : {
        transform: [
            { translateY: layerSpread.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] }) },
            { translateX: layerSpread.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) },
        ],
    };

    return (
        <View>
        <GestureDetector gesture={gesture}>
        <Animated.View ref={cardRef as any} style={[styles.stackWrapper, animatedStyle]}>
            <Animated.View style={[styles.layer3, layer3Transform]} />
            <Animated.View style={[styles.layer2, layer2Transform]} />

            <View style={styles.card}>
                <Image source={coverSource} style={styles.cover} resizeMode="cover" />

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.74)', 'rgba(0,0,0,0.97)']}
                    locations={[0, 0.42, 0.76, 1.0]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                {/* Glow tap overlay */}
                <Animated.View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(200,200,230,1)', opacity: glowAnim }]}
                />

                <View style={styles.content}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>{deck.name}</Text>
                        <Text style={styles.value}>{displayValue}</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={styles.meta}>
                            {t('common.lots', { count: itemCount })}
                        </Text>
                        {subDeckCount > 0 && (
                            <View style={styles.subChip}>
                                <Text style={styles.subChipText}>
                                    {t('deck.subDecks', { count: subDeckCount })}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
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
                    <Text style={styles.name} numberOfLines={1}>{deck.name}</Text>
                    <Text style={styles.meta}>{t('common.lots', { count: itemCount })}  ·  {displayValue}</Text>
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

export const DeckCard = memo(DeckCardComponent);

const styles = StyleSheet.create({
    stackWrapper: {
        paddingTop: 8,
        paddingLeft: 6,
        shadowColor: '#000',
        shadowRadius: 14,
        shadowOffset: { width: 2, height: 5 },
        elevation: 10,
    },
    layer3: {
        position: 'absolute',
        top: 0,
        left: 3,
        right: -3,
        bottom: 4,
        backgroundColor: '#2C2845',
        borderRadius: deckCard.borderRadius,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.04)',
        opacity: 0.5,
    },
    layer2: {
        position: 'absolute',
        top: 4,
        left: 1.5,
        right: -1.5,
        bottom: 2,
        backgroundColor: colors.surface2,
        borderRadius: deckCard.borderRadius,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.06)',
        opacity: 0.75,
    },
    cover: {
        width: '100%',
        height: '100%',
    },
    card: {
        aspectRatio: 2.5,
        borderRadius: deckCard.borderRadius,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.10)',
    },
    content: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 14,
        paddingBottom: 12,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    name: {
        fontFamily: fonts.manrope,
        fontSize: fontSize.deckName,
        color: colors.text,
        letterSpacing: -0.5,
        flex: 1,
        marginRight: 10,
    },
    value: {
        fontFamily: fonts.dmMono,
        fontSize: fontSize.deckValue,
        color: colors.text,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    meta: {
        fontSize: fontSize.deckMeta,
        color: 'rgba(255,255,255,0.45)',
        fontFamily: fonts.outfit,
    },
    subChip: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    subChipText: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.50)',
        fontFamily: fonts.outfit,
    },
    scCardWrap: { flex: 1 },
});
