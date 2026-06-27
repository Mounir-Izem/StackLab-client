import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainTabParamList } from './types';

export const navigationRef = createNavigationContainerRef<MainTabParamList>();

export function resetToLabsHome(): void {
    if (!navigationRef.isReady()) return;
    navigationRef.reset({
        index: 0,
        routes: [{
            name: 'LabsTab',
            state: { index: 0, routes: [{ name: 'LabsHome' }] },
        }],
    });
}
