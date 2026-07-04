import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useItemStore } from '../../stores/itemStore';
import { useLabStore } from '../../stores/labStore';
import { colors, fonts } from '../../utils/theme';
import type { Item } from '../../types/item.types';

type Action = null | 'restore' | 'delete';

type Props = {
    items: Item[];
    labName: string;
    onBack: () => void;
    onCancel: () => void;
    onDone: () => void;
};

export function TrashScreenC({ items, labName, onBack, onCancel, onDone }: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [action, setAction] = useState<Action>(null);
    const [targetLabId, setTargetLabId] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { restoreFromTrash, deleteItem } = useItemStore();
    const { labs } = useLabStore();

    const hasWishlist = items.some(i => i.status === 'wishlist');
    const hasActive = items.some(i => i.status === 'active');
    const hasSold = items.some(i => i.status === 'sold');
    const isMixed = [hasWishlist, hasActive, hasSold].filter(Boolean).length > 1;
    // trashedSale : pas de choix de lab — la vente retourne dans l'historique des
    // ventes, pas dans un lab "actif" que l'utilisateur choisirait.
    const destinationLabs = isMixed || hasSold ? [] :
        hasWishlist ? labs.filter(l => l.type === 'wishlist') :
        labs.filter(l => l.type === 'standard');

    const itemCount = items.length;
    const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

    async function handleRestore() {
        if (!targetLabId || processing) return;
        setProcessing(true);
        setError(null);
        for (const item of items) {
            await restoreFromTrash(item.id, targetLabId, null);
            if (useItemStore.getState().error) {
                setError(t('modifier.restoreFailed'));
                setProcessing(false);
                return;
            }
        }
        setProcessing(false);
        onDone();
    }

    async function handleDelete() {
        if (processing) return;
        setProcessing(true);
        setError(null);
        for (const item of items) {
            await deleteItem(item.id);
            if (useItemStore.getState().error) {
                setError(t('modifier.deleteFailed'));
                setProcessing(false);
                return;
            }
        }
        setProcessing(false);
        onDone();
    }

    return (
        <View style={styles.screen}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>
                    {t('modifier.selected', { count: itemCount })}
                </Text>
                <Pressable onPress={onCancel} hitSlop={8}>
                    <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </Pressable>
            </View>

            <Text style={styles.breadcrumb}>{labName}</Text>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.summary}>
                    {items.map(i => (
                        <Text key={i.id} style={styles.summaryItem}>· {i.name} ×{i.quantity}</Text>
                    ))}
                </View>

                <View style={styles.card}>
                    {action !== 'restore' && (
                        <Pressable style={styles.action} onPress={() => {
                            setAction('restore');
                            const standardLab = labs.find(l => l.type === 'standard');
                            setTargetLabId(hasSold && !isMixed && standardLab ? standardLab.id : null);
                            setError(null);
                        }}>
                            <View style={styles.actionInfo}>
                                <Text style={styles.actionTitle}>{t('item.actions.restore')}</Text>
                                <Text style={styles.actionDesc}>{t('modifier.restoreDesc')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.text2} />
                        </Pressable>
                    )}
                    {action === 'restore' && (
                        <View style={styles.subSection}>
                            {isMixed ? (
                                <Text style={styles.errorText}>{t('modifier.mixedError')}</Text>
                            ) : (
                                <>
                                    {hasSold ? (
                                        <Text style={styles.subLabel}>{t('modifier.restoreSaleDesc')}</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.subLabel}>{t('modifier.chooseDestLab')}</Text>
                                            {destinationLabs.map(l => (
                                                <Pressable
                                                    key={l.id}
                                                    style={[styles.labRow, targetLabId === l.id && styles.labRowSelected]}
                                                    onPress={() => setTargetLabId(l.id)}
                                                >
                                                    <Text style={styles.labName}>{l.name}</Text>
                                                    {targetLabId === l.id && <Ionicons name="checkmark" size={18} color={colors.green} />}
                                                </Pressable>
                                            ))}
                                        </>
                                    )}
                                    {error !== null && <Text style={styles.errorText}>{error}</Text>}
                                    <Pressable
                                        style={[styles.confirmBtn, (!targetLabId || processing) && styles.disabled]}
                                        onPress={handleRestore}
                                        disabled={!targetLabId || processing}
                                    >
                                        <Text style={styles.confirmBtnText}>
                                            {processing ? t('modifier.restoring') : (hasSold ? t('item.actions.restoreSale') : t('modifier.confirmRestore'))}
                                        </Text>
                                    </Pressable>
                                </>
                            )}
                            <Pressable style={styles.linkBtn} onPress={() => setAction(null)}>
                                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                <View style={styles.card}>
                    {action !== 'delete' && (
                        <Pressable style={styles.action} onPress={() => { setAction('delete'); setError(null); }}>
                            <View style={styles.actionInfo}>
                                <Text style={[styles.actionTitle, styles.red]}>{t('modifier.deletePermTitle')}</Text>
                                <Text style={styles.actionDesc}>{t('modifier.cannotUndo')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.crimson} />
                        </Pressable>
                    )}
                    {action === 'delete' && (
                        <View style={styles.subSection}>
                            <Text style={styles.deleteWarn}>
                                {t('modifier.deletePermWarn', {
                                    items: t('common.items', { count: itemCount }),
                                    units: t('common.units', { count: totalUnits }),
                                })}
                            </Text>
                            {error !== null && <Text style={styles.errorText}>{error}</Text>}
                            <Pressable
                                style={[styles.deleteBtn, processing && styles.disabled]}
                                onPress={handleDelete}
                                disabled={processing}
                            >
                                <Text style={styles.deleteBtnText}>
                                    {processing
                                        ? t('modifier.deleting')
                                        : t('modifier.deletePermBtn', { count: itemCount })
                                    }
                                </Text>
                            </Pressable>
                            <Pressable style={styles.linkBtn} onPress={() => setAction(null)}>
                                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                <Pressable style={styles.backSelection} onPress={onBack}>
                    <Ionicons name="arrow-back" size={16} color={colors.text2} />
                    <Text style={styles.cancelText}> {t('modifier.editSelection')}</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
    headerTitle: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text },
    cancelText: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text2 },
    breadcrumb: { paddingHorizontal: 16, paddingBottom: 8, fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    content: { padding: 16, gap: 14 },
    summary: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 4 },
    summaryItem: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    card: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
    action: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
    actionInfo: { flex: 1 },
    actionTitle: { fontFamily: fonts.outfitMedium, fontSize: 15, color: colors.text, marginBottom: 2 },
    actionDesc: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    red: { color: colors.crimson },
    subSection: { padding: 16, gap: 10 },
    subLabel: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    labRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface2, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
    labRowSelected: { borderColor: colors.green },
    labName: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text },
    errorText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.crimson },
    confirmBtn: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
    confirmBtnText: { fontFamily: fonts.outfitSemiBold, fontSize: 14, color: '#0A1A0F' },
    deleteBtn: { backgroundColor: colors.crimson, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
    deleteBtnText: { fontFamily: fonts.outfitSemiBold, fontSize: 14, color: colors.text },
    deleteWarn: { fontFamily: fonts.outfit, fontSize: 13, color: colors.crimson, lineHeight: 20 },
    linkBtn: { alignItems: 'center', paddingVertical: 8 },
    disabled: { opacity: 0.4 },
    backSelection: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
});
