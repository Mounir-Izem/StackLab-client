import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSettingsStore } from '../stores/settingsStore';
import { MainNavigator } from './MainNavigator';
import { OnboardingStack } from './OnboardingStack';
import { SettingsModal } from '../components/modals/SettingsModal';
import { navigationRef } from './navigationRef';

export function RootNavigator() {
    const settings = useSettingsStore(s => s.settings);

    if (!settings) return null;

    return (
        <NavigationContainer ref={navigationRef} key={settings.onboardingCompleted ? 'main' : 'onboarding'}>
            {settings.onboardingCompleted ? (
                <>
                    <MainNavigator />
                    <SettingsModal />
                </>
            ) : (
                <OnboardingStack />
            )}
        </NavigationContainer>
    );
}
