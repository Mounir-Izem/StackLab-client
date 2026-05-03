import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useLabStore } from '../../stores/labStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSpotStore } from '../../stores/spotStore';
import { convertSpotPrice } from '../../utils/calculations';
import { LabCard } from '../cards/LabCard';
import { colors } from '../../utils/theme';
import type { LabsStackScreenProps } from '../../navigation/types';
import type { Lab } from '../../types/lab.types';

type Props = LabsStackScreenProps<'LabsHome'>;

export function LabsHome({ navigation }: Props) {
    const { labs, labItemCounts, labOzTotals, loadLabs, isLoading } = useLabStore();
    const { settings } = useSettingsStore();
    const { spot, rates } = useSpotStore();
    const currency = settings?.currency ?? 'USD';

    const spotGold = spot ? convertSpotPrice(spot.gold, currency, rates) : null;
    const spotSilver = spot ? convertSpotPrice(spot.silver, currency, rates) : null;

    useFocusEffect(
        useCallback(() => { loadLabs(); }, [])
    );

    const renderLab = useCallback(({ item }: { item: Lab }) => {
        const ozGold = labOzTotals[item.id]?.gold ?? 0;
        const ozSilver = labOzTotals[item.id]?.silver ?? 0;
        const totalValue = spotGold !== null && spotSilver !== null
            ? ozGold * spotGold + ozSilver * spotSilver
            : null;

        return (
            <LabCard
                lab={item}
                itemCount={labItemCounts[item.id] ?? 0}
                totalOzGold={ozGold}
                totalOzSilver={ozSilver}
                totalValue={totalValue}
                currency={currency}
                onPress={() => navigation.navigate('LabDetail', { labId: item.id })}
            />
        );
    }, [labItemCounts, labOzTotals, spotGold, spotSilver, currency, navigation]);

    if (isLoading && labs.length === 0) {
        return (
            <View style={[styles.screen, styles.center]}>
                <ActivityIndicator color={colors.violet} />
            </View>
        );
    }

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
});
