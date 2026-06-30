import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../utils/theme';

const PIN_LENGTH = 6;
const KEYPAD_ROWS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
];

type Props = {
    pin: string;
    error: boolean;
    onDigit: (digit: string) => void;
    onBackspace: () => void;
    biometricIcon?: keyof typeof Ionicons.glyphMap;
    onBiometricPress?: () => void;
};

export function PinKeypad({ pin, error, onDigit, onBackspace, biometricIcon, onBiometricPress }: Props) {
    return (
        <>
            <View style={styles.dotsRow}>
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i < pin.length && styles.dotFilled,
                            error && styles.dotError,
                        ]}
                    />
                ))}
            </View>

            <View style={styles.keypad}>
                {KEYPAD_ROWS.map((row, i) => (
                    <View key={i} style={styles.keypadRow}>
                        {row.map(digit => (
                            <Pressable key={digit} style={styles.key} onPress={() => onDigit(digit)}>
                                <Text style={styles.keyText}>{digit}</Text>
                            </Pressable>
                        ))}
                    </View>
                ))}
                <View style={styles.keypadRow}>
                    {biometricIcon && onBiometricPress ? (
                        <Pressable style={styles.key} onPress={onBiometricPress}>
                            <Ionicons name={biometricIcon} size={26} color={colors.text2} />
                        </Pressable>
                    ) : <View style={styles.key} />}
                    <Pressable style={styles.key} onPress={() => onDigit('0')}>
                        <Text style={styles.keyText}>0</Text>
                    </Pressable>
                    <Pressable style={styles.key} onPress={onBackspace}>
                        <Ionicons name="backspace-outline" size={22} color={colors.text2} />
                    </Pressable>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    dotsRow: { flexDirection: 'row', gap: 14 },
    dot: {
        width: 14, height: 14, borderRadius: 7,
        borderWidth: 1.5, borderColor: colors.text2,
    },
    dotFilled: { backgroundColor: colors.violet, borderColor: colors.violet },
    dotError: { backgroundColor: colors.crimson, borderColor: colors.crimson },
    keypad: { gap: 16 },
    keypadRow: { flexDirection: 'row', gap: 20 },
    key: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: colors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    keyText: { fontFamily: fonts.dmMono, fontSize: 24, color: colors.text },
});
