import React, { useLayoutEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View, Text, FlatList, Pressable,
    StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLabStore } from '../../stores/labStore';
import { useDeckStore } from '../../stores/deckStore';
import { useItemStore } from '../../stores/itemStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { triggerSuccess } from '../../utils/haptics';
import { DeckCard } from '../cards/DeckCard';
import { ItemCard } from '../cards/ItemCard';
import { NewDeckModal } from '../modals/NewDeckModal';
import { colors, fonts, card } from '../../utils/theme';
import type { LabsStackScreenProps } from '../../navigation/types';
import type { Item } from '../../types/item.types';

type Props = LabsStackScreenProps<'LabDetail'>;

const MAX_FREE_DECKS = 3;

export function LabDetail({ route, navigation }: Props) {
    const { labId } = route.params;

    const { labs } = useLabStore();
    const { decks, loadDecks, createDeck } = useDeckStore();
    const { items, loadItems } = useItemStore();
    const currency = useSettingsStore(s => s.settings?.currency ?? 'USD');
    const weightUnit = useSettingsStore(s => s.settings?.weightUnit ?? 'oz');

    const lab = labs.find(l => l.id === labId);
    const isTrash = lab?.type === 'trash';
    const isWishlist = lab?.type === 'wishlist';
    const rootDecks = decks.filter(d => d.parentId === null);
    const directItems = items.filter(i => i.deckId === null && i.labId === labId);

    const [showNewDeck, setShowNewDeck] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);

    useFocusEffect(
        useCallback(() => { loadDecks(labId); loadItems(labId); }, [labId])
    );

    useLayoutEffect(() => {
        if (!lab) return;
        navigation.setOptions({ title: lab.name });
    }, [lab, navigation]);

    const renderItem = useCallback(({ item }: { item: Item }) => (
        <View style={styles.col}>
            <ItemCard
                item={item}
                meltValue={null}
                currency={currency}
                weightUnit={weightUnit}
                onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
            />
        </View>
    ), [currency, weightUnit, navigation]);

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
                                <Text style={styles.trashBtnText}>Edit</Text>
                            </Pressable>
                        )}
                        {rootDecks.length > 0 && !isTrash && (
                            <View style={styles.section}>
                                <Text style={styles.label}>DECKS</Text>
                                {rootDecks.map(d => (
                                    <DeckCard
                                        key={d.id}
                                        deck={d}
                                        itemCount={items.filter(i => i.deckId === d.id).length}
                                        subDeckCount={decks.filter(s => s.parentId === d.id).length}
                                        totalValue={null}
                                        onPress={() => navigation.navigate('DeckDetail', { deckId: d.id, labId })}
                                    />
                                ))}
                            </View>
                        )}
                        {directItems.length > 0 && <Text style={[styles.label, styles.itemsLabel]}>ITEMS</Text>}
                    </>
                }
                ListEmptyComponent={
                    rootDecks.length === 0
                        ? (
                            <View style={styles.empty}>
                                <Ionicons name={isWishlist ? 'cloud-outline' : 'cube-outline'} size={36} color={colors.text2} />
                                <Text style={styles.emptyTitle}>
                                    {isWishlist ? 'Nothing on your wishlist' : 'This lab is empty'}
                                </Text>
                                <Text style={styles.emptyText}>
                                    {isWishlist ? 'Tap + to add items you want to acquire' : 'Tap + to add your first piece'}
                                </Text>
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
                                <Text style={styles.btnText}>Add to Wishlist</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.btnSecondary, styles.btnWide]}
                                onPress={() => navigation.navigate('Modifier', { labId, deckId: null })}
                            >
                                <Text style={styles.btnText}>Edit</Text>
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <Pressable
                                style={styles.btnSecondary}
                                onPress={() => rootDecks.length >= MAX_FREE_DECKS ? setShowPaywall(true) : setShowNewDeck(true)}
                            >
                                <Ionicons name="add" size={16} color={colors.text} />
                                <Text style={styles.btnText}>New Deck</Text>
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
                                <Text style={styles.btnText}>Edit</Text>
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

            <Modal visible={showPaywall} transparent animationType="fade" onRequestClose={() => setShowPaywall(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowPaywall(false)}>
                    <View style={styles.sheet}>
                        <Text style={styles.sheetTitle}>Beta Feature</Text>
                        <Text style={styles.sheetBody}>
                            {'StackLab is currently in beta.\nThis feature will be available in the premium version.'}
                        </Text>
                        <View style={styles.sheetActions}>
                            <Pressable style={styles.btnPrimary} onPress={() => setShowPaywall(false)}>
                                <Text style={styles.btnText}>Got it</Text>
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
    label: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, marginBottom: 8 },
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
});
