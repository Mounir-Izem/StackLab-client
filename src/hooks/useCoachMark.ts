import { useSettingsStore } from '../stores/settingsStore';
import { hasSeenCoachMark, markCoachMarkSeen } from '../domain/coachMarkSemantics';
import type { CoachMarkId } from '../domain/coachMarkSemantics';

export function useCoachMark(markId: CoachMarkId) {
    const seenIds = useSettingsStore(s => s.settings?.seenCoachMarks ?? []);
    const updateSettings = useSettingsStore(s => s.updateSettings);

    const hasSeen = hasSeenCoachMark(seenIds, markId);

    function markSeen() {
        if (hasSeen) return;
        updateSettings({ seenCoachMarks: markCoachMarkSeen(seenIds, markId) });
    }

    return { hasSeen, markSeen };
}
