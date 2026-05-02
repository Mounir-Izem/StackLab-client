import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useItemStore } from '../../stores/itemStore';
import { colors, fonts } from '../../utils/theme';
import type { Item } from '../../types/item.types';

type Props = {
    items: Item[];
    labName: string;
    deckName: string | null;
    isWishlistLab?: boolean;
    onSell: () => void;
    onBack: () => void;
    onCancel: () => void;
    onDone: () => void;
};

export function ModifierScreenC({ items, labName, deckName, isWishlistLab = false, onSell, onBack, onCancel, onDone }: Props) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const { deleteItem } = useItemStore();

    const insets = useSafeAreaInsets();
    const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
    const itemCount = items.length;

    async function handleDelete() {
        setDeleting(true);
        setDeleteError(null);
        let moved = 0;
        for (const item of items) {
            await deleteItem(item.id);
            if (useItemStore.getState().error) {
                setDeleteError(`${moved} of ${items.length} items moved to Trash. Please retry the rest.`);
                setDeleting(false);
                return;
            }
            moved++;
        }
        setDeleting(false);
        onDone();
    }

return (
    <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.headerTitle}>
                {itemCount} item{itemCount > 1 ? 's' : ''} selected
            </Text>
            <Pressable onPress={onCancel} hitSlop={8}>
                <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
        </View>

        <Text style={styles.breadcrumb}>{labName}{deckName ? ` › ${deckName}` : ''}</Text>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.summary}>
                {items.map(i => (
                    <Text key={i.id} style={styles.summaryItem}>· {i.name} ×{i.quantity}</Text>
                ))}
            </View>

            <View style={styles.actions}>
                {isWishlistLab ? (
                    <View style={[styles.action, styles.actionDisabled]}>
                        <View style={styles.actionInfo}>
                            <Text style={[styles.actionTitle, styles.muted]}>Acquire</Text>
                            <Text style={styles.actionDesc}>Move to My Stack as purchased</Text>
                        </View>
                        <View style={styles.soonBadge}><Text style={styles.soonText}>Soon</Text></View>
                    </View>
                ) : (
                    <Pressable style={styles.action} onPress={onSell}>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Sell</Text>
                            <Text style={styles.actionDesc}>Set quantity and sale price</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.text2} />
                    </Pressable>
                )}

                {!isWishlistLab && (['move', 'editField', 'reassign'] as const).map(id => (
                    <View key={id} style={[styles.action, styles.actionDisabled]}>
                        <View style={styles.actionInfo}>
                            <Text style={[styles.actionTitle, styles.muted]}>
                                {id === 'move' ? 'Move' : id === 'editField' ? 'Edit a field' : 'Reassign years'}
                            </Text>
                            <Text style={styles.actionDesc}>
                                {id === 'move' ? 'Choose another Lab or Deck' : id === 'editField' ? 'Strike finish, weight, purity...' : 'Redistribute units by year'}
                            </Text>
                        </View>
                        <View style={styles.soonBadge}><Text style={styles.soonText}>Soon</Text></View>
                    </View>
                ))}

                {!showDeleteConfirm && (
                    <Pressable style={styles.action} onPress={() => setShowDeleteConfirm(true)}>
                        <View style={styles.actionInfo}>
                            <Text style={[styles.actionTitle, styles.red]}>
                                {isWishlistLab ? 'Remove from Wishlist' : 'Delete'}
                            </Text>
                            <Text style={styles.actionDesc}>
                                {isWishlistLab ? 'Move to Trash' : 'Move to Trash'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.crimson} />
                    </Pressable>
                )}
            </View>

            {showDeleteConfirm && (
                <View style={styles.deleteConfirm}>
                    <Text style={styles.deleteWarn}>
                        {`⚠ You are about to move ${itemCount} item${itemCount > 1 ? 's' : ''} (${totalUnits} unit${totalUnits > 1 ? 's' : ''}) to Trash.`}
                    </Text>
                    {deleteError !== null && <Text style={styles.errorText}>{deleteError}</Text>}
                    <Pressable
                        style={[styles.deleteBtn, deleting && styles.disabled]}
                        onPress={handleDelete}
                        disabled={deleting}
                    >
                        <Text style={styles.deleteBtnText}>
                            {deleting ? 'Moving...' : 'Move to Trash'}
                        </Text>
                    </Pressable>
                    <Pressable style={styles.cancelConfirmBtn} onPress={() => setShowDeleteConfirm(false)}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                </View>
            )}

            <Pressable style={styles.backSelection} onPress={onBack}>
                <Ionicons name="arrow-back" size={16} color={colors.text2} />
                <Text style={styles.cancelText}> Edit selection</Text>
            </Pressable>
        </ScrollView>
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
    cancelText: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text2 },
    breadcrumb: { paddingHorizontal: 16, paddingBottom: 8, fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    content: { padding: 16, gap: 14 },
    summary: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 4 },
    summaryItem: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    actions: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
    action: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 16, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    actionDisabled: { opacity: 0.4 },
    actionInfo: { flex: 1 },
    actionTitle: { fontFamily: fonts.outfitMedium, fontSize: 15, color: colors.text, marginBottom: 2 },
    actionDesc: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    muted: { color: colors.text2 },
    red: { color: colors.crimson },
    soonBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.surface2, borderRadius: 6 },
    soonText: { fontFamily: fonts.outfit, fontSize: 10, color: colors.text2 },
    deleteConfirm: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 },
    deleteWarn: { fontFamily: fonts.outfit, fontSize: 13, color: colors.crimson, lineHeight: 20 },
    errorText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.crimson },
    deleteBtn: { backgroundColor: colors.crimson, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
    deleteBtnText: { fontFamily: fonts.outfitSemiBold, fontSize: 14, color: colors.text },
    cancelConfirmBtn: { alignItems: 'center', paddingVertical: 8 },
    disabled: { opacity: 0.4 },
    backSelection: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
});
