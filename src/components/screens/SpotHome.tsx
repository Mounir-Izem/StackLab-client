import React, { useEffect, useState } from 'react';
import {
    View, Text, Pressable, StyleSheet,
    ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSpotStore } from '../../stores/spotStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { colors, fonts } from '../../utils/theme';
import type { Currency } from '../../types/settings.types';

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const UNITS = ['oz', 'g', 'kg'] as const;
type DisplayUnit = typeof UNITS[number];

const UNIT_FACTOR: Record<DisplayUnit, number> = {
    oz: 1,
    g: 1 / 31.1035,
    kg: 32.1507,
};

const CURRENCY_SYMBOL: Record<Currency, string> = {
    USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
};

function formatSpotPrice(price: number, unit: DisplayUnit, currency: Currency): string {
    const converted = price * UNIT_FACTOR[unit];
    const symbol = CURRENCY_SYMBOL[currency];
    if (converted >= 1000) return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${symbol}${converted.toFixed(2)}`;
}

function minutesAgo(isoString: string): string {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000);
    if (diff < 1) return 'just now';
    if (diff === 1) return '1 min ago';
    return `${diff} min ago`;
}

export function SpotHome() {
    const { spot, isLoading, error, fetchPrices } = useSpotStore();
    const defaultCurrency = useSettingsStore(s => s.settings?.currency ?? 'USD');

    const [currency, setCurrency] = useState<Currency>(defaultCurrency);
    const [unit, setUnit] = useState<DisplayUnit>('oz');

    useEffect(() => {
        useSpotStore.setState({ lastFetchAt: null });
        fetchPrices(currency);
    }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

    const isUnavailable = !isLoading && (error !== null) && spot === null;
    const isStale = error !== null && spot !== null;

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Currency selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.selectorRow}>
                    {CURRENCIES.map(c => (
                        <Pressable
                            key={c}
                            style={[styles.chip, currency === c && styles.chipActive]}
                            onPress={() => setCurrency(c)}
                        >
                            <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c}</Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>

            {/* Unit selector */}
            <View style={styles.selectorRow}>
                {UNITS.map(u => (
                    <Pressable
                        key={u}
                        style={[styles.chip, unit === u && styles.chipActive]}
                        onPress={() => setUnit(u)}
                    >
                        <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>/{u}</Text>
                    </Pressable>
                ))}
            </View>

            {/* Unavailable state */}
            {isUnavailable && (
                <View style={styles.unavailableBox}>
                    <Ionicons name="cloud-offline-outline" size={32} color={colors.text2} />
                    <Text style={styles.unavailableTitle}>Spot prices unavailable</Text>
                    <Text style={styles.unavailableText}>
                        {error === 'TIMEOUT'
                            ? 'The price service took too long to respond.'
                            : 'The price service is temporarily unavailable.'}
                    </Text>
                    <Pressable
                        style={styles.retryBtn}
                        onPress={() => {
                            useSpotStore.setState({ lastFetchAt: null });
                            fetchPrices(currency);
                        }}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                </View>
            )}

            {/* Loading state */}
            {isLoading && !spot && (
                <View style={styles.loadingBox}>
                    <ActivityIndicator color={colors.violet} size="large" />
                </View>
            )}

            {/* Prices */}
            {spot && (
                <>
                    {isStale && (
                        <View style={styles.staleBanner}>
                            <Ionicons name="warning-outline" size={14} color={colors.orange} />
                            <Text style={styles.staleText}>Last known price — service unavailable</Text>
                        </View>
                    )}

                    <View style={styles.priceCard}>
                        <View style={styles.metalRow}>
                            <Text style={styles.metalLabel}>GOLD</Text>
                            <Text style={styles.metalSub}>XAU</Text>
                        </View>
                        <Text style={[styles.price, { color: colors.gold }]}>
                            {formatSpotPrice(spot.gold, unit, currency as Currency)}
                        </Text>
                        <Text style={styles.perUnit}>per troy {unit}</Text>
                    </View>

                    <View style={styles.priceCard}>
                        <View style={styles.metalRow}>
                            <Text style={styles.metalLabel}>SILVER</Text>
                            <Text style={styles.metalSub}>XAG</Text>
                        </View>
                        <Text style={[styles.price, { color: colors.silver }]}>
                            {formatSpotPrice(spot.silver, unit, currency as Currency)}
                        </Text>
                        <Text style={styles.perUnit}>per troy {unit}</Text>
                    </View>

                    <View style={styles.timestampRow}>
                        <Ionicons name="time-outline" size={12} color={colors.text2} />
                        <Text style={styles.timestamp}>
                            Updated {minutesAgo(spot.updatedAt)}
                            {spot.cached ? ' · cached' : ''}
                        </Text>
                        <Pressable
                            onPress={() => {
                                useSpotStore.setState({ lastFetchAt: null });
                                fetchPrices(currency);
                            }}
                            hitSlop={8}
                        >
                            <Ionicons name="refresh-outline" size={14} color={colors.text2} />
                        </Pressable>
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    selectorRow: { flexDirection: 'row', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    chipText: { fontFamily: fonts.outfitMedium, fontSize: 13, color: colors.text2 },
    chipTextActive: { color: colors.text },
    loadingBox: { paddingTop: 60, alignItems: 'center' },
    unavailableBox: { alignItems: 'center', paddingTop: 40, gap: 10 },
    unavailableTitle: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text },
    unavailableText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, textAlign: 'center' },
    retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface2 },
    retryText: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text },
    staleBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,153,68,0.10)', borderRadius: 10, padding: 10 },
    staleText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.orange, flex: 1 },
    priceCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    metalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metalLabel: { fontFamily: fonts.manrope, fontSize: 13, color: colors.text, letterSpacing: 2 },
    metalSub: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2 },
    price: { fontFamily: fonts.dmMono, fontSize: 36, letterSpacing: -1 },
    perUnit: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
    timestamp: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
});
