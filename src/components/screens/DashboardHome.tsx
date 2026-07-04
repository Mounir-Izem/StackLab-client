import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet,
    ScrollView, ActivityIndicator, Pressable, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLabStore } from '../../stores/labStore';
import { useSpotStore } from '../../stores/spotStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { convertSpotPrice, calcTotalInvested, calcUnrealizedPnL, calcRealizedPnL, sumByCurrency } from '../../utils/calculations';
import { formatWeight, formatCurrency, formatPnL } from '../../utils/formatters';
import { formatCountDisplay } from '../../utils/countDisplayFormatter';
import { getActiveHoldingCountDisplay, getWishlistCountDisplay, getSoldHistoryCountDisplay } from '../../domain/countSemantics';
import { snapshotService } from '../../services/snapshotService';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useCounterAnimationWithCurrency } from '../../hooks/useCounterAnimation';
import { colors, fonts } from '../../utils/theme';
import type { Animated } from 'react-native';
import type { Currency, WeightUnit } from '../../types/settings.types';

const CURRENCY_SYMBOL: Record<Currency, string> = {
    USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
};

// Composant interne — anime un nombre de 0 → value avec formatage libre.
// Utilise addListener pour déclencher setDisplay à chaque frame.
function AnimatedCounter({
    animated,
    value,
    currency,
    reduceMotion,
    style,
    format,
    nullDisplay = '—',
}: {
    animated: Animated.Value;
    value: number | null;
    currency: Currency;
    reduceMotion: boolean;
    style?: object | (object | false | undefined)[];
    format: (v: number, currency: Currency) => string;
    nullDisplay?: string;
}) {
    const [display, setDisplay] = useState<string>(() =>
        value !== null ? (reduceMotion ? format(value, currency) : format(0, currency)) : nullDisplay
    );

    useEffect(() => {
        if (value === null) {
            setDisplay(nullDisplay);
            return;
        }
        const id = animated.addListener(({ value: v }) => {
            setDisplay(format(v, currency));
        });
        return () => { animated.removeListener(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, currency, nullDisplay]);

    return <Text style={style as any}>{display}</Text>;
}

export function DashboardHome() {
    const { t } = useTranslation();
    const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const { labs, labOzTotals, labActiveSummaries, wishlistSummary, soldSummary, labInvestedTotals, loadLabs, isLoading: labsLoading } = useLabStore();
    const { spot, rates, isLoading: spotLoading, refresh } = useSpotStore();
    const reduceMotion = useReducedMotion();

    function handleRefresh() {
        loadLabs();
        refresh();
    }
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

    const activeCards = Object.values(labActiveSummaries).reduce((sum, v) => sum + v.cards, 0);
    const activeUnits = Object.values(labActiveSummaries).reduce((sum, v) => sum + v.units, 0);
    // groupedLotCount = nombre d'items quantity > 1 — le "N lot(s)" affiché à
    // l'utilisateur, jamais activeCards (nombre de rows en base).
    const activeGroupedLotCount = Object.values(labActiveSummaries).reduce((sum, v) => sum + v.groupedLotCount, 0);

    const spotGold = spot ? convertSpotPrice(spot.gold, currency, rates) : null;
    const spotSilver = spot ? convertSpotPrice(spot.silver, currency, rates) : null;

    const totalValue = spotGold !== null && spotSilver !== null
        ? totalFineOzGold * spotGold + totalFineOzSilver * spotSilver
        : null;

    const investedByCurrency: Record<string, number> = {};
    for (const [labId, byCurrency] of Object.entries(labInvestedTotals)) {
        if (labId === trashLab?.id) continue;
        for (const [cur, amount] of Object.entries(byCurrency)) {
            investedByCurrency[cur] = (investedByCurrency[cur] ?? 0) + amount;
        }
    }
    const totalInvested = calcTotalInvested(investedByCurrency, currency, rates);
    const unrealizedPnL = totalValue !== null && totalInvested !== null
        ? calcUnrealizedPnL(totalValue, totalInvested)
        : null;

    const hasActiveHoldings = activeCards > 0;
    const hasAnything = hasActiveHoldings || wishlistSummary.cards > 0 || soldSummary.cards > 0;

    const realizedProceeds = sumByCurrency(soldSummary.proceedsByCurrency, currency, rates);
    const realizedCostBasis = sumByCurrency(soldSummary.costBasisByCurrency, currency, rates);
    const realizedPnL = calcRealizedPnL(realizedProceeds, realizedCostBasis);

    const activeCountLabel = formatCountDisplay(
        getActiveHoldingCountDisplay({ groupedLotCount: activeGroupedLotCount, unitCount: activeUnits }), t
    );
    const wishlistCountLabel = formatCountDisplay(
        getWishlistCountDisplay({ wishCount: wishlistSummary.cards }), t
    );
    const soldCountLabel = formatCountDisplay(
        getSoldHistoryCountDisplay({ saleCount: soldSummary.cards, soldUnitCount: soldSummary.units }), t
    );

    // Animated counters — useNativeDriver: false (valeurs numériques)
    const animTotalValue = useCounterAnimationWithCurrency(totalValue, currency, reduceMotion);
    const animInvested = useCounterAnimationWithCurrency(totalInvested, currency, reduceMotion);
    const animPnL = useCounterAnimationWithCurrency(unrealizedPnL, currency, reduceMotion);

    useEffect(() => {
        if (!spot || !hasActiveHoldings) return;
        void snapshotService.captureIfNeeded(spot.gold, spot.silver, currency);
    }, [spot?.gold, spot?.silver, hasActiveHoldings, currency]); // eslint-disable-line react-hooks/exhaustive-deps

    const pnlColor = unrealizedPnL !== null && unrealizedPnL > 0
        ? { color: colors.green }
        : unrealizedPnL !== null && unrealizedPnL < 0
            ? { color: colors.crimson }
            : undefined;

    if (!hasAnything) {
        return (
            <View style={[styles.screen, styles.center]}>
                <Ionicons name="layers-outline" size={40} color={colors.text2} />
                <Text style={styles.emptyTitle}>{t('dashboard.empty.title')}</Text>
                <Text style={styles.emptyText}>{t('dashboard.empty.hint')}</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={labsLoading || spotLoading} onRefresh={handleRefresh} tintColor={colors.violet} />
            }
        >

            {/* Total value */}
            <View style={styles.valueCard}>
                <Text style={styles.valueLabel}>{t('dashboard.totalValue')}</Text>
                {spotLoading && !spot ? (
                    <ActivityIndicator color={colors.violet} style={{ marginVertical: 8 }} />
                ) : totalValue !== null ? (
                    <AnimatedCounter
                        animated={animTotalValue}
                        value={totalValue}
                        currency={currency}
                        reduceMotion={reduceMotion}
                        style={styles.totalValue}
                        format={(v, cur) =>
                            `${CURRENCY_SYMBOL[cur as Currency]}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        }
                    />
                ) : (
                    <Text style={styles.totalValue}>—</Text>
                )}
                {!spot && !spotLoading && (
                    <View style={styles.spotUnavailRow}>
                        <Ionicons name="cloud-offline-outline" size={13} color={colors.text2} />
                        <Text style={styles.spotUnavailText}>{t('dashboard.spotUnavailableHint')}</Text>
                    </View>
                )}
                {spot && (
                    <Text style={styles.spotSource}>
                        {t('dashboard.basedOnSpot', {
                            currency,
                            time: new Date(spot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        })}
                    </Text>
                )}
            </View>

            {/* P&L */}
            <View style={styles.pnlCard}>
                <View style={styles.pnlRow}>
                    <View style={styles.pnlItem}>
                        <Text style={styles.statLabel}>{t('dashboard.invested')}</Text>
                        <AnimatedCounter
                            animated={animInvested}
                            value={totalInvested}
                            currency={currency}
                            reduceMotion={reduceMotion}
                            style={styles.statValue}
                            format={(v, cur) => formatCurrency(v, cur)}
                        />
                        {totalInvested === null && (
                            <Text style={styles.statNote}>{t('dashboard.addPricesHint')}</Text>
                        )}
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.pnlItem}>
                        <Text style={styles.statLabel}>{t('dashboard.unrealizedPnl')}</Text>
                        <AnimatedCounter
                            animated={animPnL}
                            value={unrealizedPnL}
                            currency={currency}
                            reduceMotion={reduceMotion}
                            style={[styles.statValue, pnlColor]}
                            format={(v, cur) => formatPnL(v, cur)}
                        />
                    </View>
                </View>
            </View>

            {/* Metals breakdown */}
            <View style={styles.metalsRow}>
                <View style={styles.metalCard}>
                    <Text style={styles.metalLabel}>{t('dashboard.gold')}</Text>
                    <Text style={[styles.metalOz, { color: colors.gold }]}>
                        {formatWeight(totalFineOzGold, weightUnit, true)}
                    </Text>
                    <Text style={styles.metalSub}>{t('dashboard.fineUnit', { unit: weightUnit })}</Text>
                    {spotGold !== null && (
                        <Text style={styles.metalValue}>
                            {formatCurrency(totalFineOzGold * spotGold, currency)}
                        </Text>
                    )}
                </View>
                <View style={styles.metalCard}>
                    <Text style={styles.metalLabel}>{t('dashboard.silver')}</Text>
                    <Text style={[styles.metalOz, { color: colors.silver }]}>
                        {formatWeight(totalFineOzSilver, weightUnit, true)}
                    </Text>
                    <Text style={styles.metalSub}>{t('dashboard.fineUnit', { unit: weightUnit })}</Text>
                    {spotSilver !== null && (
                        <Text style={styles.metalValue}>
                            {formatCurrency(totalFineOzSilver * spotSilver, currency)}
                        </Text>
                    )}
                </View>
            </View>

            {/* Buckets: active / wishlist */}
            <View style={styles.bucketsBlock}>
                {hasActiveHoldings && (
                    <View style={styles.countRow}>
                        <Ionicons name="layers-outline" size={16} color={colors.text2} />
                        <Text style={styles.countText}>
                            {t('dashboard.activeHoldings')} · {activeCountLabel}
                        </Text>
                    </View>
                )}
                {wishlistSummary.cards > 0 && (
                    <View style={styles.countRow}>
                        <Ionicons name="heart-outline" size={16} color={colors.text2} />
                        <Text style={styles.countText}>
                            {t('dashboard.wishlistLabel')} · {wishlistCountLabel}
                        </Text>
                    </View>
                )}
            </View>

            {/* Sold history — carte compacte, clairement cliquable */}
            {soldSummary.cards > 0 && (
                <Pressable style={styles.soldCard} onPress={() => navigation.navigate('SoldHistory')}>
                    <View style={styles.soldHeaderRow}>
                        <Text style={styles.soldTitle}>{t('dashboard.soldHistory')}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.text2} />
                    </View>
                    <Text style={styles.soldSubtitle}>{soldCountLabel}</Text>
                    {realizedPnL !== null && (
                        <Text style={[styles.soldValue, realizedPnL >= 0 ? { color: colors.green } : { color: colors.crimson }]}>
                            {t('dashboard.realized', { value: formatPnL(realizedPnL, currency) })}
                        </Text>
                    )}
                </Pressable>
            )}

            {/* Refresh spot */}
            <Pressable style={styles.refreshBtn} onPress={refresh}>
                <Ionicons name="refresh-outline" size={14} color={colors.text2} />
                <Text style={styles.refreshText}>{t('dashboard.refreshSpot')}</Text>
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
    valueLabel: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, textTransform: 'uppercase' },
    totalValue: { fontFamily: fonts.dmMono, fontSize: 38, color: colors.text, letterSpacing: -1 },
    spotUnavailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    spotUnavailText: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2 },
    spotSource: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2 },
    pnlCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    pnlRow: { flexDirection: 'row', alignItems: 'flex-start' },
    pnlItem: { flex: 1, gap: 4, alignItems: 'center' },
    divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 16, alignSelf: 'stretch' },
    statLabel: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, textTransform: 'uppercase' },
    statValue: { fontFamily: fonts.dmMono, fontSize: 20, color: colors.text },
    statNote: { fontFamily: fonts.outfit, fontSize: 10, color: colors.text2, textAlign: 'center' },
    metalsRow: { flexDirection: 'row', gap: 12 },
    metalCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    metalLabel: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, textTransform: 'uppercase' },
    metalOz: { fontFamily: fonts.dmMono, fontSize: 20 },
    metalSub: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2 },
    metalValue: { fontFamily: fonts.dmMono, fontSize: 13, color: colors.text, marginTop: 4 },
    bucketsBlock: { gap: 6 },
    countRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
    countText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    soldCard: {
        backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 4,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    soldHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    soldTitle: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, textTransform: 'uppercase' },
    soldSubtitle: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    soldValue: { fontFamily: fonts.dmMono, fontSize: 18, color: colors.text, marginTop: 2 },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 8 },
    refreshText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
});
