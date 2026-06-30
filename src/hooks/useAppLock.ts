import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useLockStore } from '../stores/lockStore';

export function useAppLock(): void {
    const lock = useLockStore(s => s.lock);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            if (nextState === 'background') lock();
        });

        return () => subscription.remove();
    }, [lock]);
}
