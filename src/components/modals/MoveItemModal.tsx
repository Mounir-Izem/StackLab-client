import React, { useState, useEffect } from 'react';
import {
    Modal, View, Text, Pressable, TextInput,
    StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLabStore } from '../../stores/labStore';
import { useDeckStore } from '../../stores/deckStore';
import { useItemStore } from '../../stores/itemStore';
import { colors, fonts } from '../../utils/theme';
import type { Item } from '../../types/item.types';

type Props = {
    item: Item;
    visible: boolean;
    onClose: () => void;
    onMoveComplete?: () => void;
};

export function MoveItemModal({ item, visible, onClose, onMoveComplete }: Props) {
    const { t } = useTranslation();
    const { labs } = useLabStore();
    const { decks } = useDeckStore();
    const { moveItem } = useItemStore();

    const [moveQty, setMoveQty] = useState(1);
    const [moveDestLabId, setMoveDestLabId] = useState<string | null>(null);
    const [moveDestDeckId, setMoveDestDeckId] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setMoveQty(1);
            setMoveDestLabId(null);
            setMoveDestDeckId(null);
        }
    }, [visible]);

    const rootDecks = decks.filter(d => d.parentId === null);
    const otherLabs = labs.filter(l => l.type === 'standard' && l.id !== item.labId);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
                    <Text style={styles.title}>{t('move.title')}</Text>

                    <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
                        {item.quantity > 1 && (
                            <>
                                <Text style={styles.label}>{t('item.moveQtyRange', { max: item.quantity })}</Text>
                                <View style={styles.qtyRow}>
                                    <Pressable
                                        style={styles.qtyBtn}
                                        onPress={() => setMoveQty(q => Math.max(1, q - 1))}
                                        disabled={moveQty <= 1}
                                    >
                                        <Ionicons name="remove" size={18} color={moveQty > 1 ? colors.text : colors.text2} />
                                    </Pressable>
                                    <TextInput
                                        style={styles.qtyInput}
                                        value={String(moveQty)}
                                        keyboardType="number-pad"
                                        onChangeText={val =>
                                            setMoveQty(Math.min(item.quantity, Math.max(1, parseInt(val, 10) || 1)))
                                        }
                                        selectTextOnFocus
                                    />
                                    <Pressable
                                        style={styles.qtyBtn}
                                        onPress={() => setMoveQty(q => Math.min(item.quantity, q + 1))}
                                        disabled={moveQty >= item.quantity}
                                    >
                                        <Ionicons name="add" size={18} color={moveQty < item.quantity ? colors.text : colors.text2} />
                                    </Pressable>
                                    <Text style={styles.qtyMax}>/ {item.quantity}</Text>
                                </View>
                            </>
                        )}

                        <Text style={styles.label}>{t('item.moveWithinLab')}</Text>
                        <View style={styles.chips}>
                            {item.deckId !== null && (
                                <Pressable
                                    style={[
                                        styles.chip,
                                        moveDestLabId === item.labId && moveDestDeckId === null && styles.chipActive,
                                    ]}
                                    onPress={() => { setMoveDestLabId(item.labId); setMoveDestDeckId(null); }}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        moveDestLabId === item.labId && moveDestDeckId === null && styles.chipTextActive,
                                    ]}>
                                        {t('item.moveNoDeck')}
                                    </Text>
                                </Pressable>
                            )}
                            {rootDecks.filter(d => d.id !== item.deckId).map(d => (
                                <Pressable
                                    key={d.id}
                                    style={[
                                        styles.chip,
                                        moveDestLabId === item.labId && moveDestDeckId === d.id && styles.chipActive,
                                    ]}
                                    onPress={() => { setMoveDestLabId(item.labId); setMoveDestDeckId(d.id); }}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        moveDestLabId === item.labId && moveDestDeckId === d.id && styles.chipTextActive,
                                    ]}>
                                        {d.name}
                                    </Text>
                                </Pressable>
                            ))}
                            {item.deckId === null && rootDecks.length === 0 && (
                                <Text style={styles.emptyText}>{t('item.moveNoDecks')}</Text>
                            )}
                        </View>

                        <Text style={styles.label}>{t('item.moveAnotherLab')}</Text>
                        <View style={styles.chips}>
                            {otherLabs.length > 0
                                ? otherLabs.map(l => (
                                    <Pressable
                                        key={l.id}
                                        style={[styles.chip, moveDestLabId === l.id && styles.chipActive]}
                                        onPress={() => { setMoveDestLabId(l.id); setMoveDestDeckId(null); }}
                                    >
                                        <Text style={[styles.chipText, moveDestLabId === l.id && styles.chipTextActive]}>
                                            {l.name}
                                        </Text>
                                    </Pressable>
                                ))
                                : (
                                    <View style={styles.premiumNote}>
                                        <Ionicons name="lock-closed-outline" size={13} color={colors.text2} />
                                        <Text style={styles.premiumNoteText}>{t('item.movePremiumNote')}</Text>
                                    </View>
                                )
                            }
                        </View>
                    </ScrollView>

                    <Pressable
                        style={[styles.confirmBtn, !moveDestLabId && styles.disabled]}
                        disabled={!moveDestLabId}
                        onPress={async () => {
                            if (!moveDestLabId) return;
                            onClose();
                            await moveItem(item.id, moveQty, moveDestLabId, moveDestDeckId);
                            onMoveComplete?.();
                        }}
                    >
                        <Text style={styles.confirmText}>{t('move.confirm')}</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end', padding: 16, paddingBottom: 40,
    },
    sheet: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
    title: {
        fontFamily: fonts.manrope, fontSize: 15, color: colors.text2,
        textAlign: 'center', paddingTop: 14, paddingBottom: 14, paddingHorizontal: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    scroll: { maxHeight: 360 },
    body: { padding: 16, gap: 12 },
    label: {
        fontSize: 9, letterSpacing: 1.5, color: colors.text2,
        fontFamily: fonts.outfitSemiBold, textTransform: 'uppercase',
    },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: {
        width: 36, height: 36, backgroundColor: colors.surface2,
        borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    },
    qtyInput: {
        width: 56, height: 36, backgroundColor: colors.surface2,
        borderRadius: 8, textAlign: 'center', color: colors.text,
        fontFamily: fonts.dmMono, fontSize: 16,
    },
    qtyMax: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
        backgroundColor: colors.surface2, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    chipText: { fontFamily: fonts.outfitMedium, fontSize: 13, color: colors.text2 },
    chipTextActive: { color: colors.text },
    emptyText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, fontStyle: 'italic' },
    premiumNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
    premiumNoteText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2, flex: 1 },
    confirmBtn: {
        margin: 16, marginTop: 4, backgroundColor: colors.green,
        borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    },
    confirmText: { fontFamily: fonts.outfitSemiBold, fontSize: 15, color: '#0A1A0F' },
    disabled: { opacity: 0.4 },
});
