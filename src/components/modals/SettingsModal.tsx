import React, { useState } from 'react';
import {
    Modal, View, Text, Pressable, TextInput,
    StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { useBackupStore } from '../../stores/backupStore';
import { resetToLabsHome } from '../../navigation/navigationRef';
import { colors, fonts } from '../../utils/theme';
import type { Currency, WeightUnit } from '../../types/settings.types';

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const WEIGHT_UNITS: WeightUnit[] = ['oz', 'g', 'kg'];

export function SettingsModal() {
    const { settings, showSettings, closeSettings, updateSettings } = useSettingsStore();
    const { isExporting, exportData, isImporting, importData, isReplacing, replaceData, error: backupError } = useBackupStore();
    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
    const [replaceConfirmText, setReplaceConfirmText] = useState('');

    async function handleReplace() {
        setShowReplaceConfirm(false);
        setReplaceConfirmText('');
        const didReplace = await replaceData();
        if (didReplace) {
            closeSettings();
            resetToLabsHome();
        }
    }

    async function handleCurrency(currency: Currency) {
        await updateSettings({ currency });
    }

    async function handleWeightUnit(weightUnit: WeightUnit) {
        await updateSettings({ weightUnit });
    }

    return (
        <>
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
                        <Pressable
                            style={styles.row}
                            disabled={isExporting}
                            onPress={() => setShowExportConfirm(true)}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="download-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>Export data</Text>
                            </View>
                            {isExporting && <ActivityIndicator size="small" color={colors.text2} />}
                        </Pressable>
                        <Pressable
                            style={styles.row}
                            disabled={isImporting}
                            onPress={importData}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="cloud-upload-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>Import data</Text>
                            </View>
                            {isImporting && <ActivityIndicator size="small" color={colors.text2} />}
                        </Pressable>
                        <Pressable
                            style={styles.row}
                            disabled={isReplacing}
                            onPress={() => setShowReplaceConfirm(true)}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="warning-outline" size={18} color={colors.crimson} />
                                <Text style={[styles.rowLabel, { color: colors.crimson }]}>Replace all data</Text>
                            </View>
                            {isReplacing && <ActivityIndicator size="small" color={colors.text2} />}
                        </Pressable>
                        {backupError && (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorText}>
                                    {backupError === 'IMPORT_VERSION_MISMATCH'
                                        ? "This file was made with a different version of StackLab and can't be imported."
                                        : backupError === 'IMPORT_INVALID_FILE'
                                        ? "This file couldn't be read — it may be corrupted or not a StackLab export."
                                        : 'Something went wrong. Please try again.'}
                                </Text>
                            </View>
                        )}
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

        {/* Export confirmation modal */}
        <Modal visible={showExportConfirm} transparent animationType="fade" onRequestClose={() => setShowExportConfirm(false)}>
            <Pressable style={styles.overlay} onPress={() => setShowExportConfirm(false)}>
                <View style={styles.optionSheet}>
                    <Text style={styles.optionTitle}>Export your data?</Text>
                    <Text style={styles.optionSubtitle}>
                        This file contains your complete stack data in plain text. Store it securely. Do not share it.
                    </Text>
                    <Pressable style={styles.optionBtn} onPress={async () => {
                        setShowExportConfirm(false);
                        await exportData();
                    }}>
                        <Ionicons name="download-outline" size={20} color={colors.violet} />
                        <Text style={[styles.optionBtnText, { color: colors.violet }]}>Export</Text>
                    </Pressable>
                    <Pressable style={styles.optionBtn} onPress={() => setShowExportConfirm(false)}>
                        <Text style={styles.optionBtnText}>Cancel</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>

        {/* Replace confirmation modal */}
        <Modal
            visible={showReplaceConfirm}
            transparent
            animationType="fade"
            onRequestClose={() => { setShowReplaceConfirm(false); setReplaceConfirmText(''); }}
        >
            <Pressable
                style={styles.overlay}
                onPress={() => { setShowReplaceConfirm(false); setReplaceConfirmText(''); }}
            >
                <View style={styles.optionSheet}>
                    <Text style={styles.optionTitle}>Replace all data?</Text>
                    <Text style={styles.optionSubtitle}>
                        This permanently deletes everything currently on this device and replaces it with the
                        imported file. Your current data will be backed up automatically first — you'll be asked
                        where to save it before anything is deleted.
                    </Text>
                    <View style={styles.replaceInputWrap}>
                        <TextInput
                            style={styles.replaceInput}
                            value={replaceConfirmText}
                            onChangeText={setReplaceConfirmText}
                            placeholder="Type REPLACE to confirm"
                            placeholderTextColor={colors.text2}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />
                    </View>
                    <Pressable
                        style={[styles.optionBtn, replaceConfirmText !== 'REPLACE' && styles.disabled]}
                        disabled={replaceConfirmText !== 'REPLACE'}
                        onPress={handleReplace}
                    >
                        <Ionicons name="warning-outline" size={20} color={colors.crimson} />
                        <Text style={[styles.optionBtnText, { color: colors.crimson }]}>Replace</Text>
                    </Pressable>
                    <Pressable
                        style={styles.optionBtn}
                        onPress={() => { setShowReplaceConfirm(false); setReplaceConfirmText(''); }}
                    >
                        <Text style={styles.optionBtnText}>Cancel</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
        </>
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
    errorBanner: { backgroundColor: 'rgba(180,30,30,0.15)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(180,30,30,0.30)', marginTop: 10 },
    errorText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.crimson },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', padding: 16, paddingBottom: 40 },
    optionSheet: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
    optionTitle: { fontFamily: fonts.manrope, fontSize: 15, color: colors.text2, textAlign: 'center', paddingTop: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    optionSubtitle: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2, textAlign: 'center', paddingBottom: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    optionBtnText: { fontFamily: fonts.outfitMedium, fontSize: 15, color: colors.text },
    replaceInputWrap: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    replaceInput: {
        backgroundColor: colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
        fontFamily: fonts.outfit, fontSize: 14, color: colors.text,
    },
    disabled: { opacity: 0.4 },
});
