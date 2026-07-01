import React, { useState } from 'react';
import {
    View, Text, Pressable, StyleSheet, ActivityIndicator,
    ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useItemStore } from '../../stores/itemStore';
import { PurchasePriceField } from '../common/PurchasePriceField';
import { colors, fonts } from '../../utils/theme';
import type { LabsStackScreenProps } from '../../navigation/types';
import type { ItemMetal, ItemShape, StrikeFinish, ItemCondition, ItemFeature, ItemWeightUnit } from '../../types/item.types';
import type { Currency } from '../../types/settings.types';

type Props = LabsStackScreenProps<'EditItem'>;

type EditState = {
    name: string;
    metal: ItemMetal | null;
    shape: ItemShape;
    shapeDescription: string;
    mintName: string;
    year: string;
    strikeFinish: StrikeFinish | null;
    weightInput: string;
    weightUnit: ItemWeightUnit;
    purity: number;
    quantity: number;
    purchasePrice: string;
    purchasePriceIsPerUnit: boolean;
    purchaseCurrency: Currency;
    purchaseDate: string;
    condition: ItemCondition | null;
    location: string;
    features: ItemFeature[];
    notes: string;
};

const PURITIES: { value: number; label: string }[] = [
    { value: 0.99999, label: '.99999' },
    { value: 0.9999,  label: '.9999'  },
    { value: 0.9995,  label: '.9995'  },
    { value: 0.999,   label: '.999'   },
    { value: 0.990,   label: '.990'   },
    { value: 0.986,   label: '.986'   },
    { value: 0.980,   label: '.980'   },
    { value: 0.970,   label: '.970'   },
    { value: 0.965,   label: '.965'   },
    { value: 0.9583,  label: '.9583'  },
    { value: 0.958,   label: '.958'   },
    { value: 0.950,   label: '.950'   },
    { value: 0.935,   label: '.935'   },
    { value: 0.930,   label: '.930'   },
    { value: 0.925,   label: '.925'   },
    { value: 0.9167,  label: '.9167'  },
    { value: 0.916,   label: '.916'   },
    { value: 0.900,   label: '.900'   },
    { value: 0.875,   label: '.875'   },
    { value: 0.835,   label: '.835'   },
    { value: 0.833,   label: '.833'   },
    { value: 0.800,   label: '.800'   },
    { value: 0.750,   label: '.750'   },
    { value: 0.720,   label: '.720'   },
    { value: 0.700,   label: '.700'   },
    { value: 0.680,   label: '.680'   },
    { value: 0.640,   label: '.640'   },
    { value: 0.625,   label: '.625'   },
    { value: 0.585,   label: '.585'   },
    { value: 0.500,   label: '.500'   },
    { value: 0.417,   label: '.417'   },
    { value: 0.400,   label: '.400'   },
    { value: 0.375,   label: '.375'   },
    { value: 0.350,   label: '.350'   },
    { value: 0.333,   label: '.333'   },
    { value: 0.250,   label: '.250'   },
    { value: 0.100,   label: '.100'   },
];

const STRIKES: { value: StrikeFinish; label: string }[] = [
    { value: 'BU',            label: 'BU'           },
    { value: 'proof',         label: 'Proof'        },
    { value: 'reverse_proof', label: 'Reverse Proof' },
    { value: 'antique',       label: 'Antique'      },
    { value: 'matte',         label: 'Matte'        },
    { value: 'specimen',      label: 'Specimen'     },
    { value: 'burnished',     label: 'Burnished'    },
    { value: 'proof_like',    label: 'Proof-like'   },
    { value: 'unknown',       label: 'Unknown'      },
];

const CONDITIONS: { value: ItemCondition; label: string }[] = [
    { value: 'uncirculated', label: 'Uncirculated' },
    { value: 'circulated',   label: 'Circulated'   },
    { value: 'damaged',      label: 'Damaged'      },
    { value: 'unknown',      label: 'Unknown'      },
];

