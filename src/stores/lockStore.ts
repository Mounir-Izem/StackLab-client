import { create } from 'zustand';
import { lockService } from '../services/lockService';
import { backupService } from '../services/backupService';
import { useSettingsStore } from './settingsStore';

const AUTO_WIPE_THRESHOLD = 10;

interface LockStore {
    isLocked: boolean;
    failedAttempts: number;
    lockedUntil: number | null;
    error: string | null;

    checkInitialLockState: () => Promise<void>;
    lock: () => void;
    unlockWithPin: (pin: string) => Promise<boolean>;
    unlockWithBiometric: () => Promise<boolean>;
    verifyCurrentPin: (pin: string) => Promise<boolean>;
    setupPin: (pin: string) => Promise<void>;
    changePin: (pin: string) => Promise<void>;
    disableLock: () => Promise<void>;
}

export const useLockStore = create<LockStore>((set) => ({
    isLocked: false,
    failedAttempts: 0,
    lockedUntil: null,
    error: null,

    checkInitialLockState: async () => {
        const { appLockEnabled } = useSettingsStore.getState().settings ?? {};
        const hasPin = await lockService.hasPin();
        set({ isLocked: !!appLockEnabled && hasPin });
    },

    lock: () => {
        const { appLockEnabled } = useSettingsStore.getState().settings ?? {};
        if (appLockEnabled) set({ isLocked: true });
    },

    unlockWithPin: async (pin) => {
        const result = await lockService.verifyPin(pin);
        if (result.success) {
            set({ isLocked: false, failedAttempts: 0, lockedUntil: null, error: null });
            return true;
        }

        set({ failedAttempts: result.failedAttempts, lockedUntil: result.lockedUntil });

        const autoWipeEnabled = useSettingsStore.getState().settings?.appLockAutoWipeEnabled;
        if (autoWipeEnabled && result.failedAttempts >= AUTO_WIPE_THRESHOLD) {
            await backupService.deleteAllData();
            await lockService.clearPin();
            await useSettingsStore.getState().updateSettings({ appLockEnabled: false });
            set({ isLocked: false, failedAttempts: 0, lockedUntil: null, error: 'WIPED' });
            return false;
        }

        return false;
    },

    unlockWithBiometric: async () => {
        const success = await lockService.authenticateWithBiometrics();
        if (success) set({ isLocked: false, error: null });
        return success;
    },

    verifyCurrentPin: async (pin) => {
        const result = await lockService.verifyPin(pin);
        if (result.success) {
            set({ failedAttempts: 0, lockedUntil: null });
            return true;
        }
        set({ failedAttempts: result.failedAttempts, lockedUntil: result.lockedUntil });
        const autoWipeEnabled = useSettingsStore.getState().settings?.appLockAutoWipeEnabled;
        if (autoWipeEnabled && result.failedAttempts >= AUTO_WIPE_THRESHOLD) {
            await backupService.deleteAllData();
            await lockService.clearPin();
            await useSettingsStore.getState().updateSettings({ appLockEnabled: false });
            set({ isLocked: false, failedAttempts: 0, lockedUntil: null, error: 'WIPED' });
        }
        return false;
    },

    setupPin: async (pin) => {
        await lockService.setPin(pin);
        await useSettingsStore.getState().updateSettings({ appLockEnabled: true });
        set({ isLocked: false, failedAttempts: 0, lockedUntil: null });
    },

    changePin: async (pin) => {
        await lockService.setPin(pin);
    },

    disableLock: async () => {
        await lockService.clearPin();
        await useSettingsStore.getState().updateSettings({ appLockEnabled: false });
        set({ isLocked: false, failedAttempts: 0, lockedUntil: null });
    },
}));
