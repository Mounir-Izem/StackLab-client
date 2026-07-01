import React from 'react';
import {
    View, Text, TextInput, Pressable,
    ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { PurchasePriceField } from '../common/PurchasePriceField';
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
    const isWishlist = itemStatus === 'wishlist';
    const recapQty = state.mode === 'simple'
        ? state.quantity
        : state.rows.reduce((s, r) => s + r.qty, 0);

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>{t(isWishlist ? 'item.observedPrice' : 'item.purchasePrice')}</Text>
            <Text style={styles.subtitle}>
                {t(isWishlist ? 'create.step4SubtitleWishlist' : 'create.step4Subtitle')}
            </Text>

            <Text style={styles.label}>{t('create.priceHeading')}</Text>
            {isWishlist ? (
                <PurchasePriceField
                    quantity={recapQty}
                    priceText={state.observedPrice}
                    onPriceTextChange={v => update({ observedPrice: v.replace(/[^0-9.,]/g, '') })}
                    isPerUnit={state.observedPriceIsPerUnit}
                    onIsPerUnitChange={v => update({ observedPriceIsPerUnit: v })}
                    label={t('create.observedPriceLabel')}
                />
            ) : (
                <PurchasePriceField
                    quantity={recapQty}
                    priceText={state.purchasePrice}
                    onPriceTextChange={v => update({ purchasePrice: v.replace(/[^0-9.,]/g, '') })}
                    isPerUnit={state.purchasePriceIsPerUnit}
                    onIsPerUnitChange={v => update({ purchasePriceIsPerUnit: v })}
                    label={t('create.paidPriceLabel')}
                />
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
});
