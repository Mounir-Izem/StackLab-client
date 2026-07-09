import React, { useState } from 'react';
import {
    View, Text, ScrollView, Image, Pressable, Modal, StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useItemStore } from '../../stores/itemStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSpotStore } from '../../stores/spotStore';
import { calcFineWeightOz } from '../../utils/calculations';
import { formatWeight, formatPurity, formatCurrency, formatDate, formatStrikeLabel } from '../../utils/formatters';
import { metalTokens, colors, fonts, fontSize } from '../../utils/theme';
import { canPerformAction } from '../../domain/actionSemantics';
import { convertCurrencyAmount } from '../../domain/valueSemantics';
import type { CurrencyRates } from '../../domain/valueSemantics';
import { getItemValueDisplayModel } from '../../domain/itemValueDisplaySemantics';
import type { Currency, WeightUnit } from '../../types/settings.types';

// Le rôle métier ici est toujours soldRecord : SoldHistoryScreen ne liste
// que des items status='sold' hors Trash (itemService.getSoldItems() les
// exclut déjà). Pas besoin de résoudre lab.type via getItemRole(item, lab)
// pour ce guardrail — le contexte d'accès garantit le rôle.
const SOLD_RECORD_ROLE = 'soldRecord' as const;

export function SoldItemDetailScreen() {
    const { t, i18n } = useTranslation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route = useRoute<any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navigation = useNavigation<any>();
    const { itemId } = route.params as { itemId: string };
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const soldItems = useItemStore(s => s.soldItems);
    const deleteItem = useItemStore(s => s.deleteItem);
    const loadSoldItems = useItemStore(s => s.loadSoldItems);
    const currency = useSettingsStore(s => s.settings?.currency ?? 'USD') as Currency;
    const weightUnit = useSettingsStore(s => s.settings?.weightUnit ?? 'oz') as WeightUnit;
    const { rates } = useSpotStore();

    const item = soldItems.find(i => i.id === itemId);

    async function handleMoveToTrash() {
        if (!item) return;
        setShowDeleteConfirm(false);
        await deleteItem(item.id);
        await loadSoldItems();
        navigation.goBack();
    }

    if (!item) {
        return (
            <View style={[styles.screen, styles.center]}>
                <Ionicons name="alert-circle-outline" size={32} color={colors.text3} />
                <Text style={styles.emptyText}>{t('common.error')}</Text>
            </View>
        );
    }

    const metal = metalTokens[item.metal];
    const fineOz = calcFineWeightOz(item.weightOz, item.purity);

    const strikeLabel = item.strikeFinish && item.strikeFinish !== 'unknown'
        ? formatStrikeLabel(item.strikeFinish) : null;
    const sub = [item.year?.toString(), strikeLabel].filter(Boolean).join(' · ');

    // Lot G1 — itemValueDisplaySemantics ne convertit aucune devise : purchasePrice/
    // soldPrice doivent être convertis en devise d'affichage avant d'entrer dans le
    // modèle (même convention que Wishlist/Active, Lots E1/F1).
    const purchaseInDisplay = item.purchasePrice != null
        ? convertCurrencyAmount(item.purchasePrice, item.purchaseCurrency ?? 'USD', currency, rates as CurrencyRates)
        : null;
    const soldInDisplay = item.soldPrice != null
        ? convertCurrencyAmount(item.soldPrice, item.soldCurrency ?? 'USD', currency, rates as CurrencyRates)
        : null;

    // soldRecord n'a pas de section melt (live/current melt hors sujet pour
    // interpréter une vente passée — NBS §18, confirmé par PERMISSIONS_BY_ROLE).
    const soldModel = getItemValueDisplayModel({
        role: SOLD_RECORD_ROLE,
        quantity: item.quantity,
        currency,
        unitMeltValue: null,
        purchasePrice: purchaseInDisplay,
        purchasePriceBasis: item.purchasePriceBasis,
        observedPrice: null,
        observedPriceBasis: null,
        soldPrice: soldInDisplay,
        soldPriceBasis: item.soldPriceBasis,
    });
    const purchaseSection = soldModel.sections.find(s => s.kind === 'purchase') ?? null;
    const soldSection = soldModel.sections.find(s => s.kind === 'sold') ?? null;
    const pnlSection = soldModel.sections.find(s => s.kind === 'realizedPnL') ?? null;
    // signal vient du modèle (favorable | unfavorable | neutral) — jamais recalculé
    // localement, contrairement à l'ancien soldColor (comparaison ad hoc sold vs achat).
    const pnlColor = pnlSection?.signal === 'favorable' ? colors.green
        : pnlSection?.signal === 'unfavorable' ? colors.crimson
        : colors.text;

    return (
        <View style={styles.screen}>
        <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Photo */}
            <View style={[styles.photoContainer, { borderColor: metal.frameBorder }]}>
                {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.photo} resizeMode="cover" />
                ) : (
                    <View style={styles.photoPlaceholder}>
                        <Ionicons name="image-outline" size={32} color={colors.text3} />
                    </View>
                )}
                <View style={[styles.metalBadge, { backgroundColor: metal.badgeBg, borderColor: metal.badgeBorder }]}>
                    <Text style={[styles.metalBadgeText, { color: metal.color }]}>
                        {t(`item.metal.${item.metal}`)}
                    </Text>
                </View>
                <View style={styles.soldBadge}>
                    <Text style={styles.soldBadgeText}>{t('item.status.sold')}</Text>
                </View>
            </View>

            {/* Name + qty */}
            <View style={styles.section}>
                <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.quantity > 1 && (
                        <View style={styles.qtyBadge}>
                            <Text style={styles.qtyText}>×{item.quantity}</Text>
                        </View>
                    )}
                </View>
                {sub ? <Text style={styles.sub}>{sub}</Text> : null}
            </View>

            {/* Physical */}
            <View style={styles.row3}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('item.weight')}</Text>
                    <Text style={styles.statVal}>{formatWeight(item.weightOz, weightUnit)}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('item.purity')}</Text>
                    <Text style={styles.statVal}>{formatPurity(item.purity)}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('item.fineWeightUnit', { unit: weightUnit })}</Text>
                    <Text style={styles.statVal}>{formatWeight(fineOz, weightUnit, true)}</Text>
                </View>
            </View>

            {/* Purchase / cost basis — modèle centralisé (Lot G1), unité + total si
                quantity > 1. Pas de ligne si donnée manquante (pas de faux calcul). */}
            {purchaseSection?.completeness === 'complete' && (
                <View style={styles.row2}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>
                            {item.quantity > 1 ? `${t('item.purchasedLabel')} · ${t('item.purchasePerUnit')}` : t('item.purchasedLabel')}
                        </Text>
                        <Text style={styles.statVal}>{formatCurrency(purchaseSection.unitAmount!, currency)}</Text>
                    </View>
                    {item.quantity > 1 ? (
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.purchasedLabel')} · {t('item.totalLot')}</Text>
                            <Text style={styles.statVal}>{formatCurrency(purchaseSection.totalAmount!, currency)}</Text>
                        </View>
                    ) : item.purchaseDate ? (
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.dateLabel')}</Text>
                            <Text style={styles.statVal}>{formatDate(item.purchaseDate, i18n.language)}</Text>
                        </View>
                    ) : null}
                </View>
            )}
            {item.quantity > 1 && item.purchaseDate && (
                <View style={styles.row2}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('item.dateLabel')}</Text>
                        <Text style={styles.statVal}>{formatDate(item.purchaseDate, i18n.language)}</Text>
                    </View>
                </View>
            )}

            {/* Sold — couleur sourcée du signal realizedPnL du modèle, jamais
                recalculée localement (remplace l'ancien soldColor ad hoc). */}
            {soldSection?.completeness === 'complete' && (
                <View style={styles.row2}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>
                            {item.quantity > 1 ? `${t('item.soldPrice')} · ${t('item.purchasePerUnit')}` : t('item.soldPrice')}
                        </Text>
                        <Text style={[styles.statVal, { color: pnlColor }]}>{formatCurrency(soldSection.unitAmount!, currency)}</Text>
                    </View>
                    {item.quantity > 1 ? (
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.soldPrice')} · {t('item.totalLot')}</Text>
                            <Text style={[styles.statVal, { color: pnlColor }]}>{formatCurrency(soldSection.totalAmount!, currency)}</Text>
                        </View>
                    ) : item.soldDate ? (
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.dateLabel')}</Text>
                            <Text style={styles.statVal}>{formatDate(item.soldDate, i18n.language)}</Text>
                        </View>
                    ) : null}
                </View>
            )}
            {item.quantity > 1 && item.soldDate && (
                <View style={styles.row2}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('item.dateLabel')}</Text>
                        <Text style={styles.statVal}>{formatDate(item.soldDate, i18n.language)}</Text>
                    </View>
                </View>
            )}

            {/* P&L réalisé — nouveau (Lot G1), pas de recalcul local : rien si
                incomplet (achat ou vente manquant), jamais de faux P&L. */}
            {pnlSection?.completeness === 'complete' && (
                <View style={styles.row2}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>
                            {item.quantity > 1 ? `${t('item.realizedPnl')} · ${t('item.purchasePerUnit')}` : t('item.realizedPnl')}
                        </Text>
                        <Text style={[styles.statVal, { color: pnlColor }]}>
                            {pnlSection.unitAmount! >= 0 ? '+' : '-'}{formatCurrency(Math.abs(pnlSection.unitAmount!), currency)}
                            {item.quantity <= 1 && pnlSection.percent != null && (
                                <>
                                    {' ('}{pnlSection.unitAmount! >= 0 ? '+' : ''}{(pnlSection.percent * 100).toFixed(1)}%{')'}
                                </>
                            )}
                        </Text>
                    </View>
                    {item.quantity > 1 && (
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.realizedPnl')} · {t('item.totalLot')}</Text>
                            <Text style={[styles.statVal, { color: pnlColor }]}>
                                {pnlSection.totalAmount! >= 0 ? '+' : '-'}{formatCurrency(Math.abs(pnlSection.totalAmount!), currency)}
                                {pnlSection.percent != null && (
                                    <>
                                        {' ('}{pnlSection.totalAmount! >= 0 ? '+' : ''}{(pnlSection.percent * 100).toFixed(1)}%{')'}
                                    </>
                                )}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </ScrollView>

        {/* Actions footer — soldRecord : view + trash uniquement (actionSemantics) */}
        <View style={styles.footer}>
            {canPerformAction(SOLD_RECORD_ROLE, 'trash') && (
                <Pressable style={styles.actionBtn} onPress={() => setShowDeleteConfirm(true)}>
                    <Ionicons name="trash-outline" size={18} color={colors.crimson} />
                    <Text style={[styles.actionLabel, { color: colors.crimson }]}>{t('item.actions.moveToTrash')}</Text>
                </Pressable>
            )}
        </View>

        {/* Move to trash confirmation modal */}
        <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
            <Pressable style={styles.overlay} onPress={() => setShowDeleteConfirm(false)}>
                <View style={styles.optionSheet}>
                    <Text style={styles.optionTitle}>{t('item.moveToTrashTitle')}</Text>
                    <Pressable style={styles.optionBtn} onPress={handleMoveToTrash}>
                        <Ionicons name="trash-outline" size={20} color={colors.crimson} />
                        <Text style={[styles.optionBtnText, { color: colors.crimson }]}>{t('item.actions.moveToTrash')}</Text>
                    </Pressable>
                    <Pressable style={styles.optionBtn} onPress={() => setShowDeleteConfirm(false)}>
                        <Text style={styles.optionBtnText}>{t('common.cancel')}</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    content: { padding: 16, paddingBottom: 100, gap: 16 },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center',
        paddingHorizontal: 8, paddingTop: 12, paddingBottom: 28,
        backgroundColor: colors.bg,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    },
    actionBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
    actionLabel: { fontSize: 10, color: colors.text2, fontFamily: fonts.outfit },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', padding: 16, paddingBottom: 40 },
    optionSheet: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
    optionTitle: { fontFamily: fonts.manrope, fontSize: 15, color: colors.text2, textAlign: 'center', paddingTop: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    optionBtnText: { fontFamily: fonts.outfitMedium, fontSize: 15, color: colors.text },
    emptyText: { fontFamily: fonts.outfit, fontSize: 14, color: colors.text2, textAlign: 'center' },
    photoContainer: {
        width: '100%', aspectRatio: 1, borderRadius: 16,
        overflow: 'hidden', borderWidth: 0.5,
    },
    photo: { width: '100%', height: '100%' },
    photoPlaceholder: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surface, gap: 8,
    },
    metalBadge: {
        position: 'absolute', top: 12, left: 12,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 10, borderWidth: 0.5,
    },
    metalBadgeText: { fontSize: fontSize.cardBadge, fontFamily: fonts.outfitSemiBold, letterSpacing: 1.5, textTransform: 'uppercase' },
    soldBadge: {
        position: 'absolute', top: 12, right: 12,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 10, backgroundColor: 'rgba(180,30,30,0.22)',
        borderWidth: 0.5, borderColor: 'rgba(180,30,30,0.45)',
    },
    soldBadgeText: { fontSize: fontSize.cardBadge, fontFamily: fonts.outfitSemiBold, color: colors.crimson, letterSpacing: 1.5, textTransform: 'uppercase' },
    section: { gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    name: { fontFamily: fonts.manrope, fontSize: 22, color: colors.text, flex: 1 },
    qtyBadge: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 10, backgroundColor: colors.surface2,
        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    },
    qtyText: { color: colors.text2, fontFamily: fonts.outfitSemiBold, fontSize: 13 },
    sub: { color: colors.text2, fontFamily: fonts.outfit, fontSize: 14 },
    row3: {
        flexDirection: 'row', justifyContent: 'space-between',
        backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    },
    row2: {
        flexDirection: 'row', gap: 20,
        backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    },
    stat: { gap: 4 },
    statLabel: { fontSize: 9, letterSpacing: 1.5, color: colors.text2, fontFamily: fonts.outfitSemiBold },
    statVal: { fontSize: 14, color: colors.text, fontFamily: fonts.dmMono },
});
