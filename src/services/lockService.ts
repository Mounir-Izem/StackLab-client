import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_KEY = 'stacklab_app_lock_pin';
const FAILED_ATTEMPTS_KEY = 'stacklab_app_lock_failed_attempts';
const LOCKED_UNTIL_KEY = 'stacklab_app_lock_locked_until';

// Escalating delay per failed attempt count — discourages brute-force without
// ever destroying data on its own. Below attempt 5, no delay at all.
const LOCKOUT_SCHEDULE_MS: Record<number, number> = {
    5: 30 * 1000,
    6: 60 * 1000,
    7: 5 * 60 * 1000,
    8: 15 * 60 * 1000,
    9: 30 * 60 * 1000,
};
const MAX_LOCKOUT_MS = 60 * 60 * 1000;

export type VerifyPinResult =
    | { success: true }
    | { success: false; failedAttempts: number; lockedUntil: number | null };

export const lockService = {
    async hasPin(): Promise<boolean> {
        const pin = await SecureStore.getItemAsync(PIN_KEY);
        return pin !== null;
    },

    async getPin(): Promise<string | null> {
        return SecureStore.getItemAsync(PIN_KEY);
    },

    async setPin(pin: string): Promise<void> {
        await SecureStore.setItemAsync(PIN_KEY, pin);
        await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
        await SecureStore.deleteItemAsync(LOCKED_UNTIL_KEY);
    },

    async clearPin(): Promise<void> {
        await SecureStore.deleteItemAsync(PIN_KEY);
        await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
        await SecureStore.deleteItemAsync(LOCKED_UNTIL_KEY);
    },

    async getFailedAttempts(): Promise<number> {
        const value = await SecureStore.getItemAsync(FAILED_ATTEMPTS_KEY);
        return value ? Number(value) : 0;
    },

    async getLockedUntil(): Promise<number | null> {
        const value = await SecureStore.getItemAsync(LOCKED_UNTIL_KEY);
        return value ? Number(value) : null;
    },

    async verifyPin(pin: string): Promise<VerifyPinResult> {
        const stored = await SecureStore.getItemAsync(PIN_KEY);
        if (stored !== null && pin === stored) {
            await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
            await SecureStore.deleteItemAsync(LOCKED_UNTIL_KEY);
            return { success: true };
        }

        const failedAttempts = (await lockService.getFailedAttempts()) + 1;
        await SecureStore.setItemAsync(FAILED_ATTEMPTS_KEY, String(failedAttempts));

        const delay = LOCKOUT_SCHEDULE_MS[failedAttempts] ?? (failedAttempts > 9 ? MAX_LOCKOUT_MS : 0);
        const lockedUntil = delay > 0 ? Date.now() + delay : null;
        if (lockedUntil !== null) {
            await SecureStore.setItemAsync(LOCKED_UNTIL_KEY, String(lockedUntil));
        }

        return { success: false, failedAttempts, lockedUntil };
    },

    async isBiometricAvailable(): Promise<boolean> {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) return false;
        return LocalAuthentication.isEnrolledAsync();
    },

    async authenticateWithBiometrics(): Promise<boolean> {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock StackLab',
            disableDeviceFallback: true,
        });
        return result.success;
    },
};
