import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
    View, Text, ScrollView, Pressable, TextInput,
    StyleSheet, ActivityIndicator, Image, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLabStore } from '../../stores/labStore';
import { useDeckStore } from '../../stores/deckStore';
import { useItemStore } from '../../stores/itemStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSpotStore } from '../../stores/spotStore';
import { calcFineWeightOz, calcMeltValue, convertSpotPrice } from '../../utils/calculations';
import {
    formatWeight, formatPurity, formatCurrency,
    formatDate, formatStrikeLabel,
} from '../../utils/formatters';
import { metalTokens, colors, fonts, fontSize } from '../../utils/theme';
import { MoveItemModal } from '../modals/MoveItemModal';
import { getItemRole } from '../../domain/itemSemantics';
import { canPerformAction } from '../../domain/actionSemantics';
import { resolveQuantityDraft } from '../../utils/quantityInput';
import type { LabsStackScreenProps } from '../../navigation/types';
import type { Currency } from '../../types/settings.types';

type Props = LabsStackScreenProps<'ItemDetail'>;

export function ItemDetail({ route, navigation }: Props) {
    const { t } = useTranslation();
    const { itemId } = route.params;

    const { labs } = useLabStore();
    const { decks, loadDecks } = useDeckStore();
    const { items, loadItems, updateItem, deleteItem, restoreFromTrash, sellItem, acquireItem } = useItemStore();
    const currency = useSettingsStore(s => s.settings?.currency ?? 'USD');
    const weightUnit = useSettingsStore(s => s.settings?.weightUnit ?? 'oz');
    const { spot, rates } = useSpotStore();
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeleteForeverConfirm, setShowDeleteForeverConfirm] = useState(false);
    const [showRestorePicker, setShowRestorePicker] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
    const [sellQty, setSellQty] = useState(1);
    // Drafts libres pendant la frappe des champs quantité sell/acquire — sellQty/
    // acquireQty restent la source de vérité, résolus au blur uniquement.
    const [sellQtyDraft, setSellQtyDraft] = useState<string | null>(null);
    const [acquireQtyDraft, setAcquireQtyDraft] = useState<string | null>(null);
    const [sellPrice, setSellPrice] = useState('');
    const [sellPerUnit, setSellPerUnit] = useState(true);
    const [sellCurrency, setSellCurrency] = useState<Currency>(currency as Currency);
    const [showSellCurrencyPicker, setShowSellCurrencyPicker] = useState(false);
    const [showAcquireModal, setShowAcquireModal] = useState(false);
    const [acquireQty, setAcquireQty] = useState(1);
    const [acquirePrice, setAcquirePrice] = useState('');
    const [acquirePerUnit, setAcquirePerUnit] = useState(false);
    const [acquireCurrency, setAcquireCurrency] = useState<Currency>(currency as Currency);
    const [acquireTargetLabId, setAcquireTargetLabId] = useState<string | null>(null);
    const [showAcquireCurrencyPicker, setShowAcquireCurrencyPicker] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);

    const item = items.find(i => i.id === itemId);
    const lab = item ? labs.find(l => l.id === item.labId) : undefined;
    const deck = item?.deckId ? decks.find(d => d.id === item.deckId) : undefined;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (item) { loadDecks(item.labId); loadItems(item.labId); }
    }, [itemId]);

    useLayoutEffect(() => {
        if (!item || !lab) return;
        navigation.setOptions({
            headerTitle: () => (
                <View style={styles.breadcrumb}>
                    <Pressable onPress={() => navigation.pop(item.deckId ? 2 : 1)} hitSlop={8}>
                        <Text style={styles.crumbParent}>{lab.name}</Text>
                    </Pressable>
                    {deck && (
                        <>
                            <Text style={styles.crumbSep}>›</Text>
                            <Pressable onPress={() => navigation.pop()} hitSlop={8}>
                                <Text style={styles.crumbParent}>{deck.name}</Text>
                            </Pressable>
                        </>
                    )}
                    <Text style={styles.crumbSep}>›</Text>
                    <Text style={styles.crumbCurrent} numberOfLines={1}>{item.name}</Text>
                </View>
            ),
        });
    }, [item, lab, deck, navigation]);

    async function handlePickPhoto(source: 'camera' | 'library') {
        if (!item) return;
        setShowPhotoOptions(false);
        try {
            const result = source === 'camera'
                ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 })
                : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
            if (result.canceled) return;
            const photosDir = new FileSystem.Directory(FileSystem.Paths.document, 'photos');
            if (!photosDir.exists) photosDir.create({ intermediates: true });
            const destFile = new FileSystem.File(photosDir, item.id + '_' + Date.now() + '.jpg');
            if (item.photoUrl) {
                const old = new FileSystem.File(item.photoUrl);
                if (old.exists) old.delete();
            }
            if (destFile.exists) destFile.delete();
            new FileSystem.File(result.assets[0].uri).copy(destFile);
            await updateItem(item.id, { photoUrl: destFile.uri });

        } catch {
            // silent fail — permission refusée ou erreur fichier
        }
    }

    if (!item) return (
        <View style={[styles.screen, styles.center]}>
            <ActivityIndicator color={colors.violet} />
        </View>
    );
    const metal = metalTokens[item.metal];
    const fineOz = calcFineWeightOz(item.weightOz, item.purity);
    const spotPrice = spot ? (item.metal === 'gold' ? spot.gold : spot.silver) : null;
    const meltValueUsd = spotPrice !== null ? calcMeltValue(fineOz, spotPrice) : null;
    const meltValue = meltValueUsd !== null ? convertSpotPrice(meltValueUsd, currency, rates) : null;

    const purchaseUsd = item.purchasePrice !== null
        ? (!item.purchaseCurrency || item.purchaseCurrency === 'USD'
            ? item.purchasePrice
            : (rates[item.purchaseCurrency] ? item.purchasePrice * rates[item.purchaseCurrency] : null))
        : null;
    const purchaseInDisplay = purchaseUsd !== null ? convertSpotPrice(purchaseUsd, currency, rates) : null;

    const totalMeltValue = meltValue !== null ? meltValue * item.quantity : null;
    const meltColor = totalMeltValue === null ? colors.text3
        : purchaseInDisplay === null ? colors.text
        : totalMeltValue > purchaseInDisplay ? colors.green
        : totalMeltValue < purchaseInDisplay ? colors.crimson
        : colors.text;

    const soldUsd = item.soldPrice !== null
        ? (!item.soldCurrency || item.soldCurrency === 'USD'
            ? item.soldPrice
            : (rates[item.soldCurrency] ? item.soldPrice * rates[item.soldCurrency] : null))
        : null;
    const soldInDisplay = soldUsd !== null ? convertSpotPrice(soldUsd, currency, rates) : null;
    const soldColor = soldInDisplay === null || purchaseInDisplay === null ? colors.text
        : soldInDisplay > purchaseInDisplay ? colors.green
        : soldInDisplay < purchaseInDisplay ? colors.crimson
        : colors.text;

    const strikeLabel = item.strikeFinish && item.strikeFinish !== 'unknown'
        ? formatStrikeLabel(item.strikeFinish) : null;
    const sub = [item.year?.toString(), strikeLabel].filter(Boolean).join(' · ');
    const isSold = item.status === 'sold';
    const isWishlist = item.status === 'wishlist';
    const isTrash = lab?.type === 'trash';
    // Guardrail ciblé (Lot 4.1) — lab est disponible ici, donc getItemRole()
    // plutôt qu'un mapping status-only. Le reste de l'écran garde encore la
    // structure isTrash/isWishlist/isSold existante (migration complète hors
    // périmètre de ce lot).
    const role = lab ? getItemRole(item, lab) : null;

    const observedUsd = isWishlist && item.observedPrice !== null
        ? (!item.observedCurrency || item.observedCurrency === 'USD'
            ? item.observedPrice
            : (rates[item.observedCurrency] ? item.observedPrice * rates[item.observedCurrency] : null))
        : null;
    const observedInDisplay = observedUsd !== null ? convertSpotPrice(observedUsd, currency, rates) : null;
    const observedPremiumAmount = observedInDisplay !== null && meltValue !== null && meltValue > 0
        ? observedInDisplay - meltValue
        : null;
    const observedPremiumPct = observedPremiumAmount !== null && meltValue !== null
        ? observedPremiumAmount / meltValue
        : null;

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Photo */}
                <Pressable
                    style={[styles.photoContainer, { borderColor: metal.frameBorder }]}
                    onPress={() => setShowPhotoOptions(true)}
                >
                    {item.photoUrl ? (
                        <>
                            <Image source={{ uri: item.photoUrl }} style={styles.photo} resizeMode="cover" />
                            <View style={styles.photoEditOverlay}>
                                <Ionicons name="camera-outline" size={18} color="rgba(255,255,255,0.8)" />
                            </View>
                        </>
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Ionicons name="camera-outline" size={32} color={colors.text3} />
                            <Text style={styles.photoPlaceholderText}>{t('item.addPhoto')}</Text>
                            <Text style={styles.photoHintText}>{t('item.photoHint')}</Text>
                        </View>
                    )}
                    <View style={[styles.metalBadge, { backgroundColor: metal.badgeBg, borderColor: metal.badgeBorder }]}>
                        <Text style={[styles.metalBadgeText, { color: metal.color }]}>{t(`item.metal.${item.metal}`)}</Text>
                    </View>
                    {isSold && (
                        <View style={styles.soldBadge}>
                            <Text style={styles.soldBadgeText}>{t('item.status.sold')}</Text>
                        </View>
                    )}
                </Pressable>

                {/* Core */}
                <View style={styles.section}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{item.name}</Text>
                        <View style={styles.qtyBadge}>
                            <Text style={styles.qtyText}>×{item.quantity}</Text>
                        </View>
                    </View>
                    {sub ? <Text style={styles.sub}>{sub}</Text> : null}
                </View>

                {/* Physical */}
                <View style={styles.row3}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('item.weight')}</Text>
                        <Text style={styles.statVal}>{formatWeight(item.weightOz, weightUnit)}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('item.purity')}</Text>
                        <Text style={styles.statVal}>{formatPurity(item.purity)}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('item.fineWeightUnit', { unit: weightUnit })}</Text>
                        <Text style={[styles.statVal, { color: colors.text }]}>{formatWeight(fineOz, weightUnit, true)}</Text>
                    </View>
                </View>

                {/* Melt value */}
                <View style={styles.row2}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('item.meltValue')}</Text>
                        <Text style={[styles.statVal, { color: meltColor }]}>
                            {meltValue !== null ? formatCurrency(meltValue, currency as Currency) : '—'}
                        </Text>
                    </View>
                </View>

                {/* Financial */}
                {!isWishlist && item.purchasePrice !== null && (
                    <View style={styles.row2}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.purchasedLabel')}</Text>
                            <Text style={styles.statVal}>{formatCurrency(item.purchasePrice, item.purchaseCurrency ?? currency)}</Text>
                        </View>
                        {item.purchaseDate && (
                            <View style={styles.stat}>
                                <Text style={styles.statLabel}>{t('item.dateLabel')}</Text>
                                <Text style={styles.statVal}>{formatDate(item.purchaseDate)}</Text>
                            </View>
                        )}
                    </View>
                )}
                {isWishlist && item.observedPrice !== null && (
                    <View style={styles.row2}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.observedLabel')}</Text>
                            <Text style={styles.statVal}>{formatCurrency(item.observedPrice, item.observedCurrency ?? currency)}</Text>
                        </View>
                        {item.observedPriceDate && (
                            <View style={styles.stat}>
                                <Text style={styles.statLabel}>{t('item.dateLabel')}</Text>
                                <Text style={styles.statVal}>{formatDate(item.observedPriceDate)}</Text>
                            </View>
                        )}
                    </View>
                )}
                {isWishlist && observedPremiumAmount !== null && observedPremiumPct !== null && (
                    <View style={styles.row2}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.observedPremiumLabel')}</Text>
                            <Text style={styles.statVal}>
                                {observedPremiumAmount >= 0 ? '+' : ''}{formatCurrency(Math.abs(observedPremiumAmount), currency as Currency)}
                                {' ('}
                                {observedPremiumAmount >= 0 ? '+' : ''}{(observedPremiumPct * 100).toFixed(1)}%
                                {')'}
                            </Text>
                        </View>
                    </View>
                )}
                {isSold && item.soldPrice !== null && (
                    <View style={styles.row2}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>{t('item.soldPrice')}</Text>
                            <Text style={[styles.statVal, { color: soldColor }]}>{formatCurrency(item.soldPrice, item.soldCurrency ?? currency)}</Text>
                        </View>
                        {item.soldDate && (
                            <View style={styles.stat}>
                                <Text style={styles.statLabel}>{t('item.dateLabel')}</Text>
                                <Text style={styles.statVal}>{formatDate(item.soldDate)}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Details */}
                {(item.mintName || item.condition || item.location) && (
                    <View style={styles.detailsRow}>
                        {item.mintName && <DetailChip label={t('item.mint')} value={item.mintName} />}
                        {item.condition && <DetailChip label={t('item.condition.label')} value={t(`item.condition.${item.condition}`)} />}
                        {item.location && <DetailChip label={t('item.location')} value={item.location} />}
                    </View>
                )}
                {item.features.length > 0 && (
                    <View style={styles.chipsRow}>
                        {item.features.map(f => <Chip key={f} label={f.replace(/_/g, ' ')} />)}
                    </View>
                )}
                {item.notes && (
                    <View style={styles.notesBox}>
                        <Text style={styles.statLabel}>{t('item.notes')}</Text>
                        <Text style={styles.notesText}>{item.notes}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Actions footer */}
            <View style={styles.footer}>
                {isTrash ? (
                    <>
                        <ActionBtn icon="arrow-undo-outline" label={t('item.actions.restore')} onPress={() => setShowRestorePicker(true)} />
                        <ActionBtn icon="trash-outline" label={t('item.actions.deleteForever')} danger onPress={() => setShowDeleteForeverConfirm(true)} />
                    </>
                ) : isWishlist ? (
                    <>
                        <ActionBtn icon="bag-check-outline" label={t('item.actions.acquireBtn')} onPress={() => { setAcquireQty(item.quantity); setAcquirePrice(''); setAcquirePerUnit(false); setAcquireCurrency(currency as Currency); setAcquireTargetLabId(labs.find(l => l.type === 'standard')?.id ?? null); setShowAcquireModal(true); }} />
                        <ActionBtn icon="close-circle-outline" label={t('item.actions.remove')} danger onPress={() => setShowRemoveConfirm(true)} />
                        <ActionBtn icon="create-outline" label={t('item.actions.edit')} onPress={() => navigation.navigate('EditItem', { itemId: item.id })} />
                    </>
                ) : isSold ? (
                    <>
                        {role !== null && canPerformAction(role, 'trash') && (
                            <ActionBtn icon="trash-outline" label={t('item.actions.delete')} danger onPress={() => setShowDeleteConfirm(true)} />
                        )}
                    </>
                ) : (
                    <>
                        <ActionBtn icon="create-outline" label={t('item.actions.edit')} onPress={() => navigation.navigate('EditItem', { itemId: item.id })} />
                        <ActionBtn icon="cash-outline" label={t('item.actions.sell')} onPress={() => { setSellQty(item.quantity); setSellPrice(''); setSellPerUnit(true); setSellCurrency(currency as Currency); setShowSellModal(true); }} />
                        <ActionBtn icon="copy-outline" label={t('item.actions.duplicate')} disabled />
                        <ActionBtn icon="git-branch-outline" label={t('item.actions.extract')} disabled />
                        <ActionBtn icon="arrow-forward-outline" label={t('item.actions.move')} onPress={() => setShowMoveModal(true)} />
                        <ActionBtn icon="trash-outline" label={t('item.actions.delete')} danger onPress={() => setShowDeleteConfirm(true)} />
                    </>
                )}
            </View>

            <MoveItemModal
                item={item}
                visible={showMoveModal}
                onClose={() => setShowMoveModal(false)}
                onMoveComplete={() => navigation.goBack()}
            />

            {/* Acquire modal */}
            <Modal visible={showAcquireModal} transparent animationType="slide" onRequestClose={() => setShowAcquireModal(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowAcquireModal(false)}>
                    <View style={styles.sellSheet}>
                        <Text style={styles.optionTitle}>{t('acquire.title')}</Text>

                        <View style={styles.sellBody}>
                            <Text style={styles.sellLabel}>{t('item.quantity')}</Text>
                            <View style={styles.qtyRow}>
                                <Pressable style={styles.qtyBtn} onPress={() => { setAcquireQty(q => Math.max(1, q - 1)); setAcquireQtyDraft(null); }} disabled={acquireQty <= 1}>
                                    <Ionicons name="remove" size={18} color={acquireQty > 1 ? colors.text : colors.text2} />
                                </Pressable>
                                <TextInput
                                    style={styles.qtyInput}
                                    value={acquireQtyDraft ?? String(acquireQty)}
                                    keyboardType="number-pad"
                                    onChangeText={setAcquireQtyDraft}
                                    onBlur={() => {
                                        if (acquireQtyDraft !== null) {
                                            setAcquireQty(resolveQuantityDraft(acquireQtyDraft, item.quantity));
                                            setAcquireQtyDraft(null);
                                        }
                                    }}
                                    selectTextOnFocus
                                />
                                <Pressable style={styles.qtyBtn} onPress={() => { setAcquireQty(q => Math.min(item.quantity, q + 1)); setAcquireQtyDraft(null); }} disabled={acquireQty >= item.quantity}>
                                    <Ionicons name="add" size={18} color={acquireQty < item.quantity ? colors.text : colors.text2} />
                                </Pressable>
                                <Text style={styles.qtyMax}>/ {item.quantity}</Text>
                            </View>

                            <Text style={styles.sellLabel}>{t('move.title')}</Text>
                            <View style={styles.labChips}>
                                {labs.filter(l => l.type === 'standard').map(l => (
                                    <Pressable
                                        key={l.id}
                                        style={[styles.labChip, acquireTargetLabId === l.id && styles.labChipActive]}
                                        onPress={() => setAcquireTargetLabId(l.id)}
                                    >
                                        <Text style={[styles.labChipText, acquireTargetLabId === l.id && styles.labChipTextActive]}>{l.name}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.sellLabel}>{t('item.acquirePriceLabel')}</Text>
                            <View style={styles.priceRow}>
                                <TextInput
                                    style={styles.priceInput}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.text2}
                                    value={acquirePrice}
                                    onChangeText={setAcquirePrice}
                                    keyboardType="decimal-pad"
                                />
                                <Pressable style={styles.currencyBtn} onPress={() => setShowAcquireCurrencyPicker(true)}>
                                    <Text style={styles.currencyBtnText}>{acquireCurrency} ▾</Text>
                                </Pressable>
                                {acquireQty > 1 && (
                                    <Pressable style={styles.perUnitBtn} onPress={() => setAcquirePerUnit(p => !p)}>
                                        <Text style={styles.perUnitText}>{acquirePerUnit ? t('item.purchasePerUnit') : t('item.totalLot')} ▾</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        <Pressable
                            style={[styles.sellConfirmBtn, !acquireTargetLabId && styles.disabled]}
                            disabled={!acquireTargetLabId}
                            onPress={async () => {
                                if (!acquireTargetLabId) return;
                                setShowAcquireModal(false);
                                const finalQty = acquireQtyDraft !== null ? resolveQuantityDraft(acquireQtyDraft, item.quantity) : acquireQty;
                                const price = acquirePrice.trim() ? parseFloat(acquirePrice.replace(',', '.')) : null;
                                await acquireItem(item.id, finalQty, acquireTargetLabId, null, price, price ? acquireCurrency : null, acquirePerUnit);
                                navigation.goBack();
                            }}
                        >
                            <Text style={styles.sellConfirmText}>{t('acquire.confirm')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Acquire currency picker */}
            <Modal visible={showAcquireCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowAcquireCurrencyPicker(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowAcquireCurrencyPicker(false)}>
                    <View style={styles.optionSheet}>
                        <Text style={styles.optionTitle}>{t('item.purchaseCurrencyLabel')}</Text>
                        {(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as Currency[]).map(c => (
                            <Pressable key={c} style={styles.optionBtn} onPress={() => { setAcquireCurrency(c); setShowAcquireCurrencyPicker(false); }}>
                                <Text style={[styles.optionBtnText, acquireCurrency === c && { color: colors.violet }]}>{c}</Text>
                                {acquireCurrency === c && <Ionicons name="checkmark" size={16} color={colors.violet} />}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            {/* Sell modal */}
            <Modal visible={showSellModal} transparent animationType="slide" onRequestClose={() => setShowSellModal(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowSellModal(false)}>
                    <View style={styles.sellSheet}>
                        <Text style={styles.optionTitle}>{t('sell.title')}</Text>

                        <View style={styles.sellBody}>
                            <Text style={styles.sellLabel}>{t('item.quantity')}</Text>
                            <View style={styles.qtyRow}>
                                <Pressable style={styles.qtyBtn} onPress={() => { setSellQty(q => Math.max(1, q - 1)); setSellQtyDraft(null); }} disabled={sellQty <= 1}>
                                    <Ionicons name="remove" size={18} color={sellQty > 1 ? colors.text : colors.text2} />
                                </Pressable>
                                <TextInput
                                    style={styles.qtyInput}
                                    value={sellQtyDraft ?? String(sellQty)}
                                    keyboardType="number-pad"
                                    onChangeText={setSellQtyDraft}
                                    onBlur={() => {
                                        if (sellQtyDraft !== null) {
                                            setSellQty(resolveQuantityDraft(sellQtyDraft, item.quantity));
                                            setSellQtyDraft(null);
                                        }
                                    }}
                                    selectTextOnFocus
                                />
                                <Pressable style={styles.qtyBtn} onPress={() => { setSellQty(q => Math.min(item.quantity, q + 1)); setSellQtyDraft(null); }} disabled={sellQty >= item.quantity}>
                                    <Ionicons name="add" size={18} color={sellQty < item.quantity ? colors.text : colors.text2} />
                                </Pressable>
                                <Text style={styles.qtyMax}>/ {item.quantity}</Text>
                            </View>

                            <Text style={styles.sellLabel}>{t('item.salePriceLabel')}</Text>
                            <View style={styles.priceRow}>
                                <TextInput
                                    style={styles.priceInput}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.text2}
                                    value={sellPrice}
                                    onChangeText={setSellPrice}
                                    keyboardType="decimal-pad"
                                />
                                <Pressable style={styles.currencyBtn} onPress={() => setShowSellCurrencyPicker(true)}>
                                    <Text style={styles.currencyBtnText}>{sellCurrency} ▾</Text>
                                </Pressable>
                                <Pressable style={styles.perUnitBtn} onPress={() => setSellPerUnit(p => !p)}>
                                    <Text style={styles.perUnitText}>{sellPerUnit ? t('item.purchasePerUnit') : t('item.perLot')} ▾</Text>
                                </Pressable>
                            </View>
                        </View>

                        <Pressable style={styles.sellConfirmBtn} onPress={async () => {
                            setShowSellModal(false);
                            const finalQty = sellQtyDraft !== null ? resolveQuantityDraft(sellQtyDraft, item.quantity) : sellQty;
                            const price = sellPrice.trim() ? parseFloat(sellPrice.replace(',', '.')) : null;
                            await sellItem(item.id, finalQty, price, sellPerUnit, sellCurrency, new Date().toISOString());
                            navigation.goBack();
                        }}>
                            <Text style={styles.sellConfirmText}>{t('sell.confirm')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Sell currency picker */}
            <Modal visible={showSellCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowSellCurrencyPicker(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowSellCurrencyPicker(false)}>
                    <View style={styles.optionSheet}>
                        <Text style={styles.optionTitle}>{t('item.saleCurrencyLabel')}</Text>
                        {(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as Currency[]).map(c => (
                            <Pressable key={c} style={styles.optionBtn} onPress={() => { setSellCurrency(c); setShowSellCurrencyPicker(false); }}>
                                <Text style={[styles.optionBtnText, sellCurrency === c && { color: colors.violet }]}>{c}</Text>
                                {sellCurrency === c && <Ionicons name="checkmark" size={16} color={colors.violet} />}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            {/* Delete forever confirmation modal */}
            <Modal visible={showDeleteForeverConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteForeverConfirm(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowDeleteForeverConfirm(false)}>
                    <View style={styles.optionSheet}>
                        <Text style={styles.optionTitle}>{t('item.deleteForeverTitle')}</Text>
                        <Text style={styles.optionSubtitle}>{t('item.deleteForeverMsg')}</Text>
                        <Pressable style={styles.optionBtn} onPress={async () => {
                            setShowDeleteForeverConfirm(false);
                            await deleteItem(item.id);
                            navigation.goBack();
                        }}>
                            <Ionicons name="trash-outline" size={20} color={colors.crimson} />
                            <Text style={[styles.optionBtnText, { color: colors.crimson }]}>{t('item.actions.deleteForever')}</Text>
                        </Pressable>
                        <Pressable style={styles.optionBtn} onPress={() => setShowDeleteForeverConfirm(false)}>
                            <Text style={styles.optionBtnText}>{t('common.cancel')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Restore modal — trashedSale : pas de choix de lab, la vente n'est pas
                "rangée" dans un lab pour l'utilisateur, elle retourne dans l'historique
                des ventes. Les autres rôles trash gardent le picker de lab existant. */}
            <Modal visible={showRestorePicker} transparent animationType="fade" onRequestClose={() => setShowRestorePicker(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowRestorePicker(false)}>
                    <View style={styles.optionSheet}>
                        {role === 'trashedSale' ? (
                            <>
                                <Text style={styles.optionTitle}>{t('item.restoreSaleTitle')}</Text>
                                <Pressable style={styles.optionBtn} onPress={async () => {
                                    const standardLab = labs.find(l => l.type === 'standard');
                                    if (!standardLab) return;
                                    setShowRestorePicker(false);
                                    await restoreFromTrash(item.id, standardLab.id, null);
                                    navigation.goBack();
                                }}>
                                    <Ionicons name="cash-outline" size={20} color={colors.text} />
                                    <Text style={styles.optionBtnText}>{t('item.actions.restoreSale')}</Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <Text style={styles.optionTitle}>{t('item.restoreTitle')}</Text>
                                {labs.filter(l => item.status === 'wishlist' ? l.type === 'wishlist' : l.type === 'standard').map(l => (
                                    <Pressable key={l.id} style={styles.optionBtn} onPress={async () => {
                                        setShowRestorePicker(false);
                                        await restoreFromTrash(item.id, l.id, null);
                                        navigation.goBack();
                                    }}>
                                        <Ionicons name="layers-outline" size={20} color={colors.text} />
                                        <Text style={styles.optionBtnText}>{l.name}</Text>
                                    </Pressable>
                                ))}
                            </>
                        )}
                        <Pressable style={styles.optionBtn} onPress={() => setShowRestorePicker(false)}>
                            <Text style={styles.optionBtnText}>{t('common.cancel')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Remove from wishlist confirmation modal */}
            <Modal visible={showRemoveConfirm} transparent animationType="fade" onRequestClose={() => setShowRemoveConfirm(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowRemoveConfirm(false)}>
                    <View style={styles.optionSheet}>
                        <Text style={styles.optionTitle}>{t('item.removeFromWishlistTitle')}</Text>
                        <Pressable style={styles.optionBtn} onPress={async () => {
                            setShowRemoveConfirm(false);
                            await deleteItem(item.id);
                            navigation.goBack();
                        }}>
                            <Ionicons name="close-circle-outline" size={20} color={colors.crimson} />
                            <Text style={[styles.optionBtnText, { color: colors.crimson }]}>{t('item.actions.remove')}</Text>
                        </Pressable>
                        <Pressable style={styles.optionBtn} onPress={() => setShowRemoveConfirm(false)}>
                            <Text style={styles.optionBtnText}>{t('common.cancel')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Delete confirmation modal */}
            <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowDeleteConfirm(false)}>
                    <View style={styles.optionSheet}>
                        <Text style={styles.optionTitle}>{t('item.moveToTrashTitle')}</Text>
                        <Pressable style={styles.optionBtn} onPress={async () => {
                            setShowDeleteConfirm(false);
                            await deleteItem(item.id);
                            navigation.goBack();
                        }}>
                            <Ionicons name="trash-outline" size={20} color={colors.crimson} />
                            <Text style={[styles.optionBtnText, { color: colors.crimson }]}>{t('item.actions.moveToTrash')}</Text>
                        </Pressable>
                        <Pressable style={styles.optionBtn} onPress={() => setShowDeleteConfirm(false)}>
                            <Text style={styles.optionBtnText}>{t('common.cancel')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Photo picker modal */}
            <Modal visible={showPhotoOptions} transparent animationType="fade" onRequestClose={() => setShowPhotoOptions(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowPhotoOptions(false)}>
                    <View style={styles.optionSheet}>
                        <Text style={styles.optionTitle}>{t('item.addPhotoTitle')}</Text>
                        <Pressable style={styles.optionBtn} onPress={() => handlePickPhoto('camera')}>
                            <Ionicons name="camera-outline" size={20} color={colors.text} />
                            <Text style={styles.optionBtnText}>{t('item.takePhoto')}</Text>
                        </Pressable>
                        <Pressable style={styles.optionBtn} onPress={() => handlePickPhoto('library')}>
                            <Ionicons name="image-outline" size={20} color={colors.text} />
                            <Text style={styles.optionBtnText}>{t('item.chooseFromLibrary')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

function DetailChip({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.detailChip}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.detailChipVal}>{value}</Text>
        </View>
    );
}

function Chip({ label }: { label: string }) {
    return (
        <View style={styles.chip}>
            <Text style={styles.chipText}>{label}</Text>
        </View>
    );
}

function ActionBtn({ icon, label, disabled, danger, onPress }: { icon: string; label: string; disabled?: boolean; danger?: boolean; onPress?: () => void }) {
    return (
        <Pressable style={[styles.actionBtn, disabled && styles.disabled]} onPress={disabled ? undefined : onPress}>
            <Ionicons name={icon as never} size={18} color={danger ? colors.crimson : colors.text2} />
            <Text style={[styles.actionLabel, danger && { color: colors.crimson }]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 100, gap: 16 },
    breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 260 },
    crumbParent: { color: colors.text2, fontFamily: fonts.outfit, fontSize: 13 },
    crumbSep: { color: colors.text2, fontSize: 13, opacity: 0.5 },
    crumbCurrent: { color: colors.text, fontFamily: fonts.manrope, fontSize: 14, flexShrink: 1 },
    photoContainer: {
        width: '100%', aspectRatio: 1, borderRadius: 16,
        overflow: 'hidden', borderWidth: 0.5,
    },
    photo: { width: '100%', height: '100%' },
    photoEditOverlay: {
        position: 'absolute', bottom: 8, right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6,
    },
    photoPlaceholder: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surface, gap: 8,
    },
    photoPlaceholderText: { color: colors.text3, fontFamily: fonts.outfit, fontSize: 13 },
    photoHintText: { color: colors.text3, fontFamily: fonts.outfit, fontSize: 11, marginTop: 2 },
    metalBadge: {
        position: 'absolute', top: 12, left: 12,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 10, borderWidth: 0.5,
    },
    metalBadgeText: { fontSize: fontSize.cardBadge, fontFamily: fonts.outfitSemiBold, letterSpacing: 1.5, textTransform: 'uppercase' },
    soldBadge: {
        position: 'absolute', top: 12, right: 12,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 10, backgroundColor: 'rgba(180,30,30,0.22)',
        borderWidth: 0.5, borderColor: 'rgba(180,30,30,0.45)',
    },
    soldBadgeText: { fontSize: fontSize.cardBadge, fontFamily: fonts.outfitSemiBold, color: colors.crimson, letterSpacing: 1.5, textTransform: 'uppercase' },
    section: { gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    name: { fontFamily: fonts.manrope, fontSize: 22, color: colors.text, flex: 1 },
    qtyBadge: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 10, backgroundColor: colors.surface2,
        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    },
    qtyText: { color: colors.text2, fontFamily: fonts.outfitSemiBold, fontSize: 13 },
    sub: { color: colors.text2, fontFamily: fonts.outfit, fontSize: 14 },
    row3: {
        flexDirection: 'row', justifyContent: 'space-between',
        backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    },
    row2: {
        flexDirection: 'row', gap: 20,
        backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    },
    stat: { gap: 4 },
    statLabel: { fontSize: 9, letterSpacing: 1.5, color: colors.text2, fontFamily: fonts.outfitSemiBold },
    statVal: { fontSize: 14, color: colors.text, fontFamily: fonts.dmMono },
    detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    detailChip: {
        backgroundColor: colors.surface, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8, gap: 3,
    },
    detailChipVal: { color: colors.text, fontFamily: fonts.outfitMedium, fontSize: 13 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, backgroundColor: colors.surface,
        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    },
    chipText: { color: colors.text2, fontFamily: fonts.outfit, fontSize: 11 },
    notesBox: {
        backgroundColor: colors.surface, borderRadius: 12,
        padding: 14, gap: 6,
    },
    notesText: { color: colors.text, fontFamily: fonts.outfit, fontSize: 14, lineHeight: 20 },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-around',
        paddingHorizontal: 8, paddingTop: 12, paddingBottom: 28,
        backgroundColor: colors.bg,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    },
    actionBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
    actionLabel: { fontSize: 10, color: colors.text2, fontFamily: fonts.outfit },
    disabled: { opacity: 0.4 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', padding: 16, paddingBottom: 40 },
    optionSheet: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
    optionTitle: { fontFamily: fonts.manrope, fontSize: 15, color: colors.text2, textAlign: 'center', paddingTop: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    optionSubtitle: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2, textAlign: 'center', paddingBottom: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    optionBtnText: { fontFamily: fonts.outfitMedium, fontSize: 15, color: colors.text },
    sellSheet: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
    sellBody: { padding: 16, gap: 12 },
    sellLabel: { fontSize: 9, letterSpacing: 1.5, color: colors.text2, fontFamily: fonts.outfitSemiBold },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: { width: 36, height: 36, backgroundColor: colors.surface2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    qtyInput: { width: 56, height: 36, backgroundColor: colors.surface2, borderRadius: 8, textAlign: 'center', color: colors.text, fontFamily: fonts.dmMono, fontSize: 16 },
    qtyMax: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    priceInput: { flex: 1, height: 40, backgroundColor: colors.surface2, borderRadius: 8, paddingHorizontal: 12, color: colors.text, fontFamily: fonts.dmMono, fontSize: 15 },
    currencyBtn: { paddingHorizontal: 8, paddingVertical: 6 },
    currencyBtnText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2 },
    perUnitBtn: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.surface2, borderRadius: 8 },
    perUnitText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2 },
    sellConfirmBtn: { margin: 16, marginTop: 4, backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    sellConfirmText: { fontFamily: fonts.outfitSemiBold, fontSize: 15, color: '#0A1A0F' },
    labChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    moveEmptyText: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, fontStyle: 'italic' },
    premiumNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
    premiumNoteText: { fontFamily: fonts.outfit, fontSize: 12, color: colors.text2, flex: 1 },
    labChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    labChipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
    labChipText: { fontFamily: fonts.outfitMedium, fontSize: 13, color: colors.text2 },
    labChipTextActive: { color: colors.text },
});
