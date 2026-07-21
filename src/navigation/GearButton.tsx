import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import { hasUnseenBetaCenterContent } from '../domain/betaCenterSemantics';
import { BETA_CENTER_CONTENT_VERSION } from '../data/betaCenterContent';
import { COACH_MARK_IDS } from '../domain/coachMarkSemantics';
import { useMeasuredTarget } from '../hooks/useMeasuredTarget';
import { useCoachMark } from '../hooks/useCoachMark';
import { CoachMarkOverlay } from '../components/common/CoachMarkOverlay';
import { colors } from '../utils/theme';

export function GearButton() {
    const { t } = useTranslation();
    const lastSeenVersion = useSettingsStore(s => s.settings?.betaCenterLastSeenVersion ?? null);
    const hasUnseen = hasUnseenBetaCenterContent(lastSeenVersion, BETA_CENTER_CONTENT_VERSION);
    const gearTarget = useMeasuredTarget();
    const gearMark = useCoachMark(COACH_MARK_IDS.settingsGear);

    return (
        <>
            <Pressable
                ref={gearTarget.ref}
                onLayout={gearTarget.measure}
                onPress={() => useSettingsStore.getState().openSettings()}
                hitSlop={8}
                style={styles.wrap}
            >
                <Ionicons name="settings-outline" size={20} color={colors.text2} />
                {hasUnseen && <View style={styles.badge} />}
            </Pressable>
            <CoachMarkOverlay
                visible={!gearMark.hasSeen}
                targetRect={gearTarget.rect}
                text={t('coachMark.settingsGear')}
                onDismiss={gearMark.markSeen}
            />
        </>
    );
}

const styles = StyleSheet.create({
    wrap: { marginRight: 4 },
    badge: {
        position: 'absolute', top: -1, right: -1,
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: colors.violet, borderWidth: 1, borderColor: colors.bg,
    },
});
