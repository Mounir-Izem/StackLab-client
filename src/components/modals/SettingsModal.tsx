import React, { useState } from 'react';
import {
    Modal, View, Text, Pressable, TextInput, Switch,
    StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { useBackupStore } from '../../stores/backupStore';
import { useLockStore } from '../../stores/lockStore';
import { lockService } from '../../services/lockService';
import { resetToLabsHome } from '../../navigation/navigationRef';
import { colors, fonts } from '../../utils/theme';
import { formatDate } from '../../utils/formatters';
import { applyLanguage } from '../../i18n';
import { PinSetupModal } from './PinSetupModal';
import { PinVerifyModal } from './PinVerifyModal';
import { PinInputModal } from './PinInputModal';
import { hasUnseenBetaCenterContent } from '../../domain/betaCenterSemantics';
import { BETA_CENTER_CONTENT_VERSION } from '../../data/betaCenterContent';
import type { Currency, WeightUnit, AppLanguage } from '../../types/settings.types';
import appConfig from '../../../app.json';

const APP_VERSION = appConfig.expo.version;

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const WEIGHT_UNITS: WeightUnit[] = ['oz', 'g', 'kg'];
const LANGUAGES: AppLanguage[] = ['system', 'en', 'fr'];

type InfoKey = 'replace' | 'deleteData' | 'deleteBackup' | 'autoWipe';

function InfoButton({ onPress }: { onPress: () => void }) {
    return (
        <Pressable onPress={onPress} hitSlop={8}>
            <Ionicons name="information-circle-outline" size={16} color={colors.text2} />
        </Pressable>
    );
}

export function SettingsModal() {
    const { t } = useTranslation();
    const { settings, showSettings, closeSettings, updateSettings, openBetaCenter, error: settingsError } = useSettingsStore();
    const {
        isExporting, exportData, isImporting, importData, isReplacing, replaceData,
        isDeletingData, deleteAllData, deleteBackupFile, error: backupError,
        pendingImportMode, submitImportPin, cancelImport,
    } = useBackupStore();
    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
    const [replaceConfirmText, setReplaceConfirmText] = useState('');
    const [showDeleteDataConfirm, setShowDeleteDataConfirm] = useState(false);
    const [deleteDataConfirmText, setDeleteDataConfirmText] = useState('');
    const [showDeleteBackupConfirm, setShowDeleteBackupConfirm] = useState(false);
    const [infoModal, setInfoModal] = useState<InfoKey | null>(null);
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [showAutoWipeConfirm, setShowAutoWipeConfirm] = useState(false);
    const [showPinVerify, setShowPinVerify] = useState(false);
    const [pinVerifyPurpose, setPinVerifyPurpose] = useState<'change' | 'disable'>('change');
    const disableLock = useLockStore(s => s.disableLock);
    const requiresAppLock = !settings?.appLockEnabled;
    const hasUnseenBetaCenter = hasUnseenBetaCenterContent(
        settings?.betaCenterLastSeenVersion ?? null,
        BETA_CENTER_CONTENT_VERSION
    );

    function handleOpenBetaCenter() {
        closeSettings();
        openBetaCenter();
    }

    async function handleReplace() {
        setShowReplaceConfirm(false);
        setReplaceConfirmText('');
        const didReplace = await replaceData();
        if (didReplace) {
            closeSettings();
            resetToLabsHome();
        }
    }

    async function handleSubmitImportPin(pin: string) {
        const mode = pendingImportMode;
        const success = await submitImportPin(pin);
        if (success) {
            // The file picker briefly backgrounds the app, which triggers App Lock.
            // Decryption success is cryptographic proof the PIN is correct — unlock
            // directly rather than re-verifying (avoids incrementing failedAttempts).
            if (useLockStore.getState().isLocked) {
                useLockStore.getState().forceUnlock();
            }
            if (mode === 'replace') {
                closeSettings();
                resetToLabsHome();
            }
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

    async function handleLanguageChange(language: AppLanguage) {
        await updateSettings({ language });
        applyLanguage(language);
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

    function handleScreenProtectionToggle(value: boolean) {
        updateSettings({ screenProtectionEnabled: value });
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
    }

    function langLabel(lang: AppLanguage): string {
        if (lang === 'fr') return t('settings.language.fr');
        if (lang === 'en') return t('settings.language.en');
        return t('settings.language.system');
    }

    function backupErrorMessage(): string {
        if (backupError === 'IMPORT_VERSION_MISMATCH') return t('backup.errors.importVersionMismatch');
        if (backupError === 'IMPORT_INVALID_FILE') return t('backup.errors.importInvalidFile');
        if (backupError === 'EXPORT_REQUIRES_APP_LOCK') return t('backup.errors.exportRequiresLock');
        if (backupError === 'REPLACE_REQUIRES_APP_LOCK') return t('backup.errors.replaceRequiresLock');
        if (backupError === 'BACKUP_REENCRYPT_FAILED') return t('backup.errors.reencryptFailed');
        if (backupError === 'EXPORT_ERROR') return t('backup.errors.exportFailed');
        if (backupError === 'DELETE_DATA_ERROR') return t('backup.errors.deleteDataFailed');
        if (backupError === 'DELETE_BACKUP_ERROR') return t('backup.errors.deleteBackupFailed');
        return t('common.error');
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
                    <Text style={styles.title}>{t('settings.title')}</Text>
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
                        {settingsError && (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorText}>{t('settings.errors.updateFailed')}</Text>
                            </View>
                        )}

                        {/* Currency */}
                        <Text style={styles.sectionLabel}>{t('settings.currency')}</Text>
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
                        <Text style={styles.sectionLabel}>{t('settings.weightUnit')}</Text>
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

                        {/* Language */}
                        <Text style={styles.sectionLabel}>{t('settings.language.label')}</Text>
                        <View style={styles.chipRow}>
                            {LANGUAGES.map(lang => (
                                <Pressable
                                    key={lang}
                                    style={[styles.chip, (settings.language ?? 'system') === lang && styles.chipActive]}
                                    onPress={() => handleLanguageChange(lang)}
                                >
                                    <Text style={[styles.chipText, (settings.language ?? 'system') === lang && styles.chipTextActive]}>
                                        {langLabel(lang)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Security */}
                        <Text style={styles.sectionLabel}>{t('settings.section.security')}</Text>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="lock-closed-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>{t('settings.appLock')}</Text>
                            </View>
                            <Switch
                                value={settings.appLockEnabled}
                                onValueChange={handleAppLockToggle}
                                trackColor={{ true: colors.violet, false: colors.surface2 }}
                            />
                        </View>
                        <Text style={styles.trustNote}>{t('settings.appLockTrustNote')}</Text>
                        {settings.appLockEnabled && (
                            <>
                                <Pressable style={styles.row} onPress={handleChangePinPress}>
                                    <View style={styles.rowLeft}>
                                        <Ionicons name="keypad-outline" size={18} color={colors.text2} />
                                        <Text style={styles.rowLabel}>{t('settings.changePin')}</Text>
                                    </View>
                                </Pressable>
                                <View style={styles.row}>
                                    <View style={styles.rowLeft}>
                                        <Ionicons name="skull-outline" size={18} color={colors.crimson} />
                                        <Text style={[styles.rowLabel, { color: colors.crimson }]}>
                                            {t('settings.autoWipe')}
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
                        <View style={styles.row}>
                            <View style={[styles.rowLeft, { flex: 1 }]}>
                                <Ionicons name="eye-off-outline" size={18} color={colors.text2} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowLabel}>{t('settings.screenProtection')}</Text>
                                    <Text style={styles.rowDesc}>{t('settings.screenProtectionDesc')}</Text>
                                </View>
                            </View>
                            <Switch
                                value={settings.screenProtectionEnabled}
                                onValueChange={handleScreenProtectionToggle}
                                trackColor={{ true: colors.violet, false: colors.surface2 }}
                            />
                        </View>

                        {/* Data */}
                        <Text style={styles.sectionLabel}>{t('settings.section.data')}</Text>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="cloud-done-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>{t('settings.autoBackup')}</Text>
                            </View>
                            <Switch
                                value={settings.autoBackupEnabled && settings.appLockEnabled}
                                onValueChange={handleAutoBackupToggle}
                                disabled={requiresAppLock}
                                trackColor={{ true: colors.violet, false: colors.surface2 }}
                            />
                        </View>
                        {requiresAppLock && (
                            <Text style={styles.hintText}>{t('settings.requiresAppLock')}</Text>
                        )}
                        {!settings.autoBackupEnabled && (
                            <View style={styles.row}>
                                <View style={styles.rowLeft}>
                                    <Ionicons name="notifications-outline" size={18} color={colors.text2} />
                                    <Text style={styles.rowLabel}>{t('settings.backupReminders')}</Text>
                                </View>
                                <Switch
                                    value={settings.backupReminder}
                                    onValueChange={(value) => updateSettings({ backupReminder: value })}
                                    trackColor={{ true: colors.violet, false: colors.surface2 }}
                                />
                            </View>
                        )}
                        <Pressable
                            style={[styles.row, requiresAppLock && styles.disabled]}
                            disabled={isExporting || requiresAppLock}
                            onPress={() => setShowExportConfirm(true)}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="download-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>{t('settings.exportData')}</Text>
                            </View>
                            {isExporting && <ActivityIndicator size="small" color={colors.text2} />}
                        </Pressable>
                        {requiresAppLock && (
                            <Text style={styles.hintText}>{t('settings.requiresAppLock')}</Text>
                        )}
                        <Pressable
                            style={styles.row}
                            disabled={isImporting}
                            onPress={importData}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="cloud-upload-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>{t('settings.importData')}</Text>
                            </View>
                            {isImporting && <ActivityIndicator size="small" color={colors.text2} />}
                        </Pressable>
                        <Pressable
                            style={[styles.row, requiresAppLock && styles.disabled]}
                            disabled={isReplacing || requiresAppLock}
                            onPress={() => setShowReplaceConfirm(true)}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="warning-outline" size={18} color={colors.crimson} />
                                <Text style={[styles.rowLabel, { color: colors.crimson }]}>{t('settings.replaceData')}</Text>
                                <InfoButton onPress={() => setInfoModal('replace')} />
                            </View>
                            {isReplacing && <ActivityIndicator size="small" color={colors.text2} />}
                        </Pressable>
                        {requiresAppLock && (
                            <Text style={styles.hintText}>{t('settings.requiresAppLock')}</Text>
                        )}
                        <Pressable
                            style={styles.row}
                            disabled={isDeletingData}
                            onPress={() => setShowDeleteDataConfirm(true)}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="trash-outline" size={18} color={colors.crimson} />
                                <Text style={[styles.rowLabel, { color: colors.crimson }]}>{t('settings.deleteAllData')}</Text>
                                <InfoButton onPress={() => setInfoModal('deleteData')} />
                            </View>
                            {isDeletingData && <ActivityIndicator size="small" color={colors.text2} />}
                        </Pressable>
                        <Pressable
                            style={styles.row}
                            onPress={() => setShowDeleteBackupConfirm(true)}
                        >
                            <View style={styles.rowLeft}>
                                <Ionicons name="close-circle-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>{t('settings.deleteBackupFile')}</Text>
                                <InfoButton onPress={() => setInfoModal('deleteBackup')} />
                            </View>
                        </Pressable>
                        {backupError && backupError !== 'IMPORT_WRONG_PIN' && (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorText}>{backupErrorMessage()}</Text>
                            </View>
                        )}
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="time-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>{t('settings.lastBackup.label')}</Text>
                            </View>
                            <Text style={styles.rowValue}>
                                {settings.lastBackupAt ? formatDate(settings.lastBackupAt) : t('settings.lastBackup.never')}
                            </Text>
                        </View>

                        {/* Beta */}
                        <Text style={styles.sectionLabel}>{t('settings.section.beta')}</Text>
                        <Pressable style={styles.row} onPress={handleOpenBetaCenter}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="megaphone-outline" size={18} color={colors.text2} />
                                <Text style={styles.rowLabel}>{t('settings.betaCenter')}</Text>
                            </View>
                            {hasUnseenBetaCenter && <View style={styles.betaBadge} />}
                        </Pressable>

                        {/* Version */}
                        <Text style={styles.version}>{t('settings.version', { version: APP_VERSION })}</Text>

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
                    <Text style={styles.optionTitle}>{t('settings.export.title')}</Text>
                    <Text style={styles.optionSubtitle}>{t('settings.export.message')}</Text>
                    <Pressable style={styles.optionBtn} onPress={async () => {
                        setShowExportConfirm(false);
                        await exportData();
                    }}>
                        <Ionicons name="download-outline" size={20} color={colors.violet} />
                        <Text style={[styles.optionBtnText, { color: colors.violet }]}>{t('settings.export.button')}</Text>
                    </Pressable>
                    <Pressable style={styles.optionBtn} onPress={() => setShowExportConfirm(false)}>
                        <Text style={styles.optionBtnText}>{t('common.cancel')}</Text>
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
                    <Text style={styles.optionTitle}>{t('settings.replace.title')}</Text>
                    <Text style={styles.optionSubtitle}>{t('settings.replace.message')}</Text>
                    <View style={styles.replaceInputWrap}>
                        <TextInput
                            style={styles.replaceInput}
                            value={replaceConfirmText}
                            onChangeText={setReplaceConfirmText}
                            placeholder={t('settings.replace.placeholder')}
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
                        <Text style={[styles.optionBtnText, { color: colors.crimson }]}>{t('settings.replace.button')}</Text>
                    </Pressable>
                    <Pressable
                        style={styles.optionBtn}
                        onPress={() => { setShowReplaceConfirm(false); setReplaceConfirmText(''); }}
                    >
                        <Text style={styles.optionBtnText}>{t('common.cancel')}</Text>
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
                    <Text style={styles.optionTitle}>{t('settings.deleteData.title')}</Text>
                    <Text style={styles.optionSubtitle}>{t('settings.deleteData.description')}</Text>
                    <View style={styles.replaceInputWrap}>
                        <TextInput
                            style={styles.replaceInput}
                            value={deleteDataConfirmText}
                            onChangeText={setDeleteDataConfirmText}
                            placeholder={t('settings.deleteData.placeholder')}
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
                        <Text style={[styles.optionBtnText, { color: colors.crimson }]}>{t('settings.deleteData.button')}</Text>
                    </Pressable>
                    <Pressable
                        style={styles.optionBtn}
                        onPress={() => { setShowDeleteDataConfirm(false); setDeleteDataConfirmText(''); }}
                    >
                        <Text style={styles.optionBtnText}>{t('common.cancel')}</Text>
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
                    <Text style={styles.optionTitle}>{t('settings.deleteBackup.title')}</Text>
                    <Text style={styles.optionSubtitle}>{t('settings.deleteBackup.description')}</Text>
                    <Pressable style={styles.optionBtn} onPress={handleDeleteBackupFile}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.crimson} />
                        <Text style={[styles.optionBtnText, { color: colors.crimson }]}>{t('settings.deleteBackup.button')}</Text>
                    </Pressable>
                    <Pressable style={styles.optionBtn} onPress={() => setShowDeleteBackupConfirm(false)}>
                        <Text style={styles.optionBtnText}>{t('common.cancel')}</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>

        {/* Info modal — shared by Replace / Delete all data / Delete backup file / Auto-wipe */}
        <Modal visible={infoModal !== null} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
            <Pressable style={styles.overlay} onPress={() => setInfoModal(null)}>
                <View style={styles.optionSheet}>
                    <Text style={styles.optionTitle}>{t('settings.info.title')}</Text>
                    <Text style={styles.optionSubtitle}>
                        {infoModal ? t(`settings.info.${infoModal}`) : ''}
                    </Text>
                    <Pressable style={styles.optionBtn} onPress={() => setInfoModal(null)}>
                        <Text style={styles.optionBtnText}>{t('settings.info.ok')}</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>

        {/* Auto-wipe confirmation modal */}
        <Modal visible={showAutoWipeConfirm} transparent animationType="fade" onRequestClose={() => setShowAutoWipeConfirm(false)}>
            <Pressable style={styles.overlay} onPress={() => setShowAutoWipeConfirm(false)}>
                <View style={styles.optionSheet}>
                    <Text style={styles.optionTitle}>{t('settings.enableAutoWipe.title')}</Text>
                    <Text style={styles.optionSubtitle}>{t('settings.info.autoWipe')}</Text>
                    <Pressable
                        style={styles.optionBtn}
                        onPress={() => {
                            setShowAutoWipeConfirm(false);
                            updateSettings({ appLockAutoWipeEnabled: true });
                        }}
                    >
                        <Ionicons name="skull-outline" size={20} color={colors.crimson} />
                        <Text style={[styles.optionBtnText, { color: colors.crimson }]}>{t('settings.enableAutoWipe.button')}</Text>
                    </Pressable>
                    <Pressable style={styles.optionBtn} onPress={() => setShowAutoWipeConfirm(false)}>
                        <Text style={styles.optionBtnText}>{t('common.cancel')}</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>

        <PinSetupModal
            visible={showPinSetup}
            purpose={pinVerifyPurpose === 'change' ? 'change' : 'setup'}
            onClose={() => setShowPinSetup(false)}
            onDone={() => setShowPinSetup(false)}
        />

        <PinVerifyModal
            visible={showPinVerify}
            title={pinVerifyPurpose === 'change' ? t('applock.change.currentPin') : t('settings.disableLock.pin')}
            onVerified={handlePinVerified}
            onClose={() => setShowPinVerify(false)}
        />

        <PinInputModal
            visible={pendingImportMode !== null}
            title={pendingImportMode === 'replace' ? t('applock.import.titleReplace') : t('applock.import.title')}
            subtitle={t('applock.import.hint')}
            showError={backupError === 'IMPORT_WRONG_PIN'}
            onSubmit={handleSubmitImportPin}
            onClose={cancelImport}
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
        textTransform: 'uppercase',
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
    rowDesc: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2, marginTop: 2 },
    hintText: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2, paddingBottom: 10 },
    betaBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.violet },
    trustNote: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2, lineHeight: 16, paddingVertical: 10 },
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
