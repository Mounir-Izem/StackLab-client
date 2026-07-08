import React, { useState } from 'react';
import {
    Modal, View, Text, TextInput, Pressable,
    StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { DeckCard } from '../cards/DeckCard';
import { colors, fonts, fontSize } from '../../utils/theme';
import type { Deck } from '../../types/deck.types';

type Props = {
    labId: string;
    visible: boolean;
    onCancel: () => void;
    onCreate: (name: string) => void;
};

const DECK_DEFAULTS: Omit<Deck, 'name' | 'labId'> = {
    id: '', parentId: null, coverPhotoUrl: null,
    position: 0, createdAt: '', updatedAt: '',
};

export function NewDeckModal({ labId, visible, onCancel, onCreate }: Props) {
    const { t } = useTranslation();
    const [name, setName] = useState('');

    const preview: Deck = { ...DECK_DEFAULTS, labId, name: name.trim() || t('deck.newDeckName') };
    const canCreate = name.trim().length > 0;

    function handleCreate() {
        if (!canCreate) return;
        onCreate(name.trim());
        setName('');
    }

    function handleCancel() {
        setName('');
        onCancel();
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
            <View style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.sheet}>
                        <Text style={styles.title}>{t('deck.newDeck')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('deck.newDeckName')}
                            placeholderTextColor={colors.text2}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                            maxLength={40}
                            returnKeyType="done"
                            onSubmitEditing={handleCreate}
                        />
                        <View style={styles.preview}>
                            {/* Deck Consistency Patch — labType="standard" : ce modal n'est
                                accessible que depuis le bouton "Nouveau deck" de LabDetail, absent
                                en lab Wishlist (aucun autre call site). */}
                            <DeckCard deck={preview} labType="standard" totalValue={null} subDeckCount={0} />
                        </View>
                        <View style={styles.actions}>
                            <Pressable style={styles.btnCancel} onPress={handleCancel}>
                                <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.btnCreate, !canCreate && styles.btnDisabled]}
                                onPress={handleCreate}
                                disabled={!canCreate}
                            >
                                <Text style={styles.btnCreateText}>{t('common.create')}</Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 36,
        gap: 14,
    },
    title: {
        fontFamily: fonts.manrope,
        fontSize: fontSize.labName,
        color: colors.text,
        textAlign: 'center',
    },
    input: {
        backgroundColor: colors.surface2,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: colors.text,
        fontFamily: fonts.outfit,
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    preview: {
        marginHorizontal: 24,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    btnCancel: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.surface2,
        alignItems: 'center',
    },
    btnCancelText: {
        color: colors.text2,
        fontFamily: fonts.outfitMedium,
        fontSize: 14,
    },
    btnCreate: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.violet,
        alignItems: 'center',
    },
    btnCreateText: {
        color: colors.text,
        fontFamily: fonts.outfitSemiBold,
        fontSize: 14,
    },
    btnDisabled: {
        opacity: 0.4,
    },
});
