import React, { useState } from 'react';
import {
    View, Text, TextInput, Pressable,
    ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { filterSuggestions } from '../../data/suggestions';
import { colors, fonts, metalTokens } from '../../utils/theme';
import type { FlowState } from './CreateItemFlow';
import type { ItemShape, ItemMetal } from '../../types/item.types';

type Props = {
    state: FlowState;
    update: (patch: Partial<FlowState>) => void;
    onNext: () => void;
};

const SHAPES: ItemShape[] = ['coin', 'bar', 'token', 'bust', 'custom'];

export function CreateItemStep1({ state, update, onNext }: Props) {
    const [showError, setShowError] = useState(false);

    const suggestions = filterSuggestions(state.seriesName);

    function handleNext() {
        if (!state.metal || !state.seriesName.trim()) {
            setShowError(true);
            return;
        }
        setShowError(false);
        onNext();
    }

    function selectSuggestion(name: string, shape: ItemShape, metal: ItemMetal, purity: number) {
        update({ seriesName: name, shape, metal, purity });
        setShowError(false);
    }

    function handleSeriesChange(text: string) {
        update({ seriesName: text });
        if (showError && text.trim()) setShowError(false);
    }

    function handleMetalSelect(metal: ItemMetal) {
        update({ metal });
        if (showError && state.seriesName.trim()) setShowError(false);
    }

    const errorParts = [];
    if (!state.metal) errorParts.push('metal');
    if (!state.seriesName.trim()) errorParts.push('series');
    const errorMsg = errorParts.length
        ? `Please select: ${errorParts.join(', ')} before continuing.`
        : null;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>The Object</Text>

            {/* Metal */}
            <Text style={styles.label}>Metal</Text>
            <View style={styles.metalRow}>
                {(['gold', 'silver'] as ItemMetal[]).map(m => {
                    const token = metalTokens[m];
                    const active = state.metal === m;
                    return (
                        <Pressable
                            key={m}
                            style={[styles.metalCard, active && { borderColor: colors.violet, borderWidth: 1.5 }, !active && { opacity: 0.5 }]}
                            onPress={() => handleMetalSelect(m)}
                        >
                            <Text style={[styles.metalLabel, { color: token.color }]}>
                                {m.toUpperCase()}
                            </Text>
                            <Text style={styles.metalSub}>{m === 'gold' ? 'XAU' : 'XAG'}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Series */}
            <Text style={styles.label}>Series</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Maple Leaf, Krugerrand..."
                placeholderTextColor={colors.text2}
                value={state.seriesName}
                onChangeText={handleSeriesChange}
                autoCorrect={false}
                maxLength={80}
            />
            {suggestions.length > 0 && (
                <View style={styles.suggestions}>
                    {suggestions.map(s => (
                        <Pressable
                            key={s.familyKey}
                            style={styles.suggestionChip}
                            onPress={() => selectSuggestion(s.name, s.defaultShape, s.metal, s.defaultPurity)}
                        >
                            <Text style={styles.suggestionText}>{s.name}</Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {/* Shape */}
            <Text style={styles.label}>Type</Text>
            <View style={styles.shapeRow}>
                {SHAPES.map(s => (
                    <Pressable
                        key={s}
                        style={[styles.shapeChip, state.shape === s && styles.shapeChipActive]}
                        onPress={() => update({ shape: s })}
                    >
                        <Text style={[styles.shapeText, state.shape === s && styles.shapeTextActive]}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                    </Pressable>
                ))}
            </View>
            {state.shape === 'custom' && (
                <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="Skull, irregular ingot, custom shape..."
                    placeholderTextColor={colors.text2}
                    value={state.shapeDescription}
                    onChangeText={v => update({ shapeDescription: v })}
                    maxLength={60}
                />
            )}

            {/* Mint */}
            {!state.mintVisible ? (
                <Pressable onPress={() => update({ mintVisible: true })} style={styles.mintToggle}>
                    <Text style={styles.mintToggleText}>+ Add mint (optional)</Text>
                </Pressable>
            ) : (
                <>
                    <Text style={styles.label}>Mint</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Royal Canadian Mint, Perth Mint..."
                        placeholderTextColor={colors.text2}
                        value={state.mintName}
                        onChangeText={v => update({ mintName: v })}
                        maxLength={60}
                    />
                </>
            )}

            {/* Error */}
            {showError && errorMsg && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}

            {/* Next */}
            <Pressable style={styles.btnNext} onPress={handleNext}>
                <Text style={styles.btnNextText}>Next →</Text>
            </Pressable>
        </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40, gap: 8 },
    title: { fontFamily: fonts.manrope, fontSize: 22, color: colors.text, marginBottom: 16 },
    label: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, marginTop: 12, marginBottom: 6 },
    metalRow: { flexDirection: 'row', gap: 12 },
    metalCard: {
        flex: 1, paddingVertical: 20, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', gap: 4,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    metalLabel: { fontFamily: fonts.manrope, fontSize: 18 },
    metalSub: { fontFamily: fonts.outfit, fontSize: 11, color: colors.text2 },
    input: {
        backgroundColor: colors.surface, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 13,
        color: colors.text, fontFamily: fonts.outfit, fontSize: 15,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    suggestionChip: {
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, backgroundColor: colors.surface2,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    },
    suggestionText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text },
    shapeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    shapeChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    shapeChipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    shapeText: { fontFamily: fonts.outfitMedium, fontSize: 13, color: colors.text2 },
    shapeTextActive: { color: colors.text },
    mintToggle: { marginTop: 8 },
    mintToggleText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.violet },
    errorBanner: {
        backgroundColor: 'rgba(180,30,30,0.15)', borderRadius: 10,
        padding: 12, marginTop: 8, borderWidth: 1, borderColor: 'rgba(180,30,30,0.30)',
    },
    errorText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.crimson },
    btnNext: {
        marginTop: 24, backgroundColor: colors.violet,
        borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    },
    btnNextText: { fontFamily: fonts.outfitSemiBold, fontSize: 16, color: colors.text },
});
