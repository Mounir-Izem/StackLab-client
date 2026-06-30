import React from 'react';
import {
    View, Text, TextInput, Pressable,
    ScrollView, StyleSheet,
} from 'react-native';
import { calcFineWeightOz, toTroyOz } from '../../utils/calculations';
import { formatWeight } from '../../utils/formatters';
import { colors, fonts } from '../../utils/theme';
import type { FlowState } from './CreateItemFlow';
import type { ItemWeightUnit } from '../../types/item.types';

type Props = {
    state: FlowState;
    update: (patch: Partial<FlowState>) => void;
    onNext: () => void;
};

const PURITIES: { label: string; value: number }[] = [
    { label: '.99999 — Five nines', value: 0.99999 },
    { label: '.9999 — 24k fine',    value: 0.9999  },
    { label: '.9995 — LBMA std',    value: 0.9995  },
    { label: '.999 — 24k',          value: 0.999   },
    { label: '.990 — 23.76k',       value: 0.990   },
    { label: '.986 — 23.66k',       value: 0.986   },
    { label: '.980 — 23.52k',       value: 0.980   },
    { label: '.970',                value: 0.970   },
    { label: '.965 — 23.16k',       value: 0.965   },
    { label: '.9583 — 23k',         value: 0.9583  },
    { label: '.958 — Britannia',    value: 0.958   },
    { label: '.950',                value: 0.950   },
    { label: '.935',                value: 0.935   },
    { label: '.930',                value: 0.930   },
    { label: '.925 — Sterling',     value: 0.925   },
    { label: '.9167 — 22k',         value: 0.9167  },
    { label: '.916 — Sovereign',    value: 0.916   },
    { label: '.900 — 90%',          value: 0.900   },
    { label: '.875 — 21k',          value: 0.875   },
    { label: '.835',                value: 0.835   },
    { label: '.833 — 20k',          value: 0.833   },
    { label: '.800 — 80%',          value: 0.800   },
    { label: '.750 — 18k',          value: 0.750   },
    { label: '.720 — 72%',          value: 0.720   },
    { label: '.700',                value: 0.700   },
    { label: '.680',                value: 0.680   },
    { label: '.640',                value: 0.640   },
    { label: '.625 — 15k',          value: 0.625   },
    { label: '.585 — 14k',          value: 0.585   },
    { label: '.500 — 50%',          value: 0.500   },
    { label: '.417 — 10k',          value: 0.417   },
    { label: '.400',                value: 0.400   },
    { label: '.375 — 9k',           value: 0.375   },
    { label: '.350',                value: 0.350   },
    { label: '.333 — 8k',           value: 0.333   },
    { label: '.250',                value: 0.250   },
    { label: '.100',                value: 0.100   },
];

const UNITS: ItemWeightUnit[] = ['oz', 'g', 'kg'];

export function CreateItemStep3({ state, update, onNext }: Props) {
    const weightNum = parseFloat(state.weightInput) || 0;
    const weightOz = toTroyOz(weightNum, state.weightUnit);
    const fineOz = calcFineWeightOz(weightOz, state.purity);
    const totalWeightOz = weightOz * state.quantity;
    const totalFineOz = fineOz * state.quantity;
    const canNext = weightNum > 0;

    function handleWeightChange(text: string) {
        const cleaned = text.replace(/[^0-9.]/g, '');
        update({ weightInput: cleaned });
    }

    const recapQty = state.mode === 'simple'
        ? state.quantity
        : state.rows.reduce((s, r) => s + r.qty, 0);

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>Physical</Text>

            {/* Weight */}
            <Text style={styles.label}>Weight (per item)</Text>
            <View style={styles.weightRow}>
                <TextInput
                    style={styles.weightInput}
                    value={state.weightInput}
                    onChangeText={handleWeightChange}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    placeholder="1.000"
                    placeholderTextColor={colors.text2}
                />
                <View style={styles.unitRow}>
                    {UNITS.map(u => (
                        <Pressable
                            key={u}
                            style={[styles.unitChip, state.weightUnit === u && styles.unitChipActive]}
                            onPress={() => update({ weightUnit: u })}
                        >
                            <Text style={[styles.unitText, state.weightUnit === u && styles.unitTextActive]}>
                                {u}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Fine weight */}
            <View style={styles.fineRow}>
                <Text style={styles.fineLabel}>Fine weight (auto)</Text>
                <Text style={styles.fineValue}>
                    {canNext ? formatWeight(fineOz, state.weightUnit, true) + ' fine' : '— fine'}
                </Text>
            </View>

            {/* Purity */}
            <Text style={styles.label}>Purity</Text>
            <View style={styles.purityList}>
                {PURITIES.map(p => (
                    <Pressable
                        key={p.value}
                        style={[styles.purityRow, state.purity === p.value && styles.purityRowActive]}
                        onPress={() => update({ purity: p.value })}
                    >
                        <View style={[styles.radio, state.purity === p.value && styles.radioActive]} />
                        <Text style={[styles.purityText, state.purity === p.value && styles.purityTextActive]}>
                            {p.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Recap */}
            <View style={styles.recap}>
                <Text style={styles.recapTitle}>Summary</Text>
                <RecapRow label="Series"   value={`${state.seriesName} · ${state.metal} · ${state.shape}`} />
                <RecapRow label="Quantity" value={`${recapQty} item${recapQty !== 1 ? 's' : ''}`} />
                <RecapRow label="Total wt" value={formatWeight(totalWeightOz, state.weightUnit)} />
                <RecapRow label="Fine wt"  value={canNext ? formatWeight(totalFineOz, state.weightUnit, true) + ' fine' : '—'} highlight />
            </View>

            <Pressable
                style={[styles.btnCreate, !canNext && styles.btnDisabled]}
                onPress={canNext ? onNext : undefined}
            >
                <Text style={styles.btnCreateText}>Next →</Text>
            </Pressable>
        </ScrollView>
    );
}

function RecapRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>{label}</Text>
            <Text style={[styles.recapValue, highlight && { color: colors.green }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40, gap: 8 },
    title: { fontFamily: fonts.manrope, fontSize: 22, color: colors.text, marginBottom: 8 },
    label: { fontSize: 9, letterSpacing: 2, color: colors.text2, fontFamily: fonts.outfitSemiBold, marginTop: 12, marginBottom: 6 },
    weightRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    weightInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, fontFamily: fonts.dmMono, fontSize: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', textAlign: 'center' },
    unitRow: { flexDirection: 'row', gap: 6 },
    unitChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    unitChipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    unitText: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text2 },
    unitTextActive: { color: colors.text },
    fineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    fineLabel: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    fineValue: { fontFamily: fonts.dmMono, fontSize: 14, color: colors.green },
    purityList: { gap: 4 },
    purityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    purityRowActive: { borderColor: colors.violet },
    radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.text2 },
    radioActive: { borderColor: colors.violet, backgroundColor: colors.violet },
    purityText: { fontFamily: fonts.outfit, fontSize: 14, color: colors.text2 },
    purityTextActive: { color: colors.text },
    recap: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10, marginTop: 8 },
    recapTitle: { fontFamily: fonts.manrope, fontSize: 14, color: colors.text, marginBottom: 4 },
    recapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recapLabel: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    recapValue: { fontFamily: fonts.dmMono, fontSize: 13, color: colors.text },
    btnCreate: { marginTop: 16, backgroundColor: colors.violet, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    btnCreateText: { fontFamily: fonts.outfitSemiBold, fontSize: 16, color: colors.text },
    btnDisabled: { opacity: 0.4 },
});
