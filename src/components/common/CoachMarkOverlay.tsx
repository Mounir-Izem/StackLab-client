import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Mask, Defs } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useLockStore } from '../../stores/lockStore';
import { colors, fonts } from '../../utils/theme';

export type TargetRect = { x: number; y: number; width: number; height: number };

type Props = {
    visible: boolean;
    targetRect: TargetRect | null;
    text: string;
    onDismiss: () => void;
};

const HOLE_PADDING = 10;
const HOLE_RADIUS = 14;

export function CoachMarkOverlay({ visible, targetRect, text, onDismiss }: Props) {
    const { t } = useTranslation();
    // Modal toujours au-dessus de toute la hiérarchie native, y compris LockScreen
    // (rendue comme une simple View sibling, pas une Modal, dans App.tsx) — sans ce
    // garde, un coach mark peut s'afficher par-dessus l'écran de verrouillage.
    const isLocked = useLockStore(s => s.isLocked);
    if (!visible || !targetRect || isLocked) return null;

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const holeX = targetRect.x - HOLE_PADDING;
    const holeY = targetRect.y - HOLE_PADDING;
    const holeW = targetRect.width + HOLE_PADDING * 2;
    const holeH = targetRect.height + HOLE_PADDING * 2;

    const spaceBelow = screenH - (holeY + holeH);
    const tooltipTop = spaceBelow > 140 ? holeY + holeH + 16 : Math.max(60, holeY - 100);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
                <Svg width={screenW} height={screenH} style={StyleSheet.absoluteFill}>
                    <Defs>
                        <Mask id="coachMarkMask">
                            <Rect x={0} y={0} width={screenW} height={screenH} fill="white" />
                            <Rect
                                x={holeX} y={holeY} width={holeW} height={holeH}
                                rx={HOLE_RADIUS} ry={HOLE_RADIUS} fill="black"
                            />
                        </Mask>
                    </Defs>
                    <Rect
                        x={0} y={0} width={screenW} height={screenH}
                        fill="rgba(19,17,26,0.85)" mask="url(#coachMarkMask)"
                    />
                </Svg>
                <View style={[styles.tooltip, { top: tooltipTop }]}>
                    <Text style={styles.tooltipText}>{text}</Text>
                    <Text style={styles.tapHint}>{t('coachMark.tapHint')}</Text>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    tooltip: {
        position: 'absolute',
        left: 24,
        right: 24,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: 18,
        alignItems: 'center',
        gap: 6,
    },
    tooltipText: {
        fontFamily: fonts.manrope,
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 22,
    },
    tapHint: {
        fontFamily: fonts.outfit,
        fontSize: 11,
        color: colors.text2,
    },
});
