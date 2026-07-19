import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { colors, fonts } from '../../utils/theme';
import { BETA_CENTER_ENTRIES, DISCORD_INVITE_URL } from '../../data/betaCenterContent';

export function BetaCenterModal() {
    const { t } = useTranslation();
    const { showBetaCenter, closeBetaCenter, markBetaCenterSeen } = useSettingsStore();

    useEffect(() => {
        if (showBetaCenter) markBetaCenterSeen();
    }, [showBetaCenter, markBetaCenterSeen]);

    return (
        <Modal visible={showBetaCenter} animationType="slide" onRequestClose={closeBetaCenter}>
            <View style={styles.screen}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('betaCenter.title')}</Text>
                    <Pressable onPress={closeBetaCenter} hitSlop={8}>
                        <Ionicons name="close" size={22} color={colors.text2} />
                    </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    <Text style={styles.sectionLabel}>{t('betaCenter.whatsNew')}</Text>
                    {BETA_CENTER_ENTRIES.map(entry => (
                        <View key={entry.id} style={styles.entry}>
                            <Text style={styles.entryTitle}>{t(entry.titleKey)}</Text>
                            <Text style={styles.entryBody}>{t(entry.bodyKey)}</Text>
                        </View>
                    ))}

                    <Text style={styles.sectionLabel}>{t('betaCenter.discord.sectionLabel')}</Text>
                    <View style={styles.discordCard}>
                        <Ionicons name="logo-discord" size={28} color={colors.violet} />
                        <Text style={styles.discordTitle}>{t('betaCenter.discord.title')}</Text>
                        <Text style={styles.discordSubtitle}>{t('betaCenter.discord.subtitle')}</Text>
                        <Pressable style={styles.discordBtn} onPress={() => Linking.openURL(DISCORD_INVITE_URL)}>
                            <Text style={styles.discordBtnText}>{t('betaCenter.discord.button')}</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    },
    title: { fontFamily: fonts.manrope, fontSize: 18, color: colors.text },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionLabel: {
        fontSize: 9, letterSpacing: 2, color: colors.text2,
        fontFamily: fonts.outfitSemiBold, marginTop: 20, marginBottom: 10,
        textTransform: 'uppercase',
    },
    entry: {
        backgroundColor: colors.surface, borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 10,
    },
    entryTitle: { fontFamily: fonts.outfitSemiBold, fontSize: 15, color: colors.text, marginBottom: 6 },
    entryBody: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, lineHeight: 19 },
    discordCard: {
        backgroundColor: colors.surface, borderRadius: 14, padding: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', gap: 6,
    },
    discordTitle: { fontFamily: fonts.outfitSemiBold, fontSize: 15, color: colors.text, marginTop: 8 },
    discordSubtitle: {
        fontFamily: fonts.outfit, fontSize: 13, color: colors.text2,
        textAlign: 'center', lineHeight: 19, marginBottom: 10,
    },
    discordBtn: {
        backgroundColor: colors.violet, borderRadius: 14,
        paddingVertical: 14, paddingHorizontal: 28, width: '100%', alignItems: 'center',
    },
    discordBtnText: { fontFamily: fonts.outfitSemiBold, fontSize: 15, color: colors.text },
});
