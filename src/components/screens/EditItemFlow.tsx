import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useItemStore } from '../../stores/itemStore';
import { colors, fonts } from '../../utils/theme';
import { CreateItemStep1 } from './CreateItemStep1';
import { CreateItemStep2 } from './CreateItemStep2';
import { CreateItemStep3 } from './CreateItemStep3';
import type { LabsStackScreenProps } from '../../navigation/types';
import type { FlowState } from './CreateItemFlow';

type Props = LabsStackScreenProps<'EditItem'>;

function itemWeightOzToFlowState(weightOz: number): { weightInput: string; weightUnit: 'oz' } {
    return { weightInput: weightOz.toString(), weightUnit: 'oz' };
}

export function EditItemFlow({ route, navigation }: Props) {
    const { itemId } = route.params;
    const { items, updateItem } = useItemStore();
    const item = items.find(i => i.id === itemId);

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [state, setState] = useState<FlowState>(() => {
        if (!item) return {
            metal: null, seriesName: '', shape: 'coin', shapeDescription: '',
            mintName: '', mintVisible: false,
            quantity: 1, mode: 'simple', year: '', strikeFinish: null, rows: [],
            weightInput: '1', weightUnit: 'oz', purity: 0.9999,
        };
        const { weightInput, weightUnit } = itemWeightOzToFlowState(item.weightOz);
        return {
            metal: item.metal,
            seriesName: item.name,
            shape: item.shape,
            shapeDescription: item.shapeDescription ?? '',
            mintName: item.mintName ?? '',
            mintVisible: !!item.mintName,
            quantity: item.quantity,
            mode: 'simple',
            year: item.year?.toString() ?? '',
            strikeFinish: item.strikeFinish ?? null,
            rows: [],
            weightInput,
            weightUnit,
            purity: item.purity,
        };
    });

    function update(patch: Partial<FlowState>) {
        setState(prev => ({ ...prev, ...patch }));
    }

    function handleBack() {
        if (step === 1) navigation.goBack();
        else setStep(prev => (prev - 1) as 1 | 2 | 3);
    }

    function handleNext() {
        setStep(prev => (prev + 1) as 1 | 2 | 3);
    }

    async function handleUpdate() {
        if (!item || submitting) return;
        setSubmitting(true);
        setSubmitError(null);

        const rawWeight = parseFloat(state.weightInput) || 0;
        const weightOz = state.weightUnit === 'oz'
            ? rawWeight
            : state.weightUnit === 'g'
                ? rawWeight / 31.1035
                : rawWeight * 1000 / 31.1035;

        try {
            await updateItem(item.id, {
                name: state.seriesName.trim(),
                metal: state.metal!,
                mintName: state.mintName.trim() || null,
                shape: state.shape,
                shapeDescription: state.shapeDescription.trim() || null,
                weightOz,
                purity: state.purity,
                quantity: state.quantity,
                year: state.year ? parseInt(state.year, 10) : null,
                strikeFinish: state.strikeFinish,
            });
            if (useItemStore.getState().error) {
                setSubmitError('Update failed. Please try again.');
                return;
            }
            navigation.goBack();
        } catch {
            setSubmitError('Unexpected error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (!item) {
        return (
            <View style={[styles.screen, styles.center]}>
                <ActivityIndicator color={colors.violet} />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Pressable onPress={handleBack} hitSlop={8} style={styles.headerBtn}>
                    {step === 1
                        ? <Ionicons name="close" size={22} color={colors.text} />
                        : <Ionicons name="arrow-back" size={22} color={colors.text} />
                    }
                </Pressable>
                <Text style={styles.stepLabel}>{step} / 3</Text>
                <View style={styles.headerBtn} />
            </View>

            <View style={styles.progress}>
                {([1, 2, 3] as const).map(n => (
                    <View key={n} style={[styles.progressDot, n <= step && styles.progressDotActive]} />
                ))}
            </View>

            {step === 1 && (
                <CreateItemStep1 state={state} update={update} onNext={handleNext} />
            )}
            {step === 2 && (
                <CreateItemStep2 state={state} update={update} onNext={handleNext} />
            )}
            {step === 3 && (
                <CreateItemStep3
                    state={state}
                    update={update}
                    onCreate={handleUpdate}
                    submitting={submitting}
                    error={submitError}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    },
    headerBtn: { width: 32, alignItems: 'center' },
    stepLabel: { fontFamily: fonts.outfitMedium, fontSize: 14, color: colors.text2 },
    progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 8 },
    progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surface2 },
    progressDotActive: { backgroundColor: colors.violet, width: 20 },
});
