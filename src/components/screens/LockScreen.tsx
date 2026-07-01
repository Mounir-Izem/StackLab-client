import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLockStore } from '../../stores/lockStore';
import { lockService } from '../../services/lockService';
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

export function LockScreen() {
    const { t } = useTranslation();
    const { unlockWithPin, unlockWithBiometric, lockedUntil } = useLockStore();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [remainingLockMs, setRemainingLockMs] = useState(0);

    useEffect(() => {
        lockService.isBiometricAvailable().then(setBiometricAvailable);
    }, []);

    useEffect(() => {
        if (biometricAvailable) unlockWithBiometric();
    }, [biometricAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!lockedUntil) {
            setRemainingLockMs(0);
            return;
        }
        const tick = () => setRemainingLockMs(Math.max(0, lockedUntil - Date.now()));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [lockedUntil]);

    const isLockedOut = remainingLockMs > 0;

    async function handleDigit(digit: string) {
        if (isLockedOut) return;
        const next = pin + digit;
        setPin(next);
        triggerLight();

        if (next.length === PIN_LENGTH) {
            const success = await unlockWithPin(next);
            if (!success) {
                setError(true);
                triggerMedium();
                setPin('');
                setTimeout(() => setError(false), 600);
            }
        }
    }

    function handleBackspace() {
        setPin(p => p.slice(0, -1));
    }

    return (
        <Modal visible animationType="none" statusBarTranslucent>
            <View style={styles.screen}>
                <Ionicons name="lock-closed-outline" size={40} color={colors.violet} style={styles.icon} />
                <Text style={styles.title}>{t('applock.enterPin')}</Text>

                {isLockedOut ? (
                    <Text style={styles.lockedText}>
                        {t('applock.cooldown', { duration: formatLockTime(remainingLockMs) })}
                    </Text>
                ) : (
                    <PinKeypad
                        pin={pin}
                        error={error}
                        onDigit={handleDigit}
                        onBackspace={handleBackspace}
                        biometricIcon={biometricAvailable ? 'finger-print-outline' : undefined}
                        onBiometricPress={biometricAvailable ? () => unlockWithBiometric() : undefined}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1, backgroundColor: colors.bg,
        alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24,
    },
    icon: { marginBottom: -8 },
    title: { fontFamily: fonts.manrope, fontSize: 20, color: colors.text },
    lockedText: {
        fontFamily: fonts.outfit, fontSize: 14, color: colors.crimson,
        textAlign: 'center', paddingHorizontal: 32,
    },
});
