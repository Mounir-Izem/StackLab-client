import React from 'react';
import { Animated, Image, View, Text, StyleSheet } from 'react-native';
import { fonts } from '../../utils/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../assets/icon.png') as number;

type Props = {
    canvasRef: React.RefObject<View | null>;
    opacity: Animated.Value;
    children: React.ReactNode;
};

export function ShareCanvas({ canvasRef, opacity, children }: Props) {
    return (
        <Animated.View ref={canvasRef as any} style={[StyleSheet.absoluteFill, styles.canvas, { opacity }]} pointerEvents="none">
            <View style={styles.header}>
                <Image source={LOGO} style={styles.logo} />
                <Text style={styles.brand}>StackLab</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardArea}>
                {children}
            </View>
            <View style={styles.divider} />
            <View style={styles.footer}>
                <Text style={styles.footerText}>POWERED BY STACKLAB  ✦</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    canvas: {
        backgroundColor: '#13111A',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(153,69,255,0.35)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        backgroundColor: 'rgba(153,69,255,0.08)',
    },
    logo: {
        width: 20,
        height: 20,
        borderRadius: 6,
    },
    brand: {
        fontFamily: fonts.manrope,
        fontSize: 13,
        color: '#9945FF',
        letterSpacing: 0.5,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(153,69,255,0.25)',
    },
    cardArea: {
        flex: 1,
        margin: 8,
        borderRadius: 10,
        overflow: 'hidden',
    },
    footer: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        alignItems: 'center',
        backgroundColor: 'rgba(0,255,117,0.05)',
    },
    footerText: {
        fontFamily: fonts.outfitSemiBold,
        fontSize: 7,
        color: '#00FF75',
        letterSpacing: 2,
    },
});
