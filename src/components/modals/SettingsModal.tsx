import React from 'react';
import {
    Modal, View, Text, Pressable,
    StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { colors, fonts } from '../../utils/theme';
import type { Currency, WeightUnit } from '../../types/settings.types';

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const WEIGHT_UNITS: WeightUnit[] = ['oz', 'g', 'kg'];

export function SettingsModal() {
    const { settings, showSettings, closeSettings, updateSettings } = useSettingsStore();

    async function handleCurrency(currency: Currency) {
        await updateSettings({ currency });
    }

    async function handleWeightUnit(weightUnit: WeightUnit) {
        await updateSettings({ weightUnit });
    }

    return (
        <Modal
            visible={showSettings}
            animationType="slide"
            transparent
            onRequestClose={closeSettings}
        >
            <Pressable style={styles.backdrop} onPress={closeSettings} />
            <View style={styles.sheet}>
                <View style={styles.handle} />

                <View style={styles.header}>
                    <Text style={styles.title}>Settings</Text>
                    <Pressable onPress={closeSettings} hitSlop={8}>
                        <Ionicons name="close" size={22} color={colors.text2} />
                    </Pressable>
                </View>

                {!settings ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={colors.violet} />
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Currency */}
                        <Text style={styles.sectionLabel}>CURRENCY</Text>
                        <View style={styles.chipRow}>
                            {CURRENCIES.map(c => (
                                <Pressable
                                    key={c}
                                    style={[styles.chip, settings.currency === c && styles.chipActive]}
                                    onPress={() => handleCurrency(c)}
                                >
                                    <Text style={[styles.chipText, settings.currency === c && styles.chipTextActive]}>
                                        {c}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Weight unit */}
                        <Text style={styles.sectionLabel}>WEIGHT UNIT</Text>
                        <View style={styles.chipRow}>
                            {WEIGHT_UNITS.map(u => (
                                <Pressable
                                    key={u}
                                    style={[styles.chip, settings.weightUnit === u && styles.chipActive]}
                                    onPress={() => handleWeightUnit(u)}
                                >
                                    <Text style={[styles.chipText, settings.weightUnit === u && styles.chipTextActive]}>
                                        {u}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Data */}
                        <Text style={styles.sectionLabel}>DATA</Text>
                        <Pressable style={styles.row} disabled>
                            <View style={styles.rowLeft}>
                                <Ionicons name="download-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>Export data</Text>
                            </View>
                            <View style={styles.comingSoon}>
                                <Text style={styles.comingSoonText}>Soon</Text>
                            </View>
                        </Pressable>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="time-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>Last backup</Text>
                            </View>
                            <Text style={styles.rowValue}>Never</Text>
                        </View>

                        {/* Version */}
                        <Text style={styles.version}>StackLab — Beta</Text>

                        {__DEV__ && (
                            <>
                                <Text style={styles.sectionLabel}>DEV</Text>
                                <Pressable
                                    style={styles.devBtn}
                                    onPress={async () => {
                                        await updateSettings({ onboardingCompleted: false, onboardingStep: 0 });
                                        closeSettings();
                                    }}
                                >
                                    <Ionicons name="refresh-outline" size={16} color={colors.orange} />
                                    <Text style={styles.devBtnText}>Reset onboarding</Text>
                                </Pressable>
                            </>
                        )}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 36,
        maxHeight: '75%',
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'center', marginTop: 10, marginBottom: 4,
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingVertical: 14,
    },
    title: { fontFamily: fonts.manrope, fontSize: 18, color: colors.text },
    loadingBox: { paddingVertical: 40, alignItems: 'center' },
    sectionLabel: {
        fontSize: 9, letterSpacing: 2, color: colors.text2,
        fontFamily: fonts.outfitSemiBold, marginTop: 20, marginBottom: 10,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
        backgroundColor: colors.surface2, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    chipText: { fontFamily: fonts.outfitMedium, fontSize: 13, color: colors.text2 },
    chipTextActive: { color: colors.text },
    row: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowLabel: { fontFamily: fonts.outfit, fontSize: 14, color: colors.text },
    rowValue: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    comingSoon: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
        backgroundColor: colors.surface2,
    },
    comingSoonText: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2 },
    version: {
        fontFamily: fonts.outfit, fontSize: 12, color: colors.text2,
        textAlign: 'center', marginTop: 28, marginBottom: 8,
    },
    devBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    devBtnText: { fontFamily: fonts.outfit, fontSize: 14, color: colors.orange },
});
