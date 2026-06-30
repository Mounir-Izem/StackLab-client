import React, { useState } from 'react';
import {
    Modal, View, Text, Pressable, TextInput, Switch, Linking,
    StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { useBackupStore } from '../../stores/backupStore';
import { useLockStore } from '../../stores/lockStore';
import { lockService } from '../../services/lockService';
import { resetToLabsHome } from '../../navigation/navigationRef';
import { colors, fonts } from '../../utils/theme';
import { formatDate } from '../../utils/formatters';
import { shareAutoBackupForDebug } from '../../utils/backup';
import { PinSetupModal } from './PinSetupModal';
import { PinVerifyModal } from './PinVerifyModal';
import type { Currency, WeightUnit } from '../../types/settings.types';

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const WEIGHT_UNITS: WeightUnit[] = ['oz', 'g', 'kg'];

const INFO_TEXT = {
    replace: "Erases everything currently on this device and replaces it with the file you choose. Anything added since that file was made will be lost. Your current data is backed up automatically first, before anything is deleted.",
    deleteAllData: "Permanently erases everything in this app — labs, decks, items, and value history. This does NOT delete copies you've already saved elsewhere: manual exports you've shared, or backups already stored in iCloud/Google Drive.",
    deleteBackupFile: "Removes the automatic backup file stored on this device. This does NOT delete older copies iCloud or Google Drive may have already saved on their own — manage those from your phone's own settings.",
    autoWipe: "If someone enters the wrong PIN 10 times in a row, everything on this device is permanently deleted — labs, decks, items, snapshots — with no automatic backup beforehand. Off by default; only enable this if you understand and want that risk.",
};

function InfoButton({ onPress }: { onPress: () => void }) {
    return (
        <Pressable onPress={onPress} hitSlop={8}>
            <Ionicons name="information-circle-outline" size={16} color={colors.text2} />
        </Pressable>
    );
}

export function SettingsModal() {
    const { settings, showSettings, closeSettings, updateSettings } = useSettingsStore();
    const {
        isExporting, exportData, isImporting, importData, isReplacing, replaceData,
        isDeletingData, deleteAllData, deleteBackupFile, error: backupError,
    } = useBackupStore();
    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
    const [replaceConfirmText, setReplaceConfirmText] = useState('');
    const [showDeleteDataConfirm, setShowDeleteDataConfirm] = useState(false);
    const [deleteDataConfirmText, setDeleteDataConfirmText] = useState('');
    const [showDeleteBackupConfirm, setShowDeleteBackupConfirm] = useState(false);
    const [infoModal, setInfoModal] = useState<string | null>(null);
    const [debugMsg, setDebugMsg] = useState<string | null>(null);
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [showAutoWipeConfirm, setShowAutoWipeConfirm] = useState(false);
    const [showPinVerify, setShowPinVerify] = useState(false);
    const [pinVerifyPurpose, setPinVerifyPurpose] = useState<'change' | 'disable'>('change');
    const disableLock = useLockStore(s => s.disableLock);

    async function handleReplace() {
        setShowReplaceConfirm(false);
        setReplaceConfirmText('');
        const didReplace = await replaceData();
        if (didReplace) {
            closeSettings();
            resetToLabsHome();
        }
    }

    async function handleDeleteAllData() {
        setShowDeleteDataConfirm(false);
        setDeleteDataConfirmText('');
        const didDelete = await deleteAllData();
        if (didDelete) {
            closeSettings();
            resetToLabsHome();
        }
    }

    async function handleDeleteBackupFile() {
        setShowDeleteBackupConfirm(false);
        await deleteBackupFile();
    }

    async function handleCurrency(currency: Currency) {
        await updateSettings({ currency });
    }

    async function handleWeightUnit(weightUnit: WeightUnit) {
        await updateSettings({ weightUnit });
    }

    async function handleAppLockToggle(value: boolean) {
        if (value) {
            const hasPin = await lockService.hasPin();
            if (hasPin) {
                updateSettings({ appLockEnabled: true });
            } else {
                setShowPinSetup(true);
            }
        } else {
            setPinVerifyPurpose('disable');
            setShowPinVerify(true);
        }
    }

    function handleChangePinPress() {
        setPinVerifyPurpose('change');
        setShowPinVerify(true);
    }

    function handlePinVerified() {
        setShowPinVerify(false);
        if (pinVerifyPurpose === 'change') {
            setShowPinSetup(true);
        } else {
            disableLock();
        }
    }

    function handleAutoWipeToggle(value: boolean) {
        if (value) {
            setShowAutoWipeConfirm(true);
        } else {
            updateSettings({ appLockAutoWipeEnabled: false });
        }
    }

    async function handleAutoBackupToggle(value: boolean) {
        await updateSettings({ autoBackupEnabled: value });
        if (value) Linking.openSettings();
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

                        {/* Security */}
                        <Text style={styles.sectionLabel}>SECURITY</Text>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="lock-closed-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>App Lock</Text>
                            </View>
                            <Switch
                                value={settings.appLockEnabled}
                                onValueChange={handleAppLockToggle}
                                trackColor={{ true: colors.violet, false: colors.surface2 }}
                            />
                        </View>
                        {settings.appLockEnabled && (
                            <>
                                <Pressable style={styles.row} onPress={handleChangePinPress}>
                                    <View style={styles.rowLeft}>
                                        <Ionicons name="keypad-outline" size={18} color={colors.text2} />
                                        <Text style={styles.rowLabel}>Change PIN</Text>
                                    </View>
                                </Pressable>
                                <View style={styles.row}>
                                    <View style={styles.rowLeft}>
                                        <Ionicons name="skull-outline" size={18} color={colors.crimson} />
                                        <Text style={[styles.rowLabel, { color: colors.crimson }]}>
                                            Erase after 10 failed attempts
                                        </Text>
                                        <InfoButton onPress={() => setInfoModal('autoWipe')} />
                                    </View>
                                    <Switch
                                        value={settings.appLockAutoWipeEnabled}
                                        onValueChange={handleAutoWipeToggle}
                                        trackColor={{ true: colors.crimson, false: colors.surface2 }}
                                    />
                                </View>
                            </>
                        )}

                        {/* Data */}
                        <Text style={styles.sectionLabel}>DATA</Text>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="cloud-done-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>Auto-backup</Text>
                            </View>
                            <Switch
                                value={settings.autoBackupEnabled}
                                onValueChange={handleAutoBackupToggle}
                                trackColor={{ true: colors.violet, false: colors.surface2 }}
                            />
                        </View>
                        {!settings.autoBackupEnabled && (
                            <View style={styles.row}>
                                <View style={styles.rowLeft}>
                                    <Ionicons name="notifications-outline" size={18} color={colors.text2} />
                                    <Text style={styles.rowLabel}>Backup reminders</Text>
                                </View>
                                <Switch
                                    value={settings.backupReminder}
                                    onValueChange={(value) => updateSettings({ backupReminder: value })}
                                    trackColor={{ true: colors.violet, false: colors.surface2 }}
                                />
                            </View>
                        )}
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
                                <InfoButton onPress={() => setInfoModal('replace')} />
                            </View>
                            {isReplacing && <ActivityIndicator size="small" color={colors.text2} />}
                        </Pressable>
                        <Pressable
                            style={styles.row}
                            disabled={isDeletingData}
                            onPress={() => setShowDeleteDataConfirm(true)}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="trash-outline" size={18} color={colors.crimson} />
                                <Text style={[styles.rowLabel, { color: colors.crimson }]}>Delete all my data</Text>
                                <InfoButton onPress={() => setInfoModal('deleteAllData')} />
                            </View>
                            {isDeletingData && <ActivityIndicator size="small" color={colors.text2} />}
                        </Pressable>
                        <Pressable
                            style={styles.row}
                            onPress={() => setShowDeleteBackupConfirm(true)}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="close-circle-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>Delete backup file</Text>
                                <InfoButton onPress={() => setInfoModal('deleteBackupFile')} />
                            </View>
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
                            <Text style={styles.rowValue}>
                                {settings.lastBackupAt ? formatDate(settings.lastBackupAt) : 'Never'}
                            </Text>
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
                                <Pressable
                                    style={styles.devBtn}
                                    onPress={async () => {
                                        const found = await shareAutoBackupForDebug();
                                        setDebugMsg(found ? null : 'No auto-backup written yet.');
                                    }}
                                >
                                    <Ionicons name="eye-outline" size={16} color={colors.orange} />
                                    <Text style={styles.devBtnText}>View auto-backup file</Text>
                                </Pressable>
                                {debugMsg && <Text style={styles.devMsg}>{debugMsg}</Text>}
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

        {/* Delete all data confirmation modal */}
        <Modal
            visible={showDeleteDataConfirm}
            transparent
            animationType="fade"
            onRequestClose={() => { setShowDeleteDataConfirm(false); setDeleteDataConfirmText(''); }}
        >
            <Pressable
                style={styles.overlay}
                onPress={() => { setShowDeleteDataConfirm(false); setDeleteDataConfirmText(''); }}
            >
                <View style={styles.optionSheet}>
                    <Text style={styles.optionTitle}>Delete all your data?</Text>
                    <Text style={styles.optionSubtitle}>
                        This permanently erases every lab, deck, item, and value snapshot on this device.
                        This cannot be undone, and no backup is made automatically before this action.
                    </Text>
                    <View style={styles.replaceInputWrap}>
                        <TextInput
                            style={styles.replaceInput}
                            value={deleteDataConfirmText}
                            onChangeText={setDeleteDataConfirmText}
                            placeholder="Type DELETE to confirm"
                            placeholderTextColor={colors.text2}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />
                    </View>
                    <Pressable
                        style={[styles.optionBtn, deleteDataConfirmText !== 'DELETE' && styles.disabled]}
                        disabled={deleteDataConfirmText !== 'DELETE'}
                        onPress={handleDeleteAllData}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.crimson} />
                        <Text style={[styles.optionBtnText, { color: colors.crimson }]}>Delete everything</Text>
                    </Pressable>
                    <Pressable
                        style={styles.optionBtn}
                        onPress={() => { setShowDeleteDataConfirm(false); setDeleteDataConfirmText(''); }}
                    >
                        <Text style={styles.optionBtnText}>Cancel</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>

        {/* Delete backup file confirmation modal */}
        <Modal
            visible={showDeleteBackupConfirm}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDeleteBackupConfirm(false)}
        >
            <Pressable style={styles.overlay} onPress={() => setShowDeleteBackupConfirm(false)}>
                <View style={styles.optionSheet}>
                    <Text style={styles.optionTitle}>Delete the backup file?</Text>
                    <Text style={styles.optionSubtitle}>
                        Removes the automatic backup stored on this device. Your labs, decks, and items are
                        not affected — only the backup copy is deleted.
                    </Text>
                    <Pressable style={styles.optionBtn} onPress={handleDeleteBackupFile}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.crimson} />
                        <Text style={[styles.optionBtnText, { color: colors.crimson }]}>Delete backup</Text>
                    </Pressable>
                    <Pressable style={styles.optionBtn} onPress={() => setShowDeleteBackupConfirm(false)}>
                        <Text style={styles.optionBtnText}>Cancel</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>

        {/* Info modal — shared by Replace / Delete all data / Delete backup file */}
        <Modal visible={infoModal !== null} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
            <Pressable style={styles.overlay} onPress={() => setInfoModal(null)}>
                <View style={styles.optionSheet}>
                    <Text style={styles.optionTitle}>What does this do?</Text>
                    <Text style={styles.optionSubtitle}>
                        {infoModal ? INFO_TEXT[infoModal as keyof typeof INFO_TEXT] : ''}
                    </Text>
                    <Pressable style={styles.optionBtn} onPress={() => setInfoModal(null)}>
                        <Text style={styles.optionBtnText}>Got it</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>

        {/* Auto-wipe confirmation modal */}
        <Modal visible={showAutoWipeConfirm} transparent animationType="fade" onRequestClose={() => setShowAutoWipeConfirm(false)}>
            <Pressable style={styles.overlay} onPress={() => setShowAutoWipeConfirm(false)}>
                <View style={styles.optionSheet}>
                    <Text style={styles.optionTitle}>Erase after 10 failed attempts?</Text>
                    <Text style={styles.optionSubtitle}>{INFO_TEXT.autoWipe}</Text>
                    <Pressable
                        style={styles.optionBtn}
                        onPress={() => {
                            setShowAutoWipeConfirm(false);
                            updateSettings({ appLockAutoWipeEnabled: true });
                        }}
                    >
                        <Ionicons name="skull-outline" size={20} color={colors.crimson} />
                        <Text style={[styles.optionBtnText, { color: colors.crimson }]}>Enable</Text>
                    </Pressable>
                    <Pressable style={styles.optionBtn} onPress={() => setShowAutoWipeConfirm(false)}>
                        <Text style={styles.optionBtnText}>Cancel</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>

        <PinSetupModal
            visible={showPinSetup}
            onClose={() => setShowPinSetup(false)}
            onDone={() => setShowPinSetup(false)}
        />

        <PinVerifyModal
            visible={showPinVerify}
            title={pinVerifyPurpose === 'change' ? 'Enter your current PIN' : 'Confirm PIN to disable App Lock'}
            onVerified={handlePinVerified}
            onClose={() => setShowPinVerify(false)}
        />
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
    devMsg: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2, paddingVertical: 8 },
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
