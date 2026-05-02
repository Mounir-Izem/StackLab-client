import React from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, metalTokens } from '../../utils/theme';
import type { Item } from '../../types/item.types';

type Props = {
    items: Item[];
    labName: string;
    deckName: string | null;
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    onContinue: () => void;
    onCancel: () => void;
};

export function ModifierScreenB({ items, labName, deckName, selectedIds, onSelectionChange, onContinue, onCancel }: Props) {
    const insets = useSafeAreaInsets();
    const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
    const selCount = selectedIds.length;

    function toggle(id: string) {
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(x => x !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    }

    function renderRow({ item }: { item: Item }) {
        const selected = selectedIds.includes(item.id);
        const token = metalTokens[item.metal];
        const isWishlist = item.status === 'wishlist';
        return (
            <Pressable
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => toggle(item.id)}
            >
                <View style={[styles.thumb, { backgroundColor: isWishlist ? colors.violet + '22' : token.color + '22' }]}>
                    <Ionicons
                        name={isWishlist ? 'bookmark-outline' : 'diamond-outline'}
                        size={14}
                        color={isWishlist ? colors.violet : token.color}
                    />
                </View>
                <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.rowMeta}>
                        {isWishlist ? `Wishlist · ×${item.quantity}` : `${item.metal.toUpperCase()} · ×${item.quantity}`}
                    </Text>
                </View>
                <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selected ? colors.violet : colors.text2}
                />
            </Pressable>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>Select items</Text>
                <Pressable onPress={onCancel} hitSlop={8}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
            </View>

            <Text style={styles.breadcrumb}>{labName}{deckName ? ` › ${deckName}` : ''}</Text>
            <Text style={styles.subtitle}>{items.length} items · {totalUnits} units total</Text>

            <FlatList
                data={items}
                keyExtractor={i => i.id}
                renderItem={renderRow}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No items in this location</Text>
                    </View>
                }
            />

            <View style={styles.footer}>
                <Text style={styles.count}>
                    {selCount === 0
                        ? 'No items selected'
                        : `${selCount} item${selCount > 1 ? 's' : ''} selected`
                    }
                </Text>
                <Pressable
                    style={[styles.continueBtn, selCount === 0 && styles.disabled]}
                    onPress={onContinue}
                    disabled={selCount === 0}
                >
                    <Text style={styles.continueBtnText}>Continue →</Text>
                </Pressable>
            </View>
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
    cancelText: { fontFamily: fonts.outfitMedium, fontSize: 15, color: colors.text2 },
    breadcrumb: { paddingHorizontal: 16, paddingBottom: 2, fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    subtitle: { paddingHorizontal: 16, paddingBottom: 12, fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    list: { paddingHorizontal: 16, paddingBottom: 120, gap: 8 },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, paddingHorizontal: 14,
        backgroundColor: colors.surface, borderRadius: 12,
        borderWidth: 1, borderColor: 'transparent',
    },
    rowSelected: { borderColor: colors.violet },
    thumb: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    rowInfo: { flex: 1 },
    rowName: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text },
    rowMeta: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    empty: { alignItems: 'center', paddingTop: 48 },
    emptyText: { fontFamily: fonts.outfit, fontSize: 14, color: colors.text2 },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32,
        backgroundColor: colors.bg,
        borderTopWidth: 1, borderTopColor: colors.border,
        gap: 10,
    },
    count: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, textAlign: 'center' },
    continueBtn: { backgroundColor: colors.violet, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    continueBtnText: { fontFamily: fonts.outfitSemiBold, fontSize: 15, color: colors.text },
    disabled: { opacity: 0.4 },
});
