import React from 'react';
import {
    View, Text, TextInput, Pressable,
    ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PurchasePriceField } from '../common/PurchasePriceField';
import { resolvePriceEntry } from '../../domain/lotUnitValueSemantics';
import { useSpotStore } from '../../stores/spotStore';
import { toTroyOz, calcFineWeightOz, calcMeltValue, convertSpotPrice } from '../../utils/calculations';
import { colors, fonts } from '../../utils/theme';
import type { FlowState } from './CreateItemFlow';
import type { Currency } from '../../types/settings.types';

type Props = {
    state: FlowState;
    update: (patch: Partial<FlowState>) => void;
    itemStatus: 'wishlist' | 'active';
    onCreate: () => void;
    submitting: boolean;
    error: string | null;
};

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

export function CreateItemStep4({ state, update, itemStatus, onCreate, submitting, error }: Props) {
    const { t } = useTranslation();
    const { spot, rates } = useSpotStore();
    const isWishlist = itemStatus === 'wishlist';
    const recapQty = state.mode === 'simple'
        ? state.quantity
        : state.rows.reduce((s, r) => s + r.qty, 0);

    const priceCurrency = isWishlist ? state.observedCurrency : state.purchaseCurrency;
    const priceText = isWishlist ? state.observedPrice : state.purchasePrice;
    const priceBasis = isWishlist ? state.observedPriceBasis : state.purchasePriceBasis;

    const showUnderMelt = (() => {
        // En mode mix, le prix global (priceText) n'est plus renseigné par l'UI
        // (chaque row a son propre prix) — un hint basé dessus serait trompeur.
        if (state.mode === 'mix') return false;
        if (!spot || !state.metal) return false;
        const priceNum = parseFloat(priceText.replace(',', '.'));
        if (!isFinite(priceNum) || priceNum <= 0) return false;
        const weightNum = parseFloat(state.weightInput.replace(',', '.'));
        if (!isFinite(weightNum) || weightNum <= 0) return false;
        const spotInCurrency = convertSpotPrice(
            state.metal === 'gold' ? spot.gold : spot.silver,
            priceCurrency,
            rates,
        );
        if (spotInCurrency === null) return false;
        const meltPerUnit = calcMeltValue(
            calcFineWeightOz(toTroyOz(weightNum, state.weightUnit), state.purity),
            spotInCurrency,
        );
        const meltTotal = meltPerUnit * recapQty;
        // Résolution du prix saisi via le domain (Lot D3) — remplace l'ancienne
        // conversion basis→total inline. resolvePriceEntry gère à la fois le cas
        // quantity=1 (base 'unit' automatique) et l'absence de base sur qty>1
        // (résolution 'needsBasis' → pas de hint, valeur ambiguë).
        const resolution = resolvePriceEntry({ amount: priceNum, basis: priceBasis, quantity: recapQty });
        if (resolution.status !== 'ok') return false;
        return meltTotal > 0 && resolution.total > 0 && resolution.total < meltTotal;
    })();

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>{t(isWishlist ? 'item.observedPrice' : 'item.purchasePrice')}</Text>
            <Text style={styles.subtitle}>
                {state.mode === 'mix'
                    ? t(isWishlist ? 'create.step4SubtitleMixWishlist' : 'create.step4SubtitleMix')
                    : t(isWishlist ? 'create.step4SubtitleWishlist' : 'create.step4Subtitle')}
            </Text>

            <Text style={styles.label}>{t('create.priceHeading')}</Text>
            {state.mode === 'mix' ? (
                <View style={{ gap: 16 }}>
                    {state.rows.map(row => (
                        <View key={row.id} style={styles.rowPriceBlock}>
                            <View style={styles.rowPriceHeader}>
                                <Text style={styles.rowPriceTitle}>
                                    {state.seriesName}{row.year ? ` ${row.year}` : ''}
                                </Text>
                                <Text style={styles.rowPriceQty}>{t('item.quantity')} : {row.qty}</Text>
                            </View>
                            {/* Lot D2 : le champ utilise la vraie quantité de la ligne — pour
                                row.qty > 1, PurchasePriceField affiche le toggle unité/ligne
                                (base obligatoire) ; row.qty = 1 → simple champ, base 'unit' auto. */}
                            <PurchasePriceField
                                quantity={row.qty}
                                priceText={row.priceText}
                                onPriceTextChange={v => update({
                                    rows: state.rows.map(r => r.id === row.id
                                        ? { ...r, priceText: v.replace(/[^0-9.,]/g, '') }
                                        : r),
                                })}
                                basis={row.priceBasis}
                                onBasisChange={v => update({
                                    rows: state.rows.map(r => r.id === row.id ? { ...r, priceBasis: v } : r),
                                })}
                                lotLabel={t('item.rowWhole')}
                                basisPromptText={t('item.priceBasisRowRequired')}
                                label={t(isWishlist ? 'create.observedPriceLabel' : 'create.paidPriceLabel')}
                            />
                        </View>
                    ))}
                </View>
            ) : isWishlist ? (
                <PurchasePriceField
                    quantity={recapQty}
                    priceText={state.observedPrice}
                    onPriceTextChange={v => update({ observedPrice: v.replace(/[^0-9.,]/g, '') })}
                    basis={state.observedPriceBasis}
                    onBasisChange={v => update({ observedPriceBasis: v })}
                    label={t('create.observedPriceLabel')}
                />
            ) : (
                <PurchasePriceField
                    quantity={recapQty}
                    priceText={state.purchasePrice}
                    onPriceTextChange={v => update({ purchasePrice: v.replace(/[^0-9.,]/g, '') })}
                    basis={state.purchasePriceBasis}
                    onBasisChange={v => update({ purchasePriceBasis: v })}
                    label={t('create.paidPriceLabel')}
                />
            )}

            {showUnderMelt && (
                <View style={styles.underMeltRow}>
                    <Ionicons name="warning-outline" size={11} color="rgba(255,200,100,0.70)" />
                    <Text style={styles.underMeltText}>{t('create.underMeltHint')}</Text>
                </View>
            )}

            <Text style={styles.label}>{t('settings.currency')}</Text>
            <View style={styles.chipRow}>
                {CURRENCIES.map(c => (
                    <Pressable
                        key={c}
                        style={[styles.chip, (isWishlist ? state.observedCurrency : state.purchaseCurrency) === c && styles.chipActive]}
                        onPress={() => update(isWishlist ? { observedCurrency: c } : { purchaseCurrency: c })}
                    >
                        <Text style={[styles.chipText, (isWishlist ? state.observedCurrency : state.purchaseCurrency) === c && styles.chipTextActive]}>
                            {c}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Text style={styles.label}>
                {`${t(isWishlist ? 'create.observedDate' : 'create.purchaseDate')} (${t('common.optional')})`}
            </Text>
            <TextInput
                style={[styles.input, styles.inputNarrow]}
                value={isWishlist ? state.observedPriceDate : state.purchaseDate}
                onChangeText={v => update(isWishlist ? { observedPriceDate: v } : { purchaseDate: v })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text2}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
            />

            {error && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <Pressable
                style={[styles.btnCreate, submitting && styles.btnDisabled]}
                onPress={!submitting ? onCreate : undefined}
            >
                {submitting
                    ? <ActivityIndicator color={colors.text} />
                    : <Text style={styles.btnCreateText}>{t('common.create')}</Text>
                }
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40, gap: 8 },
    title: { fontFamily: fonts.manrope, fontSize: 22, color: colors.text, marginBottom: 4 },
    subtitle: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, marginBottom: 8 },
    label: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, marginTop: 12, marginBottom: 6 },
    rowPriceBlock: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    rowPriceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowPriceTitle: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text },
    rowPriceQty: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    chipText: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text2 },
    chipTextActive: { color: colors.text },
    input: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, fontFamily: fonts.outfit, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    inputNarrow: { width: 160 },
    errorBanner: { backgroundColor: 'rgba(180,30,30,0.15)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(180,30,30,0.30)', marginTop: 12 },
    errorText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.crimson },
    btnCreate: { marginTop: 16, backgroundColor: colors.violet, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    btnCreateText: { fontFamily: fonts.outfitSemiBold, fontSize: 16, color: colors.text },
    btnDisabled: { opacity: 0.4 },
    underMeltRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    underMeltText: { fontFamily: fonts.outfit, fontSize: 11, color: 'rgba(255,200,100,0.70)', flexShrink: 1 },
});
