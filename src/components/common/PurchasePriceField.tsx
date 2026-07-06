import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { normalizePriceInputToTotal } from '../../domain/lotUnitValueSemantics';
import { colors, fonts } from '../../utils/theme';
import type { PriceBasis } from '../../types/item.types';

type Props = {
    quantity: number;
    priceText: string;
    onPriceTextChange: (v: string) => void;
    // Base de saisie (Lot D). null = pas encore choisie : pour quantity > 1, aucun
    // bouton n'est présélectionné — l'utilisateur DOIT choisir. Optionnel car la
    // branche quantity <= 1 n'affiche pas de toggle (unité == lot).
    basis?: PriceBasis | null;
    onBasisChange?: (v: PriceBasis) => void;
    label?: string;
    // Personnalisation du contexte "ligne" (mix, Lot D2) : libellé du bouton
    // "total" et message de blocage. Défaut = wording "lot".
    lotLabel?: string;
    basisPromptText?: string;
};

// quantity=1 : per-unit et per-lot sont mathématiquement identiques, donc on
// n'affiche pas le toggle — un seul champ simple évite toute confusion UX.
export function PurchasePriceField({
    quantity, priceText, onPriceTextChange, basis = null, onBasisChange, label,
    lotLabel, basisPromptText,
}: Props) {
    const { t } = useTranslation();
    const parsed = parseFloat(priceText.replace(',', '.'));
    const hasValue = priceText.trim() !== '' && !isNaN(parsed);

    if (quantity <= 1) {
        return (
            <View>
                <TextInput
                    style={styles.input}
                    value={priceText}
                    onChangeText={onPriceTextChange}
                    keyboardType="decimal-pad"
                    placeholder={label ?? t('create.paidPriceLabel')}
                    placeholderTextColor={colors.text3}
                />
            </View>
        );
    }

    // Aperçu total/unité seulement une fois la base choisie — sinon la valeur
    // saisie est ambiguë et ne doit pas produire de calcul.
    const total = hasValue && basis ? normalizePriceInputToTotal({ amount: parsed, basis, quantity }) : null;
    const perUnit = hasValue && basis ? (basis === 'unit' ? parsed : parsed / quantity) : null;

    return (
        <View style={{ gap: 8 }}>
            <View style={styles.toggleRow}>
                <Pressable
                    style={[styles.toggleBtn, basis === 'lotTotal' && styles.toggleBtnActive]}
                    onPress={() => onBasisChange?.('lotTotal')}
                >
                    <Text style={[styles.toggleText, basis === 'lotTotal' && styles.toggleTextActive]}>{lotLabel ?? t('item.totalLot')}</Text>
                </Pressable>
                <Pressable
                    style={[styles.toggleBtn, basis === 'unit' && styles.toggleBtnActive]}
                    onPress={() => onBasisChange?.('unit')}
                >
                    <Text style={[styles.toggleText, basis === 'unit' && styles.toggleTextActive]}>{t('item.purchasePerUnit')}</Text>
                </Pressable>
            </View>
            <TextInput
                style={styles.input}
                value={priceText}
                onChangeText={onPriceTextChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.text3}
            />
            {hasValue && !basis && (
                <Text style={styles.basisPrompt}>{basisPromptText ?? t('item.priceBasisRequired')}</Text>
            )}
            {hasValue && basis && total !== null && (
                <Text style={styles.hint}>
                    {basis === 'unit'
                        ? t('create.totalForItems', { count: quantity, amount: total.toFixed(2) })
                        : t('create.averagePerItem', { amount: perUnit!.toFixed(2) })}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    input: {
        height: 44, backgroundColor: colors.surface, borderRadius: 10,
        paddingHorizontal: 12, color: colors.text, fontFamily: fonts.outfit, fontSize: 15,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    toggleBtnActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    toggleText: { fontFamily: fonts.outfitMedium, fontSize: 13, color: colors.text2 },
    toggleTextActive: { color: colors.text },
    hint: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text3 },
    basisPrompt: { fontFamily: fonts.outfit, fontSize: 12, color: 'rgba(255,200,100,0.85)' },
});
