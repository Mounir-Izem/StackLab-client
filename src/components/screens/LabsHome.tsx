import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLabStore } from '../../stores/labStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSpotStore } from '../../stores/spotStore';
import { convertSpotPrice } from '../../utils/calculations';
import { LabCard } from '../cards/LabCard';
import { colors, fonts } from '../../utils/theme';
import type { LabsStackScreenProps } from '../../navigation/types';
import type { Lab } from '../../types/lab.types';

type Props = LabsStackScreenProps<'LabsHome'>;

export function LabsHome({ navigation }: Props) {
    const { labs, labActiveSummaries, wishlistSummary, soldSummary, trashSummary, labOzTotals, loadLabs, isLoading } = useLabStore();
    const { settings, updateSettings } = useSettingsStore();
    const { spot, rates } = useSpotStore();
    const currency = settings?.currency ?? 'USD';

    const spotGold = spot ? convertSpotPrice(spot.gold, currency, rates) : null;
    const spotSilver = spot ? convertSpotPrice(spot.silver, currency, rates) : null;

    const [reminderDismissed, setReminderDismissed] = useState(false);

    const activeCards = Object.values(labActiveSummaries).reduce((sum, v) => sum + v.cards, 0);
    const totalItems = activeCards + wishlistSummary.cards + soldSummary.cards;

    const daysSinceBackup = settings?.lastBackupAt
        ? (Date.now() - new Date(settings.lastBackupAt).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;

    const showReminderBanner =
        !settings?.autoBackupEnabled &&
        !!settings?.backupReminder &&
        totalItems > 0 &&
        daysSinceBackup > 7 &&
        !reminderDismissed;

    const showBackupBanner =
        !showReminderBanner &&
        !settings?.autoBackupEnabled &&
        !settings?.backupBannerDismissed &&
        totalItems >= 5;

    useFocusEffect(
        useCallback(() => { loadLabs(); }, [])
    );

    const renderLab = useCallback(({ item }: { item: Lab }) => {
        const ozGold = labOzTotals[item.id]?.gold ?? 0;
        const ozSilver = labOzTotals[item.id]?.silver ?? 0;
        const totalValue = spotGold !== null && spotSilver !== null
            ? ozGold * spotGold + ozSilver * spotSilver
            : null;

        const summary = item.type === 'wishlist' ? wishlistSummary
            : item.type === 'trash' ? trashSummary
            : labActiveSummaries[item.id] ?? { cards: 0, units: 0 };

        return (
            <LabCard
                lab={item}
                cards={summary.cards}
                units={summary.units}
                totalOzGold={ozGold}
                totalOzSilver={ozSilver}
                totalValue={totalValue}
                currency={currency}
                onPress={() => navigation.navigate('LabDetail', { labId: item.id })}
            />
        );
    }, [labActiveSummaries, wishlistSummary, trashSummary, labOzTotals, spotGold, spotSilver, currency, navigation]);

    if (isLoading && labs.length === 0) {
        return (
            <View style={[styles.screen, styles.center]}>
                <ActivityIndicator color={colors.violet} />
            </View>
        );
    }

    const reminderBanner = showReminderBanner ? (
        <View style={styles.banner}>
            <Ionicons name="time-outline" size={18} color={colors.violet} style={styles.bannerIcon} />
            <Text style={styles.bannerText}>
                {settings?.lastBackupAt
                    ? "It's been over a week since your last backup."
                    : "You haven't backed up your stack yet."} Export it in Settings.
            </Text>
            <Pressable onPress={() => setReminderDismissed(true)} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.text2} />
            </Pressable>
        </View>
    ) : null;

    const backupBanner = showBackupBanner ? (
        <View style={styles.banner}>
            <Ionicons name="shield-outline" size={18} color={colors.violet} style={styles.bannerIcon} />
            <Text style={styles.bannerText}>Back up your stack to keep your data safe.</Text>
            <Pressable onPress={() => updateSettings({ backupBannerDismissed: true })} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.text2} />
            </Pressable>
        </View>
    ) : null;

    return (
        <View style={styles.screen}>
            <FlatList
                data={labs}
                keyExtractor={item => item.id}
                renderItem={renderLab}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshing={isLoading}
                onRefresh={loadLabs}
                ListHeaderComponent={reminderBanner ?? backupBanner}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    separator: {
        height: 12,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        gap: 8,
    },
    bannerIcon: { flexShrink: 0 },
    bannerText: {
        flex: 1,
        fontFamily: fonts.outfit,
        fontSize: 13,
        color: colors.text2,
        lineHeight: 18,
    },
});
