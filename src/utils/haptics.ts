import * as Haptics from 'expo-haptics';

export async function triggerLight() {
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }
}

export async function triggerMedium() {
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { }
}

export async function triggerSuccess() {
    try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { }
}
