import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useLabStore } from '../../stores/labStore';
import { useItemStore } from '../../stores/itemStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { colors, fonts } from '../../utils/theme';
import type { OnboardingStackScreenProps } from '../../navigation/types';

type Props = OnboardingStackScreenProps<'OnboardingStep1'>;

export function OnboardingStep1({ navigation }: Props) {
    const labs = useLabStore(s => s.labs);
    const loadLabs = useLabStore(s => s.loadLabs);
    const items = useItemStore(s => s.items);
    const loadItems = useItemStore(s => s.loadItems);
    const updateSettings = useSettingsStore(s => s.updateSettings);
    const isFocused = useIsFocused();
    const hasNavigated = useRef(false);

    const myStack = labs.find(l => l.isSystem && l.type === 'standard');

    useEffect(() => { loadLabs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (myStack) loadItems(myStack.id);
    }, [myStack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (isFocused && items.length > 0 && !hasNavigated.current) {
            hasNavigated.current = true;
            navigation.navigate('OnboardingBackupPrompt');
        }
    }, [items.length, isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleAddItem() {
        if (!myStack) return;
        navigation.navigate('CreateItem', { labId: myStack.id, deckId: null });
    }

    async function handleSkip() {
        await updateSettings({ onboardingCompleted: true });
    }

    if (!myStack) {
        return (
            <View style={[styles.screen, styles.center]}>
                <ActivityIndicator color={colors.violet} />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={styles.content}>
                <Text style={styles.heading}>Add your{'\n'}first item</Text>
                <Text style={styles.sub}>Start tracking your stack — one piece at a time.</Text>
            </View>
            <View style={styles.actions}>
                <Pressable style={styles.primary} onPress={handleAddItem}>
                    <Text style={styles.primaryText}>Add your first item</Text>
                </Pressable>
                <Pressable onPress={handleSkip} hitSlop={8}>
                    <Text style={styles.skip}>Skip for now</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    heading: {
        fontFamily: fonts.manrope,
        fontSize: 36,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 44,
        marginBottom: 16,
    },
    sub: {
        fontFamily: fonts.outfit,
        fontSize: 15,
        color: colors.text2,
        textAlign: 'center',
        lineHeight: 22,
    },
    actions: {
        paddingHorizontal: 24,
        paddingBottom: 56,
        gap: 16,
        alignItems: 'center',
    },
    primary: {
        width: '100%',
        backgroundColor: colors.violet,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    primaryText: {
        fontFamily: fonts.outfitSemiBold,
        fontSize: 16,
        color: colors.text,
    },
    skip: {
        fontFamily: fonts.outfit,
        fontSize: 14,
        color: colors.text2,
    },
});
