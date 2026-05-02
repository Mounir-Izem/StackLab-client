import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDeckStore } from '../../stores/deckStore';
import { useItemStore } from '../../stores/itemStore';
import { colors, fonts } from '../../utils/theme';
import type { Deck } from '../../types/deck.types';

type Props = {
    decks: Deck[];
    labName: string;
    labId: string;
    onBack: () => void;
    onDone: () => void;
};

export function ModifierDeckScreen({ decks, labName, labId, onBack, onDone }: Props) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const insets = useSafeAreaInsets();
    const { decks: allDecks, deleteDeck, loadDecks } = useDeckStore();
    const { items } = useItemStore();

    function getItemCount(deckId: string) {
        return items.filter(i => i.deckId === deckId).length;
    }

    function getSubDeckCount(deckId: string) {
        return allDecks.filter(d => d.parentId === deckId).length;
    }

    function toggleSelect(id: string) {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }

    const selectedDecks = decks.filter(d => selectedIds.includes(d.id));
    const totalItems = selectedDecks.reduce((s, d) => s + getItemCount(d.id), 0);
    const totalSubDecks = selectedDecks.reduce((s, d) => s + getSubDeckCount(d.id), 0);

    async function handleDelete() {
        setDeleting(true);
        setDeleteError(null);
        for (const deck of selectedDecks) {
            await deleteDeck(deck.id);
            if (useDeckStore.getState().error) {
                setDeleteError('Delete failed. Please try again.');
                setDeleting(false);
                return;
            }
        }
        await loadDecks(labId);
        setDeleting(false);
        onDone();
    }

    return (
        <View style={styles.screen}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Pressable onPress={onBack} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>
                    {selectedIds.length === 0 ? 'Decks' : `${selectedIds.length} selected`}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <Text style={styles.breadcrumb}>{labName}</Text>
            <Text style={styles.subtitle}>Select the decks you want to delete.</Text>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {decks.length === 0 && (
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No decks in this lab.</Text>
                    </View>
                )}
                {decks.map(deck => {
                    const selected = selectedIds.includes(deck.id);
                    const itemCount = getItemCount(deck.id);
                    const subDeckCount = getSubDeckCount(deck.id);
                    return (
                        <Pressable
                            key={deck.id}
                            style={[styles.row, selected && styles.rowSelected]}
                            onPress={() => toggleSelect(deck.id)}
                        >
                            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                                {selected && <Ionicons name="checkmark" size={14} color={colors.text} />}
                            </View>
                            <View style={styles.rowInfo}>
                                <Text style={styles.rowName}>{deck.name}</Text>
                                <Text style={styles.rowMeta}>
                                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                                    {subDeckCount > 0 ? ` · ${subDeckCount} sub-deck${subDeckCount !== 1 ? 's' : ''}` : ''}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {selectedIds.length > 0 && (
                <View style={styles.footer}>
                    <Pressable style={styles.btnDelete} onPress={() => setShowConfirm(true)}>
                        <Text style={styles.btnDeleteText}>
                            Delete {selectedIds.length} deck{selectedIds.length > 1 ? 's' : ''}
                        </Text>
                    </Pressable>
                </View>
            )}

            <Modal
                visible={showConfirm}
                transparent
                animationType="fade"
                onRequestClose={() => !deleting && setShowConfirm(false)}
            >
                <Pressable style={styles.overlay} onPress={() => !deleting && setShowConfirm(false)}>
                    <View style={styles.sheet}>
                        <Text style={styles.sheetTitle}>
                            Delete {selectedIds.length} deck{selectedIds.length > 1 ? 's' : ''}?
                        </Text>
                        <Text style={styles.sheetBody}>
                            {(() => {
                                const parts = [];
                                if (totalItems > 0) parts.push(`${totalItems} item${totalItems !== 1 ? 's' : ''}`);
                                if (totalSubDecks > 0) parts.push(`${totalSubDecks} sub-deck${totalSubDecks !== 1 ? 's' : ''}`);
                                return parts.length > 0
                                    ? `These decks contain ${parts.join(' and ')}. They will be moved to ${labName}.`
                                    : 'These decks are empty and will be permanently deleted.';
                            })()}
                        </Text>
                        {deleteError !== null && (
                            <Text style={styles.errorText}>{deleteError}</Text>
                        )}
                        <View style={styles.sheetActions}>
                            <Pressable
                                style={styles.btnCancel}
                                onPress={() => setShowConfirm(false)}
                                disabled={deleting}
                            >
                                <Text style={styles.btnCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.btnConfirm, deleting && styles.disabled]}
                                onPress={handleDelete}
                                disabled={deleting}
                            >
                                <Text style={styles.btnConfirmText}>
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </Text>
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
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 12,
    },
    headerTitle: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text },
    placeholder: { width: 22 },
    breadcrumb: { paddingHorizontal: 16, paddingBottom: 2, fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    subtitle: { paddingHorizontal: 16, paddingBottom: 12, fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, lineHeight: 19 },
    content: { padding: 16, gap: 8, paddingBottom: 100 },
    empty: { alignItems: 'center', paddingTop: 48 },
    emptyText: { fontFamily: fonts.outfit, fontSize: 14, color: colors.text2 },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.surface, borderRadius: 12,
        paddingVertical: 14, paddingHorizontal: 16,
        borderWidth: 1, borderColor: 'transparent',
    },
    rowSelected: { borderColor: colors.crimson + '66' },
    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 1.5, borderColor: colors.text2,
        alignItems: 'center', justifyContent: 'center',
    },
    checkboxSelected: { backgroundColor: colors.crimson, borderColor: colors.crimson },
    rowInfo: { flex: 1 },
    rowName: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text },
    rowMeta: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2, marginTop: 2 },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32,
        backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border,
    },
    btnDelete: { backgroundColor: colors.crimson, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    btnDeleteText: { fontFamily: fonts.outfitSemiBold, fontSize: 15, color: colors.text },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    sheet: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 14 },
    sheetTitle: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text, textAlign: 'center' },
    sheetBody: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, textAlign: 'center', lineHeight: 20 },
    errorText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.crimson, textAlign: 'center' },
    sheetActions: { flexDirection: 'row', gap: 10 },
    btnCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center' },
    btnCancelText: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text2 },
    btnConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.crimson, alignItems: 'center' },
    btnConfirmText: { fontFamily: fonts.outfitSemiBold, fontSize: 14, color: colors.text },
    disabled: { opacity: 0.4 },
});
