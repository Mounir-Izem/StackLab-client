import React, { useLayoutEffect, useEffect, useState, useCallback } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import {
    View, Text, FlatList, Pressable,
    StyleSheet, ActivityIndicator, Modal,
    LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLabStore } from '../../stores/labStore';
import { useDeckStore } from '../../stores/deckStore';
import { useItemStore } from '../../stores/itemStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSpotStore } from '../../stores/spotStore';
import { convertSpotPrice, calcFineWeightOz, calcMeltValue } from '../../utils/calculations';
import { animationState } from '../../utils/animationState';
import { DeckCard } from '../cards/DeckCard';
import { ItemCard } from '../cards/ItemCard';
import { MoveItemModal } from '../modals/MoveItemModal';
import { colors, fonts, card } from '../../utils/theme';
import type { ContextMenuAction } from '../ui/ContextMenu';
import type { LabsStackScreenProps } from '../../navigation/types';
import type { Item } from '../../types/item.types';

type Props = LabsStackScreenProps<'DeckDetail'>;

export function DeckDetail({ route, navigation }: Props) {
    const { t } = useTranslation();
    const { deckId, labId } = route.params;

    const { labs } = useLabStore();
    const { decks, loadDecks, isLoading: isLoadingDecks, currentLabId, deleteDeck } = useDeckStore();
    const { items, loadItems, deleteItem } = useItemStore();
    const currency = useSettingsStore(s => s.settings?.currency ?? 'USD');
    const weightUnit = useSettingsStore(s => s.settings?.weightUnit ?? 'oz');
    const { spot, rates } = useSpotStore();

    const spotGold = spot ? convertSpotPrice(spot.gold, currency, rates) : null;
    const spotSilver = spot ? convertSpotPrice(spot.silver, currency, rates) : null;

    const lab = labs.find(l => l.id === labId);
    const deck = decks.find(d => d.id === deckId);
    const subDecks = decks.filter(d => d.parentId === deckId);
    const deckItems = items.filter(i => i.deckId === deckId && i.status === 'active');

    const [showPaywall, setShowPaywall] = useState(false);
    const [newItemId, setNewItemId] = useState<string | null>(null);
    const [moveItemId, setMoveItemId] = useState<string | null>(null);
    const moveTarget = moveItemId ? (items.find(i => i.id === moveItemId) ?? null) : null;
    const isFocused = useIsFocused();

    useFocusEffect(
        useCallback(() => {
            const newId = animationState.lastCreatedItemId;
            if (newId) {
                animationState.lastCreatedItemId = null;
                setNewItemId(newId);
                if (Platform.OS === 'android') {
                    UIManager.setLayoutAnimationEnabledExperimental?.(true);
                }
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            loadDecks(labId);
            loadItems(labId);
        }, [labId])
    );

    useEffect(() => {
        if (isFocused && !deck && !isLoadingDecks && currentLabId === labId) {
            navigation.goBack();
        }
    }, [isFocused, deck, isLoadingDecks, currentLabId, labId, navigation]);

    useLayoutEffect(() => {
        if (!deck || !lab) return;
        navigation.setOptions({
            headerTitle: () => (
                <View style={styles.breadcrumb}>
                    <Pressable onPress={() => navigation.pop()} hitSlop={8}>
                        <Text style={styles.crumbParent}>{lab.name}</Text>
                    </Pressable>
                    <Text style={styles.crumbSep}>›</Text>
                    <Text style={styles.crumbCurrent} numberOfLines={1}>{deck.name}</Text>
                </View>
            ),
        });
    }, [deck, lab, navigation]);

    const renderItem = useCallback(({ item }: { item: Item }) => {
        const spotPrice = item.metal === 'gold' ? spotGold : spotSilver;
        const meltValue = spotPrice !== null
            ? calcMeltValue(calcFineWeightOz(item.weightOz, item.purity), spotPrice) * item.quantity
            : null;

        const menuActions: ContextMenuAction[] = [
            ...(item.status !== 'sold' ? [
                {
                    label: t('item.actions.edit'),
                    icon: 'pencil-outline' as const,
                    onPress: () => navigation.navigate('EditItem', { itemId: item.id }),
                },
                {
                    label: t('item.actions.move'),
                    icon: 'arrow-forward-outline' as const,
                    onPress: () => setMoveItemId(item.id),
                },
            ] : []),
            {
                label: t('item.actions.moveToTrash'),
                icon: 'trash-outline' as const,
                onPress: () => { deleteItem(item.id); },
                destructive: true,
            },
        ];

        return (
            <View style={styles.col}>
                <ItemCard
                    item={item}
                    meltValue={meltValue}
                    currency={currency}
                    weightUnit={weightUnit}
                    onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
                    isNew={item.id === newItemId}
                    onNewAnimationEnd={() => setNewItemId(null)}
                    menuActions={menuActions}
                />
            </View>
        );
    }, [currency, weightUnit, navigation, spotGold, spotSilver, newItemId, labId, deckId, t, deleteItem]);

    if (!deck) return (
        <View style={[styles.screen, styles.center]}>
            <ActivityIndicator color={colors.violet} />
        </View>
    );

    return (
        <View style={styles.screen}>
            <FlatList
                data={deckItems}
                keyExtractor={i => i.id}
                renderItem={renderItem}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <>
                        {subDecks.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.label}>{t('labs.section.subDecks')}</Text>
                                {subDecks.map(d => {
                                    const subItems = items.filter(i => i.deckId === d.id && i.status === 'active');
                                    const totalValue = spotGold !== null && spotSilver !== null
                                        ? subItems.reduce((sum, i) => {
                                            const sp = i.metal === 'gold' ? spotGold : spotSilver;
                                            return sum + calcMeltValue(calcFineWeightOz(i.weightOz, i.purity), sp) * i.quantity;
                                        }, 0)
                                        : null;
                                    const subDeckMenuActions: ContextMenuAction[] = [
                                        {
                                            label: t('modifier.title'),
                                            icon: 'create-outline',
                                            onPress: () => navigation.navigate('Modifier', { labId, deckId: d.id }),
                                        },
                                        {
                                            label: t('common.delete'),
                                            icon: 'trash-outline',
                                            onPress: () => { deleteDeck(d.id); },
                                            destructive: true,
                                        },
                                    ];
                                    return (
                                        <DeckCard
                                            key={d.id}
                                            deck={d}
                                            itemCount={items.filter(i => i.deckId === d.id && i.status === 'active').length}
                                            subDeckCount={0}
                                            totalValue={totalValue}
                                            onPress={() => navigation.navigate('DeckDetail', { deckId: d.id, labId })}
                                            menuActions={subDeckMenuActions}
                                        />
                                    );
                                })}
                            </View>
                        )}
                        {deckItems.length > 0 && <Text style={[styles.label, styles.itemsLabel]}>{t('labs.section.items')}</Text>}
                    </>
                }
                ListEmptyComponent={
                    subDecks.length === 0
                        ? (
                            <View style={styles.empty}>
                                <Ionicons name="cube-outline" size={36} color={colors.text2} />
                                <Text style={styles.emptyTitle}>{t('deck.empty.title')}</Text>
                                <Text style={styles.emptyText}>{t('deck.empty.hint')}</Text>
                            </View>
                        )
                        : null
                }
            />

            <View style={styles.footer}>
                <Pressable style={styles.btnSecondary} onPress={() => setShowPaywall(true)}>
                    <Ionicons name="add" size={16} color={colors.text2} />
                    <Text style={styles.btnTextMuted}>{t('deck.subDeck')}</Text>
                </Pressable>
                <Pressable
                    style={styles.btnSecondary}
                    onPress={() => navigation.navigate('CreateItem', { labId, deckId })}
                >
                    <Ionicons name="add" size={20} color={colors.text} />
                </Pressable>
                <Pressable
                    style={[styles.btnSecondary, styles.btnWide]}
                    onPress={() => navigation.navigate('Modifier', { labId, deckId })}
                >
                    <Text style={styles.btnText}>{t('common.edit')}</Text>
                </Pressable>
            </View>

            {moveTarget && (
                <MoveItemModal
                    item={moveTarget}
                    visible
                    onClose={() => setMoveItemId(null)}
                />
            )}

            <Modal visible={showPaywall} transparent animationType="fade" onRequestClose={() => setShowPaywall(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowPaywall(false)}>
                    <View style={styles.sheet}>
                        <Text style={styles.sheetTitle}>{t('deck.premiumFeature.title')}</Text>
                        <Text style={styles.sheetBody}>{t('deck.premiumFeature.message')}</Text>
                        <View style={styles.sheetActions}>
                            <Pressable style={styles.btnPrimary} onPress={() => setShowPaywall(false)}>
                                <Text style={styles.btnText}>{t('common.gotIt')}</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 90 },
    section: { marginBottom: 20, gap: 12 },
    label: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, marginBottom: 8, textTransform: 'uppercase' },
    itemsLabel: { marginBottom: 10 },
    row: { gap: card.gridGap, marginBottom: card.gridGap },
    col: { flex: 1, maxWidth: '50%' },
    empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
    emptyTitle: { color: colors.text, fontFamily: fonts.manrope, fontSize: 16 },
    emptyText: { color: colors.text2, fontFamily: fonts.outfit, fontSize: 13 },
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 260 },
    crumbParent: { color: colors.text2, fontFamily: fonts.outfit, fontSize: 13 },
    crumbSep: { color: colors.text2, fontSize: 13, opacity: 0.5 },
    crumbCurrent: { color: colors.text, fontFamily: fonts.manrope, fontSize: 14, flexShrink: 1 },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', gap: 8,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
        backgroundColor: colors.bg,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    },
    btnSecondary: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: 10, backgroundColor: colors.surface2,
    },
    btnWide: { flex: 1 },
    btnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.violet, alignItems: 'center' },
    btnCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center' },
    disabled: { opacity: 0.4 },
    btnText: { color: colors.text, fontFamily: fonts.outfitSemiBold, fontSize: 14 },
    btnTextMuted: { color: colors.text2, fontFamily: fonts.outfitMedium, fontSize: 14 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    sheet: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 14 },
    sheetTitle: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text, textAlign: 'center' },
    sheetBody: { color: colors.text2, fontFamily: fonts.outfit, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    sheetActions: { flexDirection: 'row', gap: 10 },
    input: { backgroundColor: colors.surface2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontFamily: fonts.outfit, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    errorText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.crimson, textAlign: 'center' },
});
