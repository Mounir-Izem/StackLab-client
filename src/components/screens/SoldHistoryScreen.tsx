import React, { useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useItemStore } from '../../stores/itemStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { metalTokens, colors, fonts } from '../../utils/theme';
import type { Item } from '../../types/item.types';
import type { Currency } from '../../types/settings.types';

export function SoldHistoryScreen() {
    const { t, i18n } = useTranslation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navigation = useNavigation<any>();
    const { soldItems, isLoading, loadSoldItems } = useItemStore();
    const currency = useSettingsStore(s => s.settings?.currency ?? 'USD') as Currency;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { loadSoldItems(); }, []);

    if (isLoading && soldItems.length === 0) {
        return (
            <View style={[styles.screen, styles.center]}>
                <ActivityIndicator color={colors.violet} />
            </View>
        );
    }

    if (soldItems.length === 0) {
        return (
            <View style={[styles.screen, styles.center]}>
                <Ionicons name="cash-outline" size={32} color={colors.text3} />
                <Text style={styles.emptyText}>{t('dashboard.soldHistoryEmpty')}</Text>
            </View>
        );
    }

    const sorted = [...soldItems].sort((a, b) =>
        (b.soldDate ?? '').localeCompare(a.soldDate ?? '')
    );

    function renderItem({ item }: { item: Item }) {
        const metal = metalTokens[item.metal];
        return (
            <Pressable style={styles.row} onPress={() => navigation.navigate('SoldItemDetail', { itemId: item.id })}>
                <View style={[styles.metalDot, { backgroundColor: metal.color }]} />
                <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.rowSub}>
                        {item.soldDate ? formatDate(item.soldDate, i18n.language) : '—'}
                        {item.soldPrice !== null
                            ? ` · ${formatCurrency(item.soldPrice, (item.soldCurrency ?? currency) as Currency)}`
                            : ''}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text2} />
            </Pressable>
        );
    }

    return (
        <FlatList
            style={styles.screen}
            contentContainerStyle={styles.list}
            data={sorted}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
        />
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    list: { paddingVertical: 8 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    metalDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    rowBody: {
        flex: 1,
        gap: 3,
    },
    rowName: {
        fontFamily: fonts.outfitMedium,
        fontSize: 15,
        color: colors.text,
    },
    rowSub: {
        fontFamily: fonts.outfit,
        fontSize: 12,
        color: colors.text2,
    },
    emptyText: {
        fontFamily: fonts.outfit,
        fontSize: 14,
        color: colors.text2,
        textAlign: 'center',
    },
});
