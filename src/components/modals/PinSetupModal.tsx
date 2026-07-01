import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLockStore } from '../../stores/lockStore';
import { PinKeypad } from '../common/PinKeypad';
import { triggerLight, triggerMedium, triggerSuccess } from '../../utils/haptics';
import { colors, fonts } from '../../utils/theme';

const PIN_LENGTH = 6;
type Stage = 'warning' | 'create' | 'confirm';

type Props = {
    visible: boolean;
    purpose?: 'setup' | 'change';
    onClose: () => void;
    onDone: () => void;
};

export function PinSetupModal({ visible, purpose = 'setup', onClose, onDone }: Props) {
    const { t } = useTranslation();
    const setupPin = useLockStore(s => s.setupPin);
    const [stage, setStage] = useState<Stage>('warning');
    const [firstPin, setFirstPin] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    function reset() {
        setStage('warning');
        setFirstPin('');
        setPin('');
        setError(false);
    }

    function handleClose() {
        reset();
        onClose();
    }

    async function handleDigit(digit: string) {
        const next = pin + digit;
        setPin(next);
        triggerLight();
        if (next.length !== PIN_LENGTH) return;

        if (stage === 'create') {
            setFirstPin(next);
            setPin('');
            setStage('confirm');
            return;
        }

        if (next !== firstPin) {
            setError(true);
            triggerMedium();
            setPin('');
            setFirstPin('');
            setStage('create');
            setTimeout(() => setError(false), 600);
            return;
        }

        await setupPin(next);
        triggerSuccess();
        reset();
        onDone();
    }

    function handleBackspace() {
        setPin(p => p.slice(0, -1));
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
            <View style={styles.screen}>
                <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>
                    <Ionicons name="close" size={24} color={colors.text2} />
                </Pressable>

                {stage === 'warning' ? (
                    <View style={styles.warningBox}>
                        <Ionicons name="warning-outline" size={40} color={colors.orange} />
                        <Text style={styles.warningTitle}>{t('applock.setup.warningTitle')}</Text>
                        <Text style={styles.warningText}>{t('applock.setup.warningBody')}</Text>
                        {purpose === 'change' && (
                            <Text style={styles.warningNote}>{t('applock.setup.warningChangeNote')}</Text>
                        )}
                        <Pressable style={styles.continueBtn} onPress={() => setStage('create')}>
                            <Text style={styles.continueText}>{t('applock.setup.continue')}</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.pinBox}>
                        <Ionicons name="lock-closed-outline" size={36} color={colors.violet} />
                        <Text style={styles.title}>
                            {t(stage === 'create' ? 'applock.setup.createPin' : 'applock.setup.confirmPin')}
                        </Text>
                        <PinKeypad
                            pin={pin}
                            error={error}
                            onDigit={handleDigit}
                            onBackspace={handleBackspace}
                        />
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: 24 },
    closeBtn: { alignSelf: 'flex-end' },
    warningBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 16 },
    warningTitle: { fontFamily: fonts.manrope, fontSize: 19, color: colors.text, textAlign: 'center' },
    warningText: { fontFamily: fonts.outfit, fontSize: 14, color: colors.text2, textAlign: 'center', lineHeight: 21 },
    continueBtn: {
        marginTop: 12, backgroundColor: colors.violet, borderRadius: 14,
        paddingVertical: 16, paddingHorizontal: 32,
    },
    continueText: { fontFamily: fonts.outfitSemiBold, fontSize: 15, color: colors.text },
    pinBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
    title: { fontFamily: fonts.manrope, fontSize: 20, color: colors.text },
    warningNote: { fontFamily: fonts.outfit, fontSize: 13, color: colors.text2, textAlign: 'center', opacity: 0.8 },
});
