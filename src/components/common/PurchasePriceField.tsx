import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fonts } from '../../utils/theme';

type Props = {
    quantity: number;
    priceText: string;
    onPriceTextChange: (v: string) => void;
    isPerUnit: boolean;
    onIsPerUnitChange: (v: boolean) => void;
    label?: string;
};

// quantity=1 : per-unit et per-lot sont mathématiquement identiques, donc on
// n'affiche pas le toggle — un seul champ simple évite toute confusion UX.
export function PurchasePriceField({
    quantity, priceText, onPriceTextChange, isPerUnit, onIsPerUnitChange, label,
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

    const total = hasValue ? (isPerUnit ? parsed * quantity : parsed) : null;
    const perUnit = hasValue ? (isPerUnit ? parsed : parsed / quantity) : null;

    return (
        <View style={{ gap: 8 }}>
            <View style={styles.toggleRow}>
                <Pressable
                    style={[styles.toggleBtn, !isPerUnit && styles.toggleBtnActive]}
                    onPress={() => onIsPerUnitChange(false)}
                >
                    <Text style={[styles.toggleText, !isPerUnit && styles.toggleTextActive]}>{t('item.totalLot')}</Text>
                </Pressable>
                <Pressable
                    style={[styles.toggleBtn, isPerUnit && styles.toggleBtnActive]}
                    onPress={() => onIsPerUnitChange(true)}
                >
                    <Text style={[styles.toggleText, isPerUnit && styles.toggleTextActive]}>{t('item.purchasePerUnit')}</Text>
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
            {hasValue && (
                <Text style={styles.hint}>
                    {isPerUnit
                        ? t('create.totalForItems', { count: quantity, amount: total!.toFixed(2) })
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
});