const FEATURES: { value: ItemFeature; label: string }[] = [
    { value: 'privy',               label: 'Privy'             },
    { value: 'colorized',           label: 'Colorized'         },
    { value: 'gilded',              label: 'Gilded'            },
    { value: 'high_relief',         label: 'High Relief'       },
    { value: 'ultra_high_relief',   label: 'Ultra High Relief' },
    { value: 'hologram',            label: 'Hologram'          },
    { value: 'enamel',              label: 'Enamel'            },
    { value: 'ruthenium',           label: 'Ruthenium'         },
    { value: 'plated',              label: 'Plated'            },
    { value: 'insert',              label: 'Insert'            },
    { value: 'numbered_certificate', label: 'Certificate'      },
];

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

function weightOzToInput(weightOz: number, unit: ItemWeightUnit): string {
    if (unit === 'g')  return (weightOz * 31.1035).toFixed(3);
    if (unit === 'kg') return (weightOz / 32.1507).toFixed(6);
    return weightOz.toString();
}

export function EditItemFlow({ route, navigation }: Props) {
    const { t } = useTranslation();
    const { itemId } = route.params;
    const { items, updateItem, updatePurchasePrice } = useItemStore();
    const item = items.find(i => i.id === itemId);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [state, setState] = useState<EditState>(() => {
        if (!item) return {
            name: '', metal: null, shape: 'coin', shapeDescription: '',
            mintName: '', year: '', strikeFinish: null,
            weightInput: '1', weightUnit: 'oz', purity: 0.9999,
            quantity: 1, purchasePrice: '', purchasePriceIsPerUnit: false, purchaseCurrency: 'USD', purchaseDate: '',
            condition: null, location: '', features: [], notes: '',
        };
        const weightUnit = item.weightUnitInput ?? 'oz';
        return {
            name: item.name,
            metal: item.metal,
            shape: item.shape,
            shapeDescription: item.shapeDescription ?? '',
            mintName: item.mintName ?? '',
            year: item.year?.toString() ?? '',
            strikeFinish: item.strikeFinish ?? null,
            weightInput: weightOzToInput(item.weightOz, weightUnit),
            weightUnit,
            purity: item.purity,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice?.toString() ?? '',
            purchasePriceIsPerUnit: false,
            purchaseCurrency: item.purchaseCurrency ?? 'USD',
            purchaseDate: item.purchaseDate ?? '',
            condition: item.condition ?? null,
            location: item.location ?? '',
            features: item.features ?? [],
            notes: item.notes ?? '',
        };
    });

    function patch(partial: Partial<EditState>) {
        setState(prev => ({ ...prev, ...partial }));
    }

    function toggleFeature(f: ItemFeature) {
        setState(prev => ({
            ...prev,
            features: prev.features.includes(f)
                ? prev.features.filter(x => x !== f)
                : [...prev.features, f],
        }));
    }

    async function handleSave() {
        if (!item || submitting || !state.metal) return;
        setSubmitting(true);
        setSubmitError(null);

        const rawWeight = parseFloat(state.weightInput) || 0;
        const weightOz = state.weightUnit === 'oz'
            ? rawWeight
            : state.weightUnit === 'g'
                ? rawWeight / 31.1035
                : rawWeight * 32.1507;

        try {
            await updateItem(item.id, {
                name: state.name.trim(),
                metal: state.metal,
                shape: state.shape,
                shapeDescription: state.shapeDescription.trim() || null,
                mintName: state.mintName.trim() || null,
                year: state.year ? parseInt(state.year, 10) : null,
                strikeFinish: state.strikeFinish,
                weightOz,
                weightUnitInput: state.weightUnit,
                purity: state.purity,
                quantity: state.quantity,
                purchaseCurrency: state.purchasePrice.trim() ? state.purchaseCurrency : null,
                purchaseDate: (() => {
                    const d = state.purchaseDate.trim().replace(/\//g, '-');
                    if (/^\d{4}$/.test(d)) return d;
                    if (/^\d{4}-\d{2}$/.test(d)) return d;
                    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
                    return null;
                })(),
                condition: state.condition,
                location: state.location.trim() || null,
                features: state.features,
                notes: state.notes.trim() || null,
            });
            if (useItemStore.getState().error) {
                setSubmitError(t('create.updateFailed'));
                return;
            }

            // Appelé après updateItem pour que la normalisation per-unit se base
            // sur la quantity à jour (au cas où elle vient d'être modifiée ici aussi).
            await updatePurchasePrice(
                item.id,
                state.purchasePrice.trim() ? parseFloat(state.purchasePrice.replace(',', '.')) : null,
                state.purchasePriceIsPerUnit,
            );
            if (useItemStore.getState().error) {
                setSubmitError(t('create.updateFailed'));
                return;
            }
            navigation.goBack();
        } catch {
            setSubmitError(t('create.unexpectedError'));
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

    const canSave = !!state.name.trim() && !!state.metal;

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.headerSide}>
                    <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>{t('edit.title')}</Text>
                <View style={styles.headerSide}>
                    <Pressable
                        onPress={handleSave}
                        disabled={!canSave || submitting}
                        style={[styles.saveBtn, (!canSave || submitting) && styles.saveBtnDisabled]}
                        hitSlop={8}
                    >
                        {submitting
                            ? <ActivityIndicator size="small" color={colors.violet} />
                            : <Text style={[styles.saveBtnText, (!canSave || submitting) && styles.saveBtnTextDisabled]}>{t('common.save')}</Text>
                        }
                    </Pressable>
                </View>
            </View>

            {submitError && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{submitError}</Text>
                </View>
            )}

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── BASIC ─────────────────────────────────────── */}
                    <SectionHeader label={t('create.sectionBasic')} />

                    <FieldLabel label={t('create.fieldName')} />
                    <TextInput
                        style={styles.input}
                        value={state.name}
                        onChangeText={v => patch({ name: v })}
                        placeholder={t('create.namePlaceholder')}
                        placeholderTextColor={colors.text3}
                        autoCapitalize="words"
                    />

                    <FieldLabel label={t('item.metal.label')} />
                    <ChipRow>
                        {(['gold', 'silver'] as ItemMetal[]).map(m => (
                            <Chip
                                key={m}
                                label={t(`item.metal.${m}`)}
                                active={state.metal === m}
                                onPress={() => patch({ metal: m })}
                            />
                        ))}
                    </ChipRow>

                    <FieldLabel label={t('item.shape.label')} />
                    <ChipRow>
                        {(['coin', 'bar', 'token', 'bust', 'custom'] as ItemShape[]).map(s => (
                            <Chip
                                key={s}
                                label={t(`item.shape.${s}`)}
                                active={state.shape === s}
                                onPress={() => patch({ shape: s })}
                            />
                        ))}
                    </ChipRow>

                    {state.shape === 'custom' && (
                        <>
                            <FieldLabel label={t('create.shapeDesc')} />
                            <TextInput
                                style={styles.input}
                                value={state.shapeDescription}
                                onChangeText={v => patch({ shapeDescription: v })}
                                placeholder={t('create.shapeDescPlaceholder')}
                                placeholderTextColor={colors.text3}
                            />
                        </>
                    )}

                    <FieldLabel label={t('item.mint')} optional />
                    <TextInput
                        style={styles.input}
                        value={state.mintName}
                        onChangeText={v => patch({ mintName: v })}
                        placeholder={t('create.mintPlaceholder')}
                        placeholderTextColor={colors.text3}
                    />

                    <FieldLabel label={t('item.year')} optional />
                    <TextInput
                        style={[styles.input, styles.inputNarrow]}
                        value={state.year}
                        onChangeText={v => patch({ year: v.replace(/[^0-9]/g, '') })}
                        placeholder="2024"
                        placeholderTextColor={colors.text3}
                        keyboardType="number-pad"
                        maxLength={4}
                    />

                    <FieldLabel label={t('item.strikeFinish')} optional />
                    <ChipRow wrap>
                        {STRIKES.map(s => (
                            <Chip
                                key={s.value}
                                label={s.label}
                                active={state.strikeFinish === s.value}
                                onPress={() => patch({ strikeFinish: state.strikeFinish === s.value ? null : s.value })}
                            />
                        ))}
                    </ChipRow>

                    {/* ── PHYSICAL ──────────────────────────────────── */}
                    <SectionHeader label={t('create.sectionPhysical')} />

                    <FieldLabel label={t('item.weight')} />
                    <View style={styles.weightRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            value={state.weightInput}
                            onChangeText={v => patch({ weightInput: v.replace(/[^0-9.]/g, '') })}
                            keyboardType="decimal-pad"
                            placeholder="1.0"
                            placeholderTextColor={colors.text3}
                        />
                        <ChipRow>
                            {(['oz', 'g', 'kg'] as ItemWeightUnit[]).map(u => (
                                <Chip key={u} label={u} active={state.weightUnit === u} onPress={() => patch({ weightUnit: u })} small />
                            ))}
                        </ChipRow>
                    </View>

                    <FieldLabel label={t('item.purity')} />
                    <ChipRow wrap>
                        {PURITIES.map(p => (
                            <Chip
                                key={p.value}
                                label={p.label}
                                active={state.purity === p.value}
                                onPress={() => patch({ purity: p.value })}
                            />
                        ))}
                    </ChipRow>

                    <FieldLabel label={t('item.quantity')} />
                    <View style={styles.qtyRow}>
                        <Pressable
                            style={[styles.qtyBtn, state.quantity <= 1 && styles.qtyBtnDisabled]}
                            onPress={() => patch({ quantity: Math.max(1, state.quantity - 1) })}
                            disabled={state.quantity <= 1}
                        >
                            <Ionicons name="remove" size={18} color={state.quantity > 1 ? colors.text : colors.text3} />
                        </Pressable>
                        <TextInput
                            style={styles.qtyInput}
                            value={String(state.quantity)}
                            keyboardType="number-pad"
                            onChangeText={val => patch({ quantity: Math.max(1, parseInt(val, 10) || 1) })}
                            selectTextOnFocus
                        />
                        <Pressable
                            style={styles.qtyBtn}
                            onPress={() => patch({ quantity: state.quantity + 1 })}
                        >
                            <Ionicons name="add" size={18} color={colors.text} />
                        </Pressable>
                    </View>

                    {/* ── FINANCIAL ─────────────────────────────────── */}
                    <SectionHeader label={t('create.sectionFinancial')} />

                    <FieldLabel label={t('item.purchasePrice')} optional />
                    <PurchasePriceField
                        quantity={state.quantity}
                        priceText={state.purchasePrice}
                        onPriceTextChange={v => patch({ purchasePrice: v.replace(/[^0-9.,]/g, '') })}
                        isPerUnit={state.purchasePriceIsPerUnit}
                        onIsPerUnitChange={v => patch({ purchasePriceIsPerUnit: v })}
                    />

                    <FieldLabel label={t('settings.currency')} />
                    <ChipRow>
                        {CURRENCIES.map(c => (
                            <Chip
                                key={c}
                                label={c}
                                active={state.purchaseCurrency === c}
                                onPress={() => patch({ purchaseCurrency: c })}
                            />
                        ))}
                    </ChipRow>

                    <FieldLabel label={t('create.purchaseDate')} optional />
                    <TextInput
                        style={[styles.input, styles.inputNarrow]}
                        value={state.purchaseDate}
                        onChangeText={v => patch({ purchaseDate: v })}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.text3}
                        keyboardType="numbers-and-punctuation"
                        maxLength={10}
                    />

                    {/* ── METADATA ──────────────────────────────────── */}
                    <SectionHeader label={t('create.sectionMetadata')} />

                    <FieldLabel label={t('item.condition.label')} optional />
                    <ChipRow wrap>
                        {CONDITIONS.map(c => (
                            <Chip
                                key={c.value}
                                label={t(`item.condition.${c.value}`)}
                                active={state.condition === c.value}
                                onPress={() => patch({ condition: state.condition === c.value ? null : c.value })}
                            />
                        ))}
                    </ChipRow>

                    <FieldLabel label={t('item.location')} optional />
                    <TextInput
                        style={styles.input}
                        value={state.location}
                        onChangeText={v => patch({ location: v })}
                        placeholder={t('create.locationPlaceholder')}
                        placeholderTextColor={colors.text3}
                    />

                    <FieldLabel label={t('item.features')} optional />
                    <ChipRow wrap>
                        {FEATURES.map(f => (
                            <Chip
                                key={f.value}
                                label={f.label}
                                active={state.features.includes(f.value)}
                                onPress={() => toggleFeature(f.value)}
                            />
                        ))}
                    </ChipRow>

                    <FieldLabel label={t('item.notes')} optional />
                    <TextInput
                        style={[styles.input, styles.inputMultiline]}
                        value={state.notes}
                        onChangeText={v => patch({ notes: v })}
                        placeholder={t('create.notesPlaceholder')}
                        placeholderTextColor={colors.text3}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function SectionHeader({ label }: { label: string }) {
    return <Text style={styles.sectionHeader}>{label}</Text>;
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
    const { t } = useTranslation();
    return (
        <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {optional && <Text style={styles.fieldLabelOptional}>{t('common.optional')}</Text>}
        </View>
    );
}

function ChipRow({ children, wrap }: { children: React.ReactNode; wrap?: boolean }) {
    return (
        <View style={[styles.chipRow, wrap && styles.chipRowWrap]}>
            {children}
        </View>
    );
}

function Chip({ label, active, onPress, small }: { label: string; active: boolean; onPress: () => void; small?: boolean }) {
    return (
        <Pressable
            style={[styles.chip, active && styles.chipActive, small && styles.chipSmall]}
            onPress={onPress}
        >
            <Text style={[styles.chipText, active && styles.chipTextActive, small && styles.chipTextSmall]}>
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    },
    headerSide: { width: 80, alignItems: 'flex-start' },
    headerTitle: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text },
    saveBtn: {
        paddingHorizontal: 16, paddingVertical: 7,
        backgroundColor: colors.violet, borderRadius: 10,
        alignSelf: 'flex-end',
    },
    saveBtnDisabled: { backgroundColor: colors.surface2 },
    saveBtnText: { fontFamily: fonts.outfitSemiBold, fontSize: 14, color: colors.text },
    saveBtnTextDisabled: { color: colors.text2 },
    errorBanner: {
        marginHorizontal: 16, marginBottom: 8,
        backgroundColor: 'rgba(200,30,30,0.15)', borderRadius: 8, padding: 10,
    },
    errorText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.crimson },
    scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
    sectionHeader: {
        fontFamily: fonts.outfitSemiBold, fontSize: 10, letterSpacing: 2,
        color: colors.text2, marginTop: 20, marginBottom: 2,
        textTransform: 'uppercase',
    },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    fieldLabel: { fontSize: 9, letterSpacing: 1.5, color: colors.text2, fontFamily: fonts.outfitSemiBold },
    fieldLabelOptional: { fontSize: 9, color: colors.text3, fontFamily: fonts.outfit, fontStyle: 'italic' },
    input: {
        height: 44, backgroundColor: colors.surface, borderRadius: 10,
        paddingHorizontal: 12, color: colors.text, fontFamily: fonts.outfit, fontSize: 15,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    inputNarrow: { width: 160 },
    inputMultiline: { height: 100, paddingTop: 10 },
    weightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyBtn: {
        width: 40, height: 40, backgroundColor: colors.surface, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    qtyBtnDisabled: { opacity: 0.4 },
    qtyInput: {
        width: 64, height: 40, backgroundColor: colors.surface, borderRadius: 10,
        textAlign: 'center', color: colors.text, fontFamily: fonts.dmMono, fontSize: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    chipRow: { flexDirection: 'row', gap: 8 },
    chipRowWrap: { flexWrap: 'wrap' },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    chipSmall: { paddingHorizontal: 10, paddingVertical: 6 },
    chipText: { fontFamily: fonts.outfitMedium, fontSize: 13, color: colors.text2 },
    chipTextActive: { color: colors.text },
    chipTextSmall: { fontSize: 11 },
});
