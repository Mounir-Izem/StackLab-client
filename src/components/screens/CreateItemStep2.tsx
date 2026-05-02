import React from 'react';
import {
    View, Text, TextInput, Pressable,
    ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateUUID } from '../../utils/uuid';
import { colors, fonts } from '../../utils/theme';
import type { FlowState, MixRow } from './CreateItemFlow';
import type { StrikeFinish } from '../../types/item.types';

type Props = {
    state: FlowState;
    update: (patch: Partial<FlowState>) => void;
    onNext: () => void;
};

const FINISHES: StrikeFinish[] = ['BU', 'proof', 'reverse_proof', 'antique', 'matte', 'specimen', 'burnished', 'proof_like'];
const FINISH_LABELS: Record<StrikeFinish, string> = {
    BU: 'BU', proof: 'Proof', reverse_proof: 'Rev. Proof', antique: 'Antique',
    matte: 'Matte', specimen: 'Specimen', burnished: 'Burnished', proof_like: 'PL', unknown: '—',
};

export function CreateItemStep2({ state, update, onNext }: Props) {
    const assigned = state.rows.reduce((s, r) => s + r.qty, 0);
    const remaining = state.quantity - assigned;
    const mixValid = state.mode === 'mix' ? assigned === state.quantity && state.rows.length > 0 : true;
    const canNext = mixValid;

    function setQty(raw: string) {
        const n = parseInt(raw, 10);
        update({ quantity: isNaN(n) || n < 1 ? 1 : Math.floor(n) });
    }

    function addRow() {
        update({ rows: [...state.rows, { id: generateUUID(), year: '', strikeFinish: null, qty: Math.max(1, remaining) }] });
    }

    function removeRow(id: string) {
        update({ rows: state.rows.filter(r => r.id !== id) });
    }

    function patchRow(id: string, patch: Partial<MixRow>) {
        update({ rows: state.rows.map(r => r.id === id ? { ...r, ...patch } : r) });
    }

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>The Lot</Text>

            <View style={styles.tipBanner}>
                <Text style={styles.tipText}>
                    💡 You can add multiple {state.seriesName || 'items'} at once.{'\n'}
                    Use the table below to distribute by year and strike finish.
                </Text>
            </View>

            {/* Quantity */}
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.qtyRow}>
                <Pressable
                    style={styles.qtyBtn}
                    onPress={() => update({ quantity: Math.max(1, state.quantity - 1) })}
                >
                    <Text style={styles.qtyBtnText}>−</Text>
                </Pressable>
                <TextInput
                    style={styles.qtyInput}
                    value={String(state.quantity)}
                    onChangeText={setQty}
                    keyboardType="number-pad"
                    selectTextOnFocus
                />
                <Pressable
                    style={styles.qtyBtn}
                    onPress={() => update({ quantity: state.quantity + 1 })}
                >
                    <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>
            </View>

            {/* Mode toggle */}
            <Text style={styles.label}>Distribution</Text>
            <View style={styles.modeRow}>
                {(['simple', 'mix'] as const).map(m => (
                    <Pressable
                        key={m}
                        style={[styles.modeChip, state.mode === m && styles.modeChipActive]}
                        onPress={() => update({ mode: m })}
                    >
                        <Text style={[styles.modeText, state.mode === m && styles.modeTextActive]}>
                            {m === 'simple' ? 'All identical' : 'Mix years / finish'}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Simple mode */}
            {state.mode === 'simple' && (
                <View style={styles.simpleRow}>
                    <View style={styles.simpleField}>
                        <Text style={styles.label}>Year (optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2024"
                            placeholderTextColor={colors.text2}
                            value={state.year}
                            onChangeText={v => update({ year: v.replace(/\D/g, '').slice(0, 4) })}
                            keyboardType="number-pad"
                            maxLength={4}
                        />
                    </View>
                    <View style={styles.simpleField}>
                        <Text style={styles.label}>Finish (optional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.finishRow}>
                                {FINISHES.map(f => (
                                    <Pressable
                                        key={f}
                                        style={[styles.finishChip, state.strikeFinish === f && styles.finishChipActive]}
                                        onPress={() => update({ strikeFinish: state.strikeFinish === f ? null : f })}
                                    >
                                        <Text style={[styles.finishText, state.strikeFinish === f && styles.finishTextActive]}>
                                            {FINISH_LABELS[f]}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            )}

            {/* Mix mode */}
            {state.mode === 'mix' && (
                <View style={styles.matrix}>
                    <View style={styles.matrixHeader}>
                        <Text style={[styles.matrixCol, { flex: 2 }]}>Year</Text>
                        <Text style={[styles.matrixCol, { flex: 2 }]}>Finish</Text>
                        <Text style={[styles.matrixCol, { flex: 1 }]}>Qty</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    {state.rows.map(row => (
                        <View key={row.id} style={styles.matrixRow}>
                            <TextInput
                                style={[styles.matrixInput, { flex: 2 }]}
                                placeholder="Year"
                                placeholderTextColor={colors.text2}
                                value={row.year}
                                onChangeText={v => patchRow(row.id, { year: v.replace(/\D/g, '').slice(0, 4) })}
                                keyboardType="number-pad"
                                maxLength={4}
                            />
                            <Pressable
                                style={[styles.matrixInput, { flex: 2, justifyContent: 'center' }]}
                                onPress={() => {
                                    const finishes = [...FINISHES];
                                    const idx = row.strikeFinish ? finishes.indexOf(row.strikeFinish) : -1;
                                    const next = finishes[(idx + 1) % finishes.length] ?? null;
                                    patchRow(row.id, { strikeFinish: next });
                                }}
                            >
                                <Text style={styles.matrixInputText}>
                                    {row.strikeFinish ? FINISH_LABELS[row.strikeFinish] : '—'}
                                </Text>
                            </Pressable>
                            <TextInput
                                style={[styles.matrixInput, { flex: 1 }]}
                                value={String(row.qty)}
                                onChangeText={v => {
                                    const n = parseInt(v, 10);
                                    patchRow(row.id, { qty: isNaN(n) || n < 1 ? 1 : n });
                                }}
                                keyboardType="number-pad"
                                selectTextOnFocus
                            />
                            <Pressable onPress={() => removeRow(row.id)} hitSlop={8}>
                                <Ionicons name="close-circle" size={20} color={colors.text2} />
                            </Pressable>
                        </View>
                    ))}
                    <Pressable style={styles.addRow} onPress={addRow}>
                        <Text style={styles.addRowText}>+ Add combination</Text>
                    </Pressable>

                    <View style={[styles.counter, remaining === 0 && styles.counterOk, remaining !== 0 && styles.counterWarn]}>
                        <Text style={styles.counterText}>
                            {remaining === 0
                                ? `✓ All ${state.quantity} items assigned`
                                : remaining > 0
                                    ? `⚠ ${remaining} remaining`
                                    : `⚠ Over by ${Math.abs(remaining)}`
                            }
                        </Text>
                    </View>
                </View>
            )}

            <Pressable
                style={[styles.btnNext, !canNext && styles.btnDisabled]}
                onPress={canNext ? onNext : undefined}
            >
                <Text style={styles.btnNextText}>Next →</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40, gap: 8 },
    title: { fontFamily: fonts.manrope, fontSize: 22, color: colors.text, marginBottom: 8 },
    tipBanner: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 8 },
    tipText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2, lineHeight: 18 },
    label: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, marginTop: 12, marginBottom: 6 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
    qtyBtnText: { fontSize: 22, color: colors.text, fontFamily: fonts.outfitMedium },
    qtyInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, textAlign: 'center', color: colors.text, fontFamily: fonts.dmMono, fontSize: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    modeRow: { flexDirection: 'row', gap: 10 },
    modeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    modeChipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    modeText: { fontFamily: fonts.outfitMedium, fontSize: 13, color: colors.text2 },
    modeTextActive: { color: colors.text },
    simpleRow: { gap: 12 },
    simpleField: { gap: 4 },
    input: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, fontFamily: fonts.outfit, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    finishRow: { flexDirection: 'row', gap: 8 },
    finishChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    finishChipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    finishText: { fontFamily: fonts.outfitMedium, fontSize: 12, color: colors.text2 },
    finishTextActive: { color: colors.text },
    matrix: { gap: 8 },
    matrixHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
    matrixCol: { fontSize: 9, letterSpacing: 1.5, color: colors.text2, fontFamily: fonts.outfitSemiBold },
    matrixRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    matrixInput: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, color: colors.text, fontFamily: fonts.outfit, fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    matrixInputText: { color: colors.text, fontFamily: fonts.outfit, fontSize: 13 },
    addRow: { paddingVertical: 10, alignItems: 'center' },
    addRowText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.violet },
    counter: { borderRadius: 10, padding: 10, alignItems: 'center' },
    counterOk: { backgroundColor: 'rgba(0,210,106,0.12)' },
    counterWarn: { backgroundColor: 'rgba(255,153,68,0.12)' },
    counterText: { fontFamily: fonts.outfitMedium, fontSize: 13, color: colors.text },
    btnNext: { marginTop: 24, backgroundColor: colors.violet, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    btnNextText: { fontFamily: fonts.outfitSemiBold, fontSize: 16, color: colors.text },
    btnDisabled: { opacity: 0.4 },
});
