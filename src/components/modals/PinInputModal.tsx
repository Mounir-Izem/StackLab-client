import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PinKeypad } from '../common/PinKeypad';
import { triggerLight, triggerMedium } from '../../utils/haptics';
import { colors, fonts } from '../../utils/theme';

const PIN_LENGTH = 6;

type Props = {
    visible: boolean;
    title: string;
    subtitle?: string;
    showError: boolean;
    onSubmit: (pin: string) => void;
    onClose: () => void;
};

export function PinInputModal({ visible, title, subtitle, showError, onSubmit, onClose }: Props) {
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!visible) {
            setPin('');
            setIsLoading(false);
        }
    }, [visible]);

    useEffect(() => {
        if (showError) {
            triggerMedium();
            setPin('');
            setIsLoading(false);
        }
    }, [showError]);

    function handleDigit(digit: string) {
        const next = pin + digit;
        setPin(next);
        triggerLight();
        if (next.length === PIN_LENGTH) {
            setIsLoading(true);
            onSubmit(next);
        }
    }

    function handleBackspace() {
        setPin(p => p.slice(0, -1));
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <Ionicons name="lock-closed-outline" size={28} color={colors.violet} style={styles.icon} />
                    <Text style={styles.title}>{title}</Text>
                    {subtitle && !isLoading && (
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    )}

                    {showError && !isLoading && (
                        <Text style={styles.errorText}>Wrong PIN — try again</Text>
                    )}

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.violet} />
                            <Text style={styles.loadingText}>Decrypting…</Text>
                        </View>
                    ) : (
                        <PinKeypad
                            pin={pin}
                            error={showError}
                            onDigit={handleDigit}
                            onBackspace={handleBackspace}
                        />
                    )}

                    {!isLoading && (
                        <Pressable style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 28, paddingBottom: 48, alignItems: 'center', gap: 16,
    },
    icon: { marginBottom: -4 },
    title: { fontFamily: fonts.manrope, fontSize: 18, color: colors.text, textAlign: 'center' },
    subtitle: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, textAlign: 'center' },
    errorText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.crimson },
    loadingContainer: { alignItems: 'center', gap: 12, paddingVertical: 24 },
    loadingText: { fontFamily: fonts.outfit, fontSize: 14, color: colors.text2 },
    cancelBtn: { marginTop: 4, paddingVertical: 10, paddingHorizontal: 24 },
    cancelText: { fontFamily: fonts.outfit, fontSize: 15, color: colors.text2 },
});
