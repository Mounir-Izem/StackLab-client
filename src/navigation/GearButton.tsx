import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../stores/settingsStore';
import { hasUnseenBetaCenterContent } from '../domain/betaCenterSemantics';
import { BETA_CENTER_CONTENT_VERSION } from '../data/betaCenterContent';
import { colors } from '../utils/theme';

export function GearButton() {
    const lastSeenVersion = useSettingsStore(s => s.settings?.betaCenterLastSeenVersion ?? null);
    const hasUnseen = hasUnseenBetaCenterContent(lastSeenVersion, BETA_CENTER_CONTENT_VERSION);

    return (
        <Pressable onPress={() => useSettingsStore.getState().openSettings()} hitSlop={8} style={styles.wrap}>
            <Ionicons name="settings-outline" size={20} color={colors.text2} />
            {hasUnseen && <View style={styles.badge} />}
        </Pressable>
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
