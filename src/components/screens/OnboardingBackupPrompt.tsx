import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { colors, fonts } from '../../utils/theme';
import type { OnboardingStackScreenProps } from '../../navigation/types';

type Props = OnboardingStackScreenProps<'OnboardingBackupPrompt'>;

export function OnboardingBackupPrompt(_props: Props) {
    const updateSettings = useSettingsStore(s => s.updateSettings);

    async function handleEnable() {
        await updateSettings({ autoBackupEnabled: true, onboardingCompleted: true });
    }

    async function handleManual() {
        await updateSettings({ backupReminder: true, onboardingCompleted: true });
    }

    return (
        <View style={styles.screen}>
            <View style={styles.content}>
                <Ionicons name="shield-checkmark-outline" size={52} color={colors.violet} style={styles.icon} />
                <Text style={styles.heading}>Protect your stack</Text>
                <Text style={styles.sub}>
                    Enable auto-backup so your data is always safe — no cloud required.
                </Text>
            </View>
            <View style={styles.actions}>
                <Pressable style={styles.primary} onPress={handleEnable}>
                    <Text style={styles.primaryText}>Enable auto-backup</Text>
                </Pressable>
                <Pressable onPress={handleManual} hitSlop={8}>
                    <Text style={styles.skip}>I'll export manually</Text>
                </Pressable>
            </View>
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
