import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { useBackupStore } from '../stores/backupStore';

const MIN_INTERVAL_MS = 10 * 1000;

export function useAutoBackup(): void {
    const runAutoBackup = useBackupStore(s => s.runAutoBackup);
    const isRunningRef = useRef(false);
    const lastRunAtRef = useRef(0);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            if (nextState !== 'background') return;
            if (!useSettingsStore.getState().settings?.autoBackupEnabled) return;
            if (isRunningRef.current) return;
            if (Date.now() - lastRunAtRef.current < MIN_INTERVAL_MS) return;

            isRunningRef.current = true;
            lastRunAtRef.current = Date.now();
            runAutoBackup().finally(() => { isRunningRef.current = false; });
        });

        return () => subscription.remove();
    }, [runAutoBackup]);
}
