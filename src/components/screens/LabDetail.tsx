import React, { useLayoutEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View, Text, FlatList, Pressable,
    StyleSheet, ActivityIndicator, Modal,
    LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLabStore } from '../../stores/labStore';
import { useDeckStore } from '../../stores/deckStore';
import { useItemStore } from '../../stores/itemStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSpotStore } from '../../stores/spotStore';
import { convertSpotPrice, calcFineWeightOz, calcMeltValue } from '../../utils/calculations';
import { triggerSuccess } from '../../utils/haptics';
import { animationState } from '../../utils/animationState';
import { getMeltBadge } from '../../utils/meltAnalysis';
import type { MeltBadge } from '../../utils/meltAnalysis';
import { DeckCard } from '../cards/DeckCard';
import { ItemCard } from '../cards/ItemCard';
import { NewDeckModal } from '../modals/NewDeckModal';
import { MoveItemModal } from '../modals/MoveItemModal';
import { colors, fonts, card } from '../../utils/theme';
import type { ContextMenuAction } from '../ui/ContextMenu';
import type { LabsStackScreenProps } from '../../navigation/types';
import type { Item } from '../../types/item.types';

type Props = LabsStackScreenProps<'LabDetail'>;

const MAX_FREE_DECKS = 3;

export function LabDetail({ route, navigation }: Props) {
    const { t } = useTranslation();
    const { labId } = route.params;

    const { labs } = useLabStore();
    const { decks, loadDecks, createDeck, deleteDeck } = useDeckStore();
    const { items, loadItems, deleteItem } = useItemStore();
    const currency = useSettingsStore(s => s.settings?.currency ?? 'USD');
    const weightUnit = useSettingsStore(s => s.settings?.weightUnit ?? 'oz');
    const { spot, rates } = useSpotStore();

    const YEAR_SHAPES = ['coin', 'token'] as const;

    const spotGold = spot ? convertSpotPrice(spot.gold, currency, rates) : null;
    const spotSilver = spot ? convertSpotPrice(spot.silver, currency, rates) : null;

    const lab = labs.find(l => l.id === labId);
    const isTrash = lab?.type === 'trash';
    const isWishlist = lab?.type === 'wishlist';
    const rootDecks = decks.filter(d => d.parentId === null);
    const directItems = items.filter(i => {
        if (i.deckId !== null || i.labId !== labId) return false;
        if (isTrash) return true;
        if (isWishlist) return i.status === 'wishlist';
        return i.status === 'active';
    });

    const [showNewDeck, setShowNewDeck] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const [newItemId, setNewItemId] = useState<string | null>(null);
    const [moveItemId, setMoveItemId] = useState<string | null>(null);
    const moveTarget = moveItemId ? (items.find(i => i.id === moveItemId) ?? null) : null;

    useFocusEffect(
        useCallback(() => {
            const newId = animationState.lastCreatedItemId;
            if (newId) {
                animationState.lastCreatedItemId = null;
                setNewItemId(newId);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            loadDecks(labId);
            loadItems(labId);
        }, [labId])
    );

    useLayoutEffect(() => {
        if (!lab) return;
        navigation.setOptions({ title: lab.name });
    }, [lab, navigation]);

    const renderItem = useCallback(({ item }: { item: Item }) => {
        const spotPrice = item.metal === 'gold' ? spotGold : spotSilver;
        const meltValue = spotPrice !== null
            ? calcMeltValue(calcFineWeightOz(item.weightOz, item.purity), spotPrice) * item.quantity
            : null;

        const meltBadge: MeltBadge = (isWishlist && item.observedPrice !== null && meltValue !== null)
            ? getMeltBadge({
                price: item.observedPrice,
                priceCurrency: item.observedCurrency ?? 'USD',
                displayCurrency: currency,
                meltTotal: meltValue,
                rates,
            })
            : null;

        const showMissingPrice = item.status === 'active' && !isTrash && item.purchasePrice === null;

        const showYearDot = item.year === null
            && item.status !== 'sold'
            && !isTrash
            && (YEAR_SHAPES as readonly string[]).includes(item.shape);

        const menuActions: ContextMenuAction[] = isTrash ? [] : [
            ...(item.status !== 'sold' ? [{
                label: t('item.actions.edit'),
                icon: 'pencil-outline' as const,
                onPress: () => navigation.navigate('EditItem', { itemId: item.id }),
            }] : []),
            ...(item.status === 'active' ? [{
                label: t('item.actions.move'),
                icon: 'arrow-forward-outline' as const,
                onPress: () => setMoveItemId(item.id),
            }] : []),
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
                    meltBadge={meltBadge}
                    showMissingPrice={showMissingPrice}
                    showYearDot={showYearDot}
                />
            </View>
        );
    }, [currency, weightUnit, navigation, spotGold, spotSilver, isTrash, newItemId, labId, t, deleteItem]);

    if (!lab) return (
        <View style={[styles.screen, styles.center]}>
            <ActivityIndicator color={colors.violet} />
        </View>
    );

    return (
        <View style={styles.screen}>
            <FlatList
                data={directItems}
                keyExtractor={i => i.id}
                renderItem={renderItem}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={[styles.content, isTrash && styles.contentNoFooter]}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <>
                        {isTrash && (
                            <Pressable
                                style={styles.trashBtn}
                                onPress={() => navigation.navigate('TrashModifier', { labId })}
                            >
                                <Ionicons name="create-outline" size={15} color={colors.crimson} />
                                <Text style={styles.trashBtnText}>{t('common.edit')}</Text>
                            </Pressable>
                        )}
                        {rootDecks.length > 0 && !isTrash && (
                            <View style={styles.section}>
                                <Text style={styles.label}>{t('labs.section.decks')}</Text>
                                {rootDecks.map(d => {
                                    const deckItems = items.filter(i => i.deckId === d.id && i.status === 'active');
                                    const totalValue = spotGold !== null && spotSilver !== null
                                        ? deckItems.reduce((sum, i) => {
                                            const sp = i.metal === 'gold' ? spotGold : spotSilver;
                                            return sum + calcMeltValue(calcFineWeightOz(i.weightOz, i.purity), sp) * i.quantity;
                                        }, 0)
                                        : null;
                                    const deckMenuActions: ContextMenuAction[] = [
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
                                            subDeckCount={decks.filter(s => s.parentId === d.id).length}
                                            totalValue={totalValue}
                                            onPress={() => navigation.navigate('DeckDetail', { deckId: d.id, labId })}
                                            menuActions={deckMenuActions}
                                        />
                                    );
                                })}
                            </View>
                        )}
                        {directItems.length > 0 && <Text style={[styles.label, styles.itemsLabel]}>{t('labs.section.items')}</Text>}
                    </>
                }
                ListEmptyComponent={
                    rootDecks.length === 0
                        ? (
                            <View style={styles.empty}>
                                <Ionicons
                                    name={isTrash ? 'trash-outline' : isWishlist ? 'cloud-outline' : 'cube-outline'}
                                    size={36}
                                    color={colors.text2}
                                />
                                <Text style={styles.emptyTitle}>
                                    {isTrash ? t('labs.emptyTrash.title') : isWishlist ? t('labs.emptyWishlist.title') : t('labs.emptyLab.title')}
                                </Text>
                                <Text style={styles.emptyText}>
                                    {isTrash ? t('labs.emptyTrash.hint') : isWishlist ? t('labs.emptyWishlist.hint') : t('labs.emptyLab.hint')}
                                </Text>
                                {!isWishlist && !isTrash && (
                                    <View style={styles.deckHint}>
                                        <Ionicons name="layers-outline" size={14} color={colors.violet} />
                                        <Text style={styles.deckHintText}>{t('labs.deckHint')}</Text>
                                    </View>
                                )}
                            </View>
                        )
                        : null
                }
            />

            {!isTrash && (
                <View style={styles.footer}>
                    {isWishlist ? (
                        <>
                            <Pressable
                                style={[styles.btnSecondary, styles.btnWide]}
                                onPress={() => navigation.navigate('CreateItem', { labId, deckId: null })}
                            >
                                <Ionicons name="add" size={16} color={colors.text} />
                                <Text style={styles.btnText}>{t('labs.addToWishlist')}</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.btnSecondary, styles.btnWide]}
                                onPress={() => navigation.navigate('Modifier', { labId, deckId: null })}
                            >
                                <Text style={styles.btnText}>{t('common.edit')}</Text>
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <Pressable
                                style={styles.btnSecondary}
                                onPress={() => rootDecks.length >= MAX_FREE_DECKS ? setShowPaywall(true) : setShowNewDeck(true)}
                            >
                                <Ionicons name="add" size={16} color={colors.text} />
                                <Text style={styles.btnText}>{t('deck.newDeck')}</Text>
                            </Pressable>
                            <Pressable
                                style={styles.btnSecondary}
                                onPress={() => navigation.navigate('CreateItem', { labId, deckId: null })}
                            >
                                <Ionicons name="add" size={20} color={colors.text} />
                            </Pressable>
                            <Pressable
                                style={[styles.btnSecondary, styles.btnWide]}
                                onPress={() => navigation.navigate('Modifier', { labId, deckId: null })}
                            >
                                <Text style={styles.btnText}>{t('common.edit')}</Text>
                            </Pressable>
                        </>
                    )}
                </View>
            )}

            <NewDeckModal
                labId={labId}
                visible={showNewDeck}
                onCancel={() => setShowNewDeck(false)}
                onCreate={async (name) => { await createDeck(name, labId); if (!useDeckStore.getState().error) { triggerSuccess(); } setShowNewDeck(false); }}
            />

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
                        <Text style={styles.sheetTitle}>{t('labs.betaFeature.title')}</Text>
                        <Text style={styles.sheetBody}>{t('labs.betaFeature.message')}</Text>
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
    contentNoFooter: { paddingBottom: 24 },
    section: { marginBottom: 20, gap: 12 },
    label: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, marginBottom: 8, textTransform: 'uppercase' },
    itemsLabel: { marginBottom: 10 },
    row: { gap: card.gridGap, marginBottom: card.gridGap },
    col: { flex: 1, maxWidth: '50%' },
    empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
    emptyTitle: { color: colors.text, fontFamily: fonts.manrope, fontSize: 16 },
    emptyText: { color: colors.text2, fontFamily: fonts.outfit, fontSize: 13 },
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
    trashBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, marginBottom: 16,
        backgroundColor: colors.surface, borderRadius: 12,
        borderWidth: 1, borderColor: colors.crimson + '44',
    },
    trashBtnText: { fontFamily: fonts.outfitSemiBold, fontSize: 14, color: colors.crimson },
    deckHint: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        marginTop: 16, paddingHorizontal: 24,
    },
    deckHintText: {
        fontFamily: fonts.outfit, fontSize: 12, color: colors.text2,
        flex: 1, lineHeight: 17,
    },
});
