import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useItemStore } from '../../stores/itemStore';
import { useLabStore } from '../../stores/labStore';
import { useDeckStore } from '../../stores/deckStore';
import { colors, fonts } from '../../utils/theme';
import { ModifierScreenB } from './ModifierScreenB';
import { ModifierScreenC } from './ModifierScreenC';
import { ModifierScreenD } from './ModifierScreenD';
import { ModifierDeckScreen } from './ModifierDeckScreen';
import type { LabsStackScreenProps } from '../../navigation/types';

type Screen = 'A' | 'B' | 'C' | 'D' | 'Decks';
type Props = LabsStackScreenProps<'Modifier'>;

export function ModifierFlow({ route, navigation }: Props) {
    const { labId, deckId } = route.params;
    const [screen, setScreen] = useState<Screen>('A');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [showRename, setShowRename] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [renameError, setRenameError] = useState<string | null>(null);

    const [showDeleteDeck, setShowDeleteDeck] = useState(false);
    const [deletingDeck, setDeletingDeck] = useState(false);
    const [deleteDeckError, setDeleteDeckError] = useState<string | null>(null);

    const { items } = useItemStore();
    const { labs, renameLab } = useLabStore();
    const { decks, renameDeck, deleteDeck, loadDecks } = useDeckStore();

    const lab = labs.find(l => l.id === labId);
    const deck = deckId ? decks.find(d => d.id === deckId) : null;
    const isSystemLab = lab?.type !== 'standard';
    const isWishlistLab = lab?.type === 'wishlist';

    const rootDecks = decks.filter(d => d.parentId === null && d.labId === labId);

    const scopeItems = items.filter(i => {
        if (isWishlistLab) return i.labId === labId;
        if (i.status !== 'active') return false;
        return deckId !== null
            ? i.deckId === deckId
            : (i.deckId === null && i.labId === labId);
    });

    const insets = useSafeAreaInsets();
    const selectedItems = scopeItems.filter(i => selectedIds.includes(i.id));

    function handleClose() { navigation.goBack(); }

    function openRename() {
        setRenameValue(deckId ? (deck?.name ?? '') : (lab?.name ?? ''));
        setRenameError(null);
        setShowRename(true);
    }

    async function handleRename() {
        const t = renameValue.trim();
        if (!t) return;
        setRenaming(true);
        setRenameError(null);
        if (deckId) {
            await renameDeck(deckId, t);
            if (useDeckStore.getState().error) {
                setRenameError('Rename failed. Please try again.');
                setRenaming(false);
                return;
            }
        } else {
            await renameLab(labId, t);
            if (useLabStore.getState().error) {
                setRenameError('Rename failed. Please try again.');
                setRenaming(false);
                return;
            }
        }
        setRenaming(false);
        setShowRename(false);
        handleClose();
    }

    async function handleDeleteDeck() {
        if (!deckId) return;
        setDeletingDeck(true);
        setDeleteDeckError(null);
        await deleteDeck(deckId);
        if (useDeckStore.getState().error) {
            setDeleteDeckError('Delete failed. Please try again.');
            setDeletingDeck(false);
            return;
        }
        await loadDecks(labId);
        setDeletingDeck(false);
        handleClose();
    }

    if (screen === 'B') return (
        <ModifierScreenB
            items={scopeItems}
            labName={lab?.name ?? ''}
            deckName={deck?.name ?? null}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onContinue={() => setScreen('C')}
            onCancel={handleClose}
        />
    );

    if (screen === 'C') return (
        <ModifierScreenC
            items={selectedItems}
            labName={lab?.name ?? ''}
            deckName={deck?.name ?? null}
            isWishlistLab={isWishlistLab}
            onSell={() => setScreen('D')}
            onBack={() => setScreen('B')}
            onCancel={handleClose}
            onDone={handleClose}
        />
    );

    if (screen === 'D') return (
        <ModifierScreenD
            items={selectedItems}
            labName={lab?.name ?? ''}
            deckName={deck?.name ?? null}
            onBack={() => setScreen('C')}
            onDone={handleClose}
        />
    );

    if (screen === 'Decks') return (
        <ModifierDeckScreen
            decks={rootDecks}
            labName={lab?.name ?? ''}
            labId={labId}
            onBack={() => setScreen('A')}
            onDone={handleClose}
        />
    );

    return (
        <View style={styles.screen}>
            <Pressable style={styles.backdrop} onPress={handleClose} />
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 24, 44) }]}>
                <Text style={styles.title}>What would you like to edit?</Text>
                <Text style={styles.context}>{deck?.name ?? lab?.name ?? ''}</Text>

                <View style={styles.choices}>
                    <Pressable style={styles.choice} onPress={() => setScreen('B')}>
                        <Ionicons name="layers-outline" size={26} color={colors.green} />
                        <Text style={styles.choiceTitle}>Items</Text>
                        <Text style={styles.choiceDesc}>Select items in this location</Text>
                    </Pressable>
                    {deckId === null && rootDecks.length > 0 && (
                        <Pressable style={styles.choice} onPress={() => setScreen('Decks')}>
                            <Ionicons name="albums-outline" size={26} color={colors.violet} />
                            <Text style={styles.choiceTitle}>Decks</Text>
                            <Text style={styles.choiceDesc}>Delete a deck in this lab</Text>
                        </Pressable>
                    )}
                    {(deckId !== null || !isSystemLab) && (
                        <Pressable style={styles.choice} onPress={openRename}>
                            <Ionicons name="folder-outline" size={26} color={colors.violet} />
                            <Text style={styles.choiceTitle}>This {deckId ? 'Deck' : 'Lab'}</Text>
                            <Text style={styles.choiceDesc}>{deckId ? 'Rename or delete' : 'Rename this lab'}</Text>
                        </Pressable>
                    )}
                </View>

                <Pressable style={styles.cancelBtn} onPress={handleClose}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
            </View>

            <Modal
                visible={showRename}
                transparent
                animationType="fade"
                onRequestClose={() => !renaming && setShowRename(false)}
            >
                <Pressable style={styles.overlay} onPress={() => !renaming && setShowRename(false)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Rename {deckId ? 'Deck' : 'Lab'}</Text>
                        <TextInput
                            style={styles.input}
                            value={renameValue}
                            onChangeText={setRenameValue}
                            autoFocus
                            selectTextOnFocus
                            maxLength={40}
                        />
                        {renameError !== null && (
                            <Text style={styles.errorText}>{renameError}</Text>
                        )}
                        {deckId !== null && (
                            <Pressable
                                style={styles.deleteDeckBtn}
                                onPress={() => { setShowRename(false); setShowDeleteDeck(true); }}
                            >
                                <Text style={styles.deleteDeckText}>Delete this Deck</Text>
                            </Pressable>
                        )}
                        <View style={styles.modalActions}>
                            <Pressable
                                style={styles.btnCancel}
                                onPress={() => setShowRename(false)}
                                disabled={renaming}
                            >
                                <Text style={styles.btnCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.btnSave, (!renameValue.trim() || renaming) && styles.disabled]}
                                onPress={handleRename}
                                disabled={!renameValue.trim() || renaming}
                            >
                                <Text style={styles.btnSaveText}>{renaming ? 'Saving...' : 'Save'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            <Modal
                visible={showDeleteDeck}
                transparent
                animationType="fade"
                onRequestClose={() => !deletingDeck && setShowDeleteDeck(false)}
            >
                <Pressable style={styles.overlay} onPress={() => !deletingDeck && setShowDeleteDeck(false)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Delete "{deck?.name}"?</Text>
                        <Text style={styles.modalBody}>
                            {`Items and sub-decks will be moved to ${lab?.name ?? 'the lab'}.`}
                        </Text>
                        {deleteDeckError !== null && (
                            <Text style={styles.errorText}>{deleteDeckError}</Text>
                        )}
                        <View style={styles.modalActions}>
                            <Pressable
                                style={styles.btnCancel}
                                onPress={() => setShowDeleteDeck(false)}
                                disabled={deletingDeck}
                            >
                                <Text style={styles.btnCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.btnDelete, deletingDeck && styles.disabled]}
                                onPress={handleDeleteDeck}
                                disabled={deletingDeck}
                            >
                                <Text style={styles.btnDeleteText}>
                                    {deletingDeck ? 'Deleting...' : 'Delete'}
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
    screen: { flex: 1, backgroundColor: 'rgba(6,4,14,0.94)', justifyContent: 'flex-end' },
    backdrop: { flex: 1 },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 24, gap: 16,
    },
    title: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text, textAlign: 'center' },
    context: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, textAlign: 'center', marginTop: -8 },
    choices: { flexDirection: 'row', gap: 12 },
    choice: {
        flex: 1, backgroundColor: colors.surface2, borderRadius: 14, padding: 16,
        alignItems: 'center', gap: 8,
    },
    choiceTitle: { fontFamily: fonts.manrope, fontSize: 15, color: colors.text },
    choiceDesc: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2, textAlign: 'center', lineHeight: 17 },
    cancelBtn: { alignItems: 'center', paddingVertical: 10 },
    cancelText: { fontFamily: fonts.outfitMedium, fontSize: 15, color: colors.text2 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalSheet: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 14 },
    modalTitle: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text, textAlign: 'center' },
    modalBody: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, textAlign: 'center', lineHeight: 20 },
    input: {
        backgroundColor: colors.surface2, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        color: colors.text, fontFamily: fonts.outfit, fontSize: 15,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    errorText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.crimson, textAlign: 'center' },
    deleteDeckBtn: { alignItems: 'center', paddingVertical: 4 },
    deleteDeckText: { fontFamily: fonts.outfitMedium, fontSize: 13, color: colors.crimson },
    modalActions: { flexDirection: 'row', gap: 10 },
    btnCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center' },
    btnCancelText: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text2 },
    btnSave: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.violet, alignItems: 'center' },
    btnSaveText: { fontFamily: fonts.outfitSemiBold, fontSize: 14, color: colors.text },
    btnDelete: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.crimson, alignItems: 'center' },
    btnDeleteText: { fontFamily: fonts.outfitSemiBold, fontSize: 14, color: colors.text },
    disabled: { opacity: 0.4 },
});
