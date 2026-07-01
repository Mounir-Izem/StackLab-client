import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { triggerSuccess } from '../../utils/haptics';
import { colors, fonts } from '../../utils/theme';
import type { Settings } from '../../types/settings.types';
import type { OnboardingStackScreenProps } from '../../navigation/types';

type Props = OnboardingStackScreenProps<'OnboardingBackupPrompt'>;

const CLOUD_NAME = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

export function OnboardingBackupPrompt(_props: Props) {
    const { t } = useTranslation();
    const updateSettings = useSettingsStore(s => s.updateSettings);
    const [confirmed, setConfirmed] = useState(false);

    function finish(data: Partial<Omit<Settings, 'updatedAt'>>, afterConfirm?: () => void) {
        setConfirmed(true);
        triggerSuccess();
        setTimeout(async () => {
            await updateSettings(data);
            if (afterConfirm) setTimeout(afterConfirm, 500);
        }, 400);
    }

    function handleEnable() {
        finish({ autoBackupEnabled: true, onboardingCompleted: true }, () => {
            Linking.openSettings();
        });
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
                <Text style={styles.heading}>
                    {confirmed ? t('onboarding.backup.gotIt') : t('onboarding.backup.title')}
                </Text>
                {!confirmed && (
                    <>
                        <Text style={styles.sub}>
                            {t('onboarding.backup.subtitle', { cloud: CLOUD_NAME })}
                        </Text>
                        <Text style={[styles.sub, styles.hint]}>
                            {t('onboarding.backup.hint')}
                        </Text>
                    </>
                )}
            </View>
            {!confirmed && (
                <View style={styles.actions}>
                    <Pressable style={styles.primary} onPress={handleEnable}>
                        <Text style={styles.primaryText}>{t('onboarding.backup.enable')}</Text>
                    </Pressable>
                    <Pressable onPress={handleManual} hitSlop={8}>
                        <Text style={styles.skip}>{t('onboarding.backup.manual')}</Text>
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
    hint: {
        marginTop: 14,
        fontSize: 13,
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
