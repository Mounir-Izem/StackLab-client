import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useItemStore } from '../../stores/itemStore';
import { useLabStore } from '../../stores/labStore';
import { triggerSuccess } from '../../utils/haptics';
import { colors, fonts } from '../../utils/theme';
import { CreateItemStep1 } from './CreateItemStep1';
import { CreateItemStep2 } from './CreateItemStep2';
import { CreateItemStep3 } from './CreateItemStep3';
import { CreateItemStep4 } from './CreateItemStep4';
import type { ItemMetal, ItemShape, ItemWeightUnit, StrikeFinish } from '../../types/item.types';
import type { Currency } from '../../types/settings.types';

export type MixRow = {
    id: string;
    year: string;
    strikeFinish: StrikeFinish | null;
    qty: number;
};

export type FlowState = {
    metal: ItemMetal | null;
    seriesName: string;
    shape: ItemShape;
    shapeDescription: string;
    mintName: string;
    mintVisible: boolean;
    quantity: number;
    mode: 'simple' | 'mix';
    year: string;
    strikeFinish: StrikeFinish | null;
    rows: MixRow[];
    weightInput: string;
    weightUnit: ItemWeightUnit;
    purity: number;
    purchasePrice: string;
    purchasePriceIsPerUnit: boolean;
    purchaseCurrency: Currency;
    purchaseDate: string;
    observedPrice: string;
    observedPriceIsPerUnit: boolean;
    observedCurrency: Currency;
    observedPriceDate: string;
};

const INITIAL: FlowState = {
    metal: null, seriesName: '', shape: 'coin', shapeDescription: '',
    mintName: '', mintVisible: false,
    quantity: 1, mode: 'simple', year: '', strikeFinish: null, rows: [],
    weightInput: '1', weightUnit: 'oz', purity: 0.9999,
    purchasePrice: '', purchasePriceIsPerUnit: false, purchaseCurrency: 'USD', purchaseDate: '',
    observedPrice: '', observedPriceIsPerUnit: false, observedCurrency: 'USD', observedPriceDate: '',
};

type Props = {
    route: { params: { labId: string; deckId: string | null } };
    navigation: { goBack: () => void };
};

export function CreateItemFlow({ route, navigation }: Props) {
    const { labId, deckId } = route.params;
    const { createItem } = useItemStore();
    const lab = useLabStore(s => s.labs.find(l => l.id === labId));
    const itemStatus: 'wishlist' | 'active' = lab?.type === 'wishlist' ? 'wishlist' : 'active';

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [state, setState] = useState<FlowState>(INITIAL);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    function update(patch: Partial<FlowState>) {
        setState(prev => ({ ...prev, ...patch }));
    }

    function handleBack() {
        if (step === 1) navigation.goBack();
        else setStep(prev => (prev - 1) as 1 | 2 | 3 | 4);
    }

    function handleNext() {
        setStep(prev => (prev + 1) as 1 | 2 | 3 | 4);
    }

    async function handleCreate() {
        if (submitting) return;
        setSubmitting(true);
        setSubmitError(null);

        // Le prix suit une union discriminée (price + priceIsPerUnit vont toujours ensemble,
        // jamais l'un sans l'autre) — d'où le ternaire plutôt qu'un objet plat. Un lab standard
        // remplit purchasePrice (prix payé), un lab wishlist remplit observedPrice (prix constaté).
        const priceFields = itemStatus === 'wishlist'
            ? (state.observedPrice.trim()
                ? {
                    observedPrice: parseFloat(state.observedPrice.replace(',', '.')),
                    observedPriceIsPerUnit: state.observedPriceIsPerUnit,
                    observedCurrency: state.observedCurrency,
                    observedPriceDate: state.observedPriceDate.trim() || null,
                }
                : {})
            : (state.purchasePrice.trim()
                ? {
                    purchasePrice: parseFloat(state.purchasePrice.replace(',', '.')),
                    purchasePriceIsPerUnit: state.purchasePriceIsPerUnit,
                    purchaseCurrency: state.purchaseCurrency,
                    purchaseDate: state.purchaseDate.trim() || null,
                }
                : {});

        const base = {
            labId,
            deckId: deckId ?? null,
            status: itemStatus,
            name: state.seriesName.trim(),
            metal: state.metal!,
            mintName: state.mintName.trim() || null,
            shape: state.shape,
            shapeDescription: state.shapeDescription.trim() || null,
            weightInput: parseFloat(state.weightInput) || 0,
            weightUnit: state.weightUnit,
            purity: state.purity,
            ...priceFields,
        };

        try {
            if (state.mode === 'simple') {
                await createItem({
                    ...base,
                    quantity: state.quantity,
                    year: state.year ? parseInt(state.year, 10) : null,
                    strikeFinish: state.strikeFinish,
                });
                if (useItemStore.getState().error) {
                    setSubmitError('Creation failed. Please try again.');
                    return;
                }
            } else {
                for (const row of state.rows) {
                    await createItem({
                        ...base,
                        quantity: row.qty,
                        year: row.year ? parseInt(row.year, 10) : null,
                        strikeFinish: row.strikeFinish,
                    });
                    if (useItemStore.getState().error) {
                        setSubmitError('Creation failed on one or more rows. Please try again.');
                        return;
                    }
                }
            }
            triggerSuccess();
            navigation.goBack();
        } catch {
            setSubmitError('Unexpected error. Please try again.');
        } finally {
            setSubmitting(false);
        }
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
                <Text style={styles.stepLabel}>{step} / 4</Text>
                <View style={styles.headerBtn} />
            </View>

            <View style={styles.progress}>
                {([1, 2, 3, 4] as const).map(n => (
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
                <CreateItemStep3 state={state} update={update} onNext={handleNext} />
            )}
            {step === 4 && (
                <CreateItemStep4
                    state={state}
                    update={update}
                    itemStatus={itemStatus}
                    onCreate={handleCreate}
                    submitting={submitting}
                    error={submitError}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
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
