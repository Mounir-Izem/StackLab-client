import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useItemStore } from '../../stores/itemStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { resolvePriceEntry } from '../../domain/lotUnitValueSemantics';
import { colors, fonts, metalTokens } from '../../utils/theme';
import type { Item, PriceBasis } from '../../types/item.types';
import type { Currency } from '../../types/settings.types';


// Base de saisie par row (Lot D3) — null = pas encore choisie. Bloque la vente
// en masse si qty > 1 et prix saisi sans base. Remplace l'ancien flag perUnit
// présélectionné à true, qui devinait silencieusement l'intention utilisateur.
type SellRow = { itemId: string; qty: number; price: string; basis: PriceBasis | null };

type Props = {
    items: Item[];
    labName: string;
    deckName: string | null;
    onBack: () => void;
    onDone: () => void;
};

export function ModifierScreenD({ items, labName, deckName, onBack, onDone }: Props) {
    const { t } = useTranslation();
    const [rows, setRows] = useState<SellRow[]>(() =>
        items.map(i => ({ itemId: i.id, qty: 0, price: '', basis: null }))
    );
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [basisErrorRowIds, setBasisErrorRowIds] = useState<Set<string>>(new Set());
    const insets = useSafeAreaInsets();
    const { sellManyItems } = useItemStore();
    const currency = useSettingsStore(s => s.settings?.currency ?? 'USD');
    const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency as Currency);
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);


    function updateRow(itemId: string, patch: Partial<SellRow>) {
        setRows(prev => prev.map(r => r.itemId === itemId ? { ...r, ...patch } : r));
        // Un edit sur la row (prix, qty, ou base) invalide un éventuel blocage
        // précédent — l'utilisateur retente, ne pas afficher une erreur périmée.
        if (basisErrorRowIds.has(itemId)) {
            setBasisErrorRowIds(prev => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
        }
    }

    function setQty(itemId: string, raw: string) {
        const max = items.find(i => i.id === itemId)?.quantity ?? 0;
        const n = Math.min(Math.max(0, parseInt(raw, 10) || 0), max);
        updateRow(itemId, { qty: n });
    }

    async function handleConfirm() {
        if (submitting) return;
        setError(null);

        // Résolution via resolvePriceEntry (Lot D) — ne pas refaire la règle
        // unit/lot à la main. Bloque toute la vente si une seule row qty > 1
        // a un prix sans base choisie : aucune vente partielle n'est envoyée.
        const errorRowIds = new Set<string>();
        const resolved: Array<{ itemId: string; qty: number; price: number | null; isPerUnit: boolean }> = [];
        for (const row of rows) {
            if (row.qty <= 0) continue;
            const price = row.price.trim() ? parseFloat(row.price.replace(',', '.')) : null;
            const resolution = resolvePriceEntry({ amount: price, basis: row.basis, quantity: row.qty });
            if (resolution.status === 'needsBasis') {
                errorRowIds.add(row.itemId);
                continue;
            }
            resolved.push({
                itemId: row.itemId,
                qty: row.qty,
                price,
                isPerUnit: resolution.status === 'ok' ? resolution.isPerUnit : false,
            });
        }
        if (errorRowIds.size > 0) {
            setBasisErrorRowIds(errorRowIds);
            setError(t('item.priceBasisRequired'));
            return;
        }

        setSubmitting(true);
        const soldDate = new Date().toISOString();
        const sells = resolved.map(r => ({
            id: r.itemId,
            qty: r.qty,
            soldPrice: r.price,
            perUnit: r.isPerUnit,
            soldCurrency: selectedCurrency,
            soldDate,
        }));
        await sellManyItems(sells);
        if (useItemStore.getState().error) {
            setError(t('modifier.saleFailed'));
            setSubmitting(false);
            return;
        }
        setSubmitting(false);
        onDone();
    }

    const totalToSell = rows.reduce((s, r) => s + r.qty, 0);
    const totalSelected = items.reduce((s, i) => s + i.quantity, 0);


    return (
        <View style={styles.screen}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Pressable onPress={onBack} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>{t('sell.title')}</Text>
                <View style={styles.placeholder} />
            </View>

            <Text style={styles.breadcrumb}>{labName}{deckName ? ` › ${deckName}` : ''}</Text>
            <Text style={styles.subtitle}>{t('modifier.sellSubtitle')}</Text>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {items.map(item => {
                    const row = rows.find(r => r.itemId === item.id)!;
                    const token = metalTokens[item.metal];
                    return (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.thumb, { backgroundColor: token.color + '22' }]}>
                                    <Ionicons name="diamond-outline" size={14} color={token.color} />
                                </View>
                                <View>
                                    <Text style={styles.cardName}>{item.name}</Text>
                                    <Text style={styles.cardAvail}>{t('modifier.availableCount', { count: item.quantity })}</Text>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>{t('sell.title')}</Text>
                                <View style={styles.qtyRow}>
                                    <Pressable
                                        style={styles.qtyBtn}
                                        onPress={() => updateRow(item.id, { qty: Math.max(0, row.qty - 1) })}
                                        disabled={row.qty <= 0}
                                    >
                                        <Ionicons name="remove" size={18} color={row.qty > 0 ? colors.text : colors.text2} />
                                    </Pressable>
                                    <TextInput
                                        style={styles.qtyInput}
                                        value={String(row.qty)}
                                        keyboardType="number-pad"
                                        onChangeText={val => setQty(item.id, val)}
                                        selectTextOnFocus
                                    />
                                    <Pressable
                                        style={styles.qtyBtn}
                                        onPress={() => updateRow(item.id, { qty: Math.min(item.quantity, row.qty + 1) })}
                                        disabled={row.qty >= item.quantity}
                                    >
                                        <Ionicons name="add" size={18} color={row.qty < item.quantity ? colors.text : colors.text2} />
                                    </Pressable>
                                    <Text style={styles.qtyMax}>/ {item.quantity}</Text>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>{t('item.salePriceLabel')}</Text>
                                <View style={styles.priceRow}>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="0.00"
                                        placeholderTextColor={colors.text2}
                                        value={row.price}
                                        onChangeText={val => updateRow(item.id, { price: val })}
                                        keyboardType="decimal-pad"
                                    />
                                    <Pressable onPress={() => setShowCurrencyPicker(true)} style={styles.currencyBtn}>
                                        <Text style={styles.priceCurrency}>{selectedCurrency} ▾</Text>
                                    </Pressable>

                                    {row.qty > 1 && (
                                        <>
                                            <Pressable
                                                style={[styles.perUnitBtn, row.basis === 'lotTotal' && styles.perUnitBtnActive]}
                                                onPress={() => updateRow(item.id, { basis: 'lotTotal' })}
                                            >
                                                <Text style={[styles.perUnitText, row.basis === 'lotTotal' && styles.perUnitTextActive]}>{t('item.perLot')}</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[styles.perUnitBtn, row.basis === 'unit' && styles.perUnitBtnActive]}
                                                onPress={() => updateRow(item.id, { basis: 'unit' })}
                                            >
                                                <Text style={[styles.perUnitText, row.basis === 'unit' && styles.perUnitTextActive]}>{t('item.purchasePerUnit')}</Text>
                                            </Pressable>
                                        </>
                                    )}
                                </View>
                                {basisErrorRowIds.has(item.id) && (
                                    <Text style={styles.basisPrompt}>{t('item.priceBasisRequired')}</Text>
                                )}
                            </View>
                        </View>
                    );
                })}

                <View style={styles.summary}>
                    <Text style={styles.summaryText}>
                        {totalToSell === 0
                            ? t('modifier.noSale')
                            : t('modifier.saleInfo', {
                                sell: t('common.units', { count: totalToSell }),
                                total: totalSelected,
                            })
                        }
                    </Text>
                </View>

                {error !== null && <Text style={styles.errorText}>{error}</Text>}
            </ScrollView>

            <View style={styles.footer}>
                <Pressable
                    style={[styles.confirmBtn, (submitting || totalToSell === 0) && styles.disabled]}
                    onPress={handleConfirm}
                    disabled={submitting || totalToSell === 0}
                >
                    <Text style={styles.confirmBtnText}>
                        {submitting ? t('modifier.processing') : t('sell.confirm')}
                    </Text>
                </Pressable>
                <Pressable style={styles.backBtn} onPress={onBack} disabled={submitting}>
                    <Text style={styles.backBtnText}>{t('modifier.back')}</Text>
                </Pressable>
            </View>
            <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowCurrencyPicker(false)}>
                    <View style={styles.pickerSheet}>
                        <Text style={styles.pickerTitle}>{t('item.saleCurrencyLabel')}</Text>
                        <View style={styles.pickerChips}>
                            {(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as Currency[]).map(c => (
                                <Pressable
                                    key={c}
                                    style={[styles.chip, selectedCurrency === c && styles.chipActive]}
                                    onPress={() => { setSelectedCurrency(c); setShowCurrencyPicker(false); }}
                                >
                                    <Text style={[styles.chipText, selectedCurrency === c && styles.chipTextActive]}>{c}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 12,
    },
    headerTitle: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text },
    placeholder: { width: 22 },
    breadcrumb: { paddingHorizontal: 16, paddingBottom: 2, fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    subtitle: { paddingHorizontal: 16, paddingBottom: 12, fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, lineHeight: 19 },
    content: { padding: 16, gap: 14, paddingBottom: 150 },
    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 14 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    thumb: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    cardName: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text },
    cardAvail: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    section: { gap: 6 },
    sectionLabel: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: { width: 36, height: 36, backgroundColor: colors.surface2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    qtyInput: { width: 56, height: 36, backgroundColor: colors.surface2, borderRadius: 8, textAlign: 'center', color: colors.text, fontFamily: fonts.dmMono, fontSize: 16 },
    qtyMax: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    priceInput: { flex: 1, height: 40, backgroundColor: colors.surface2, borderRadius: 8, paddingHorizontal: 12, color: colors.text, fontFamily: fonts.dmMono, fontSize: 15 },
    priceCurrency: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    currencyBtn: { paddingHorizontal: 8, paddingVertical: 6 },
    perUnitBtn: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.surface2, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
    perUnitBtnActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    perUnitText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    perUnitTextActive: { color: colors.text },
    basisPrompt: { fontFamily: fonts.outfit, fontSize: 12, color: 'rgba(255,200,100,0.85)', marginTop: 4 },
    summary: { backgroundColor: colors.surface, borderRadius: 12, padding: 14 },
    summaryText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    errorText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.crimson, textAlign: 'center' },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32,
        backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border, gap: 8,
    },
    confirmBtn: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    confirmBtnText: { fontFamily: fonts.outfitSemiBold, fontSize: 15, color: '#0A1A0F' },
    backBtn: { alignItems: 'center', paddingVertical: 10 },
    backBtnText: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text2 },
    disabled: { opacity: 0.4 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    pickerSheet: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 16 },
    pickerTitle: { fontFamily: fonts.manrope, fontSize: 15, color: colors.text, textAlign: 'center' },
    pickerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    chipText: { fontFamily: fonts.outfitSemiBold, fontSize: 13, color: colors.text2 },
    chipTextActive: { color: colors.text },
});
