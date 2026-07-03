import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

export function useScreenProtection(active: boolean, tag: string): void {
    useEffect(() => {
        if (!active) return;
        void ScreenCapture.preventScreenCaptureAsync(tag);
        return () => {
            void ScreenCapture.allowScreenCaptureAsync(tag);
        };
    }, [active, tag]);
}

// enableAppSwitcherProtectionAsync / disableAppSwitcherProtectionAsync are global on iOS —
// no built-in key system. We ref-count via a module-level Set so that multiple callers
// (App.tsx + LockScreen + PIN modals) can coexist safely:
//   - enable fires only when the Set goes from empty → non-empty
//   - disable fires only when the Set goes from non-empty → empty
// This prevents a modal unmount from cancelling a still-active global protection.
const _appSwitcherTags = new Set<string>();

function _syncAppSwitcher(): void {
    if (Platform.OS !== 'ios') return;
    if (_appSwitcherTags.size > 0) {
        void ScreenCapture.enableAppSwitcherProtectionAsync(1.0).catch(() => {});
    } else {
        void ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    }
}

export function useAppSwitcherProtection(active: boolean, tag: string): void {
    useEffect(() => {
        if (Platform.OS !== 'ios') return;
        if (active) {
            _appSwitcherTags.add(tag);
        } else {
            _appSwitcherTags.delete(tag);
        }
        _syncAppSwitcher();
        return () => {
            _appSwitcherTags.delete(tag);
            _syncAppSwitcher();
        };
    }, [active, tag]);
}
