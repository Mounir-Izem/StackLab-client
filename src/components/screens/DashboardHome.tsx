import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet,
    ScrollView, ActivityIndicator, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLabStore } from '../../stores/labStore';
import { useSpotStore } from '../../stores/spotStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { convertSpotPrice } from '../../utils/calculations';
import { formatWeight, formatCurrency } from '../../utils/formatters';
import { colors, fonts } from '../../utils/theme';
import type { Currency, WeightUnit } from '../../types/settings.types';

const CURRENCY_SYMBOL: Record<Currency, string> = {
    USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
};

export function DashboardHome() {
    const { labs, labOzTotals, labItemCounts, loadLabs } = useLabStore();
    const { spot, rates, isLoading: spotLoading, refresh } = useSpotStore();
    const currency = useSettingsStore(s => s.settings?.currency ?? 'USD') as Currency;
    const weightUnit = useSettingsStore(s => s.settings?.weightUnit ?? 'oz') as WeightUnit;

    useEffect(() => {
        loadLabs();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const trashLab = labs.find(l => l.type === 'trash');

    const totalFineOzGold = Object.entries(labOzTotals)
        .filter(([id]) => id !== trashLab?.id)
        .reduce((sum, [, v]) => sum + v.gold, 0);

    const totalFineOzSilver = Object.entries(labOzTotals)
        .filter(([id]) => id !== trashLab?.id)
        .reduce((sum, [, v]) => sum + v.silver, 0);

    const totalItems = Object.entries(labItemCounts)
        .filter(([id]) => id !== trashLab?.id)
        .reduce((sum, [, v]) => sum + v, 0);

    const spotGold = spot ? convertSpotPrice(spot.gold, currency, rates) : null;
    const spotSilver = spot ? convertSpotPrice(spot.silver, currency, rates) : null;

    const totalValue = spotGold !== null && spotSilver !== null
        ? totalFineOzGold * spotGold + totalFineOzSilver * spotSilver
        : null;

    const hasStack = totalItems > 0;

    if (!hasStack) {
        return (
            <View style={[styles.screen, styles.center]}>
                <Ionicons name="layers-outline" size={40} color={colors.text2} />
                <Text style={styles.emptyTitle}>Your stack is empty</Text>
                <Text style={styles.emptyText}>Add items to see your portfolio value</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {/* Total value */}
            <View style={styles.valueCard}>
                <Text style={styles.valueLabel}>TOTAL VALUE</Text>
                {spotLoading && !spot ? (
                    <ActivityIndicator color={colors.violet} style={{ marginVertical: 8 }} />
                ) : totalValue !== null ? (
                    <Text style={styles.totalValue}>
                        {CURRENCY_SYMBOL[currency]}{totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                ) : (
                    <Text style={styles.totalValue}>—</Text>
                )}
                {!spot && !spotLoading && (
                    <View style={styles.spotUnavailRow}>
                        <Ionicons name="cloud-offline-outline" size={13} color={colors.text2} />
                        <Text style={styles.spotUnavailText}>Spot unavailable · value estimate not possible</Text>
                    </View>
                )}
                {spot && (
                    <Text style={styles.spotSource}>
                        Based on spot · {currency} · last updated {new Date(spot.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                )}
            </View>

            {/* P&L — placeholder */}
            <View style={styles.pnlCard}>
                <View style={styles.pnlRow}>
                    <View style={styles.pnlItem}>
                        <Text style={styles.statLabel}>INVESTED</Text>
                        <Text style={styles.statValue}>—</Text>
                        <Text style={styles.statNote}>add purchase prices to items</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.pnlItem}>
                        <Text style={styles.statLabel}>UNREALIZED P&L</Text>
                        <Text style={styles.statValue}>—</Text>
                        <Text style={styles.statNote}>requires purchase prices</Text>
                    </View>
                </View>
            </View>

            {/* Metals breakdown */}
            <View style={styles.metalsRow}>
                <View style={styles.metalCard}>
                    <Text style={styles.metalLabel}>GOLD</Text>
                    <Text style={[styles.metalOz, { color: colors.gold }]}>
                        {formatWeight(totalFineOzGold, weightUnit)}
                    </Text>
                    <Text style={styles.metalSub}>fine {weightUnit}</Text>
                    {spotGold !== null && (
                        <Text style={styles.metalValue}>
                            {formatCurrency(totalFineOzGold * spotGold, currency)}
                        </Text>
                    )}
                </View>
                <View style={styles.metalCard}>
                    <Text style={styles.metalLabel}>SILVER</Text>
                    <Text style={[styles.metalOz, { color: colors.silver }]}>
                        {formatWeight(totalFineOzSilver, weightUnit)}
                    </Text>
                    <Text style={styles.metalSub}>fine {weightUnit}</Text>
                    {spotSilver !== null && (
                        <Text style={styles.metalValue}>
                            {formatCurrency(totalFineOzSilver * spotSilver, currency)}
                        </Text>
                    )}
                </View>
            </View>

            {/* Items count */}
            <View style={styles.countRow}>
                <Ionicons name="layers-outline" size={16} color={colors.text2} />
                <Text style={styles.countText}>
                    {totalItems} item{totalItems !== 1 ? 's' : ''} across {labs.filter(l => !l.isSystem || l.type !== 'trash').length} lab{labs.filter(l => !l.isSystem || l.type !== 'trash').length !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Refresh spot */}
            <Pressable style={styles.refreshBtn} onPress={refresh}>
                <Ionicons name="refresh-outline" size={14} color={colors.text2} />
                <Text style={styles.refreshText}>Refresh spot prices</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    emptyTitle: { fontFamily: fonts.manrope, fontSize: 18, color: colors.text },
    emptyText: { fontFamily: fonts.outfit, fontSize: 14, color: colors.text2, textAlign: 'center' },
    valueCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    valueLabel: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold },
    totalValue: { fontFamily: fonts.dmMono, fontSize: 38, color: colors.text, letterSpacing: -1 },
    spotUnavailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    spotUnavailText: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2 },
    spotSource: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2 },
    pnlCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    pnlRow: { flexDirection: 'row', alignItems: 'flex-start' },
    pnlItem: { flex: 1, gap: 4, alignItems: 'center' },
    divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 16, alignSelf: 'stretch' },
    statLabel: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold },
    statValue: { fontFamily: fonts.dmMono, fontSize: 20, color: colors.text },
    statNote: { fontFamily: fonts.outfit, fontSize: 10, color: colors.text2, textAlign: 'center' },
    metalsRow: { flexDirection: 'row', gap: 12 },
    metalCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    metalLabel: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold },
    metalOz: { fontFamily: fonts.dmMono, fontSize: 20 },
    metalSub: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2 },
    metalValue: { fontFamily: fonts.dmMono, fontSize: 13, color: colors.text, marginTop: 4 },
    countRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
    countText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 8 },
    refreshText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
});
