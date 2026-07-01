import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { PinSetupModal } from './PinSetupModal';
import { colors, fonts } from '../../utils/theme';

export function AppLockPromptModal() {
    const { t } = useTranslation();
    const { settings, updateSettings } = useSettingsStore();
    const [showPinSetup, setShowPinSetup] = useState(false);

    const shouldShow = !!settings
        && settings.onboardingCompleted
        && !settings.appLockEnabled
        && !settings.appLockPromptShown;

    function dismiss() {
        updateSettings({ appLockPromptShown: true });
    }

    return (
        <>
            <Modal visible={shouldShow} animationType="slide" onRequestClose={dismiss}>
                <View style={styles.screen}>
                    <View style={styles.content}>
                        <Ionicons name="lock-closed-outline" size={52} color={colors.violet} style={styles.icon} />
                        <Text style={styles.heading}>{t('applock.prompt.heading')}</Text>
                        <Text style={styles.sub}>{t('applock.prompt.sub')}</Text>
                    </View>
                    <View style={styles.actions}>
                        <Pressable style={styles.primary} onPress={() => setShowPinSetup(true)}>
                            <Text style={styles.primaryText}>{t('applock.prompt.setupBtn')}</Text>
                        </Pressable>
                        <Pressable onPress={dismiss} hitSlop={8}>
                            <Text style={styles.skip}>{t('applock.prompt.skip')}</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <PinSetupModal
                visible={showPinSetup}
                onClose={() => setShowPinSetup(false)}
                onDone={() => { setShowPinSetup(false); dismiss(); }}
            />
        </>
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
