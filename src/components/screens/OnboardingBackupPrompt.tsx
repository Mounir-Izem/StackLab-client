import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { triggerSuccess } from '../../utils/haptics';
import { colors, fonts } from '../../utils/theme';
import type { Settings } from '../../types/settings.types';
import type { OnboardingStackScreenProps } from '../../navigation/types';

type Props = OnboardingStackScreenProps<'OnboardingBackupPrompt'>;

const CLOUD_NAME = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

export function OnboardingBackupPrompt(_props: Props) {
    const updateSettings = useSettingsStore(s => s.updateSettings);
    const [confirmed, setConfirmed] = useState(false);

    function finish(data: Partial<Omit<Settings, 'updatedAt'>>) {
        setConfirmed(true);
        triggerSuccess();
        setTimeout(() => { updateSettings(data); }, 400);
    }

    function handleEnable() {
        finish({ autoBackupEnabled: true, onboardingCompleted: true });
    }

    function handleManual() {
        finish({ backupReminder: true, onboardingCompleted: true });
    }

    return (
        <View style={styles.screen}>
            <View style={styles.content}>
                <Ionicons
                    name={confirmed ? 'checkmark-circle' : 'shield-checkmark-outline'}
                    size={52}
                    color={colors.violet}
                    style={styles.icon}
                />
                <Text style={styles.heading}>{confirmed ? 'Got it' : 'Protect your stack'}</Text>
                {!confirmed && (
                    <Text style={styles.sub}>
                        We'll automatically save a backup to your {CLOUD_NAME} — nothing leaves your
                        phone except to your own {CLOUD_NAME}.{'\n\n'}You can turn this on or off
                        anytime in Settings.
                    </Text>
                )}
            </View>
            {!confirmed && (
                <View style={styles.actions}>
                    <Pressable style={styles.primary} onPress={handleEnable}>
                        <Text style={styles.primaryText}>Enable auto-backup</Text>
                    </Pressable>
                    <Pressable onPress={handleManual} hitSlop={8}>
                        <Text style={styles.skip}>I'll export manually</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    icon: { marginBottom: 24 },
    heading: {
        fontFamily: fonts.manrope,
        fontSize: 28,
        color: colors.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    sub: {
        fontFamily: fonts.outfit,
        fontSize: 15,
        color: colors.text2,
        textAlign: 'center',
        lineHeight: 22,
    },
    actions: {
        paddingHorizontal: 24,
        paddingBottom: 56,
        gap: 16,
        alignItems: 'center',
    },
    primary: {
        width: '100%',
        backgroundColor: colors.violet,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    primaryText: {
        fontFamily: fonts.outfitSemiBold,
        fontSize: 16,
        color: colors.text,
    },
    skip: {
        fontFamily: fonts.outfit,
        fontSize: 14,
        color: colors.text2,
    },
});
