import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLockStore } from '../../stores/lockStore';
import { PinKeypad } from '../common/PinKeypad';
import { triggerLight, triggerMedium } from '../../utils/haptics';
import { colors, fonts } from '../../utils/theme';

const PIN_LENGTH = 6;

function formatLockTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

type Props = {
    visible: boolean;
    title: string;
    onVerified: () => void;
    onClose: () => void;
};

export function PinVerifyModal({ visible, title, onVerified, onClose }: Props) {
    const verifyCurrentPin = useLockStore(s => s.verifyCurrentPin);
    const lockedUntil = useLockStore(s => s.lockedUntil);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [remainingLockMs, setRemainingLockMs] = useState(0);

    useEffect(() => {
        if (!visible) { setPin(''); setError(false); }
    }, [visible]);

    useEffect(() => {
        if (!lockedUntil) { setRemainingLockMs(0); return; }
        const tick = () => setRemainingLockMs(Math.max(0, lockedUntil - Date.now()));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [lockedUntil]);

    const isLockedOut = remainingLockMs > 0;

    function handleClose() {
        setPin('');
        setError(false);
        onClose();
    }

    async function handleDigit(digit: string) {
        if (isLockedOut) return;
        const next = pin + digit;
        setPin(next);
        triggerLight();
        if (next.length !== PIN_LENGTH) return;

        const success = await verifyCurrentPin(next);
        if (success) {
            setPin('');
            setError(false);
            onVerified();
        } else {
            setError(true);
            triggerMedium();
            setPin('');
            setTimeout(() => setError(false), 600);
        }
    }

    function handleBackspace() {
        setPin(p => p.slice(0, -1));
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{title}</Text>
                        <Pressable onPress={handleClose} hitSlop={8}>
                            <Ionicons name="close" size={22} color={colors.text2} />
                        </Pressable>
                    </View>

                    {isLockedOut ? (
                        <View style={styles.lockedBox}>
                            <Text style={styles.lockedText}>
                                Too many attempts. Try again in {formatLockTime(remainingLockMs)}.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.padBox}>
                            {error && (
                                <Text style={styles.errorText}>Incorrect PIN</Text>
                            )}
                            <PinKeypad
                                pin={pin}
                                error={error}
                                onDigit={handleDigit}
                                onBackspace={handleBackspace}
                            />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        width: '100%',
        paddingHorizontal: 24,
        paddingBottom: 32,
        gap: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 20,
    },
    cardTitle: { fontFamily: fonts.manrope, fontSize: 16, color: colors.text },
    padBox: { alignItems: 'center', gap: 16 },
    errorText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.crimson },
    lockedBox: { paddingVertical: 24, alignItems: 'center' },
    lockedText: { fontFamily: fonts.outfit, fontSize: 14, color: colors.crimson, textAlign: 'center' },
});
