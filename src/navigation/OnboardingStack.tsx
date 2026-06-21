import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingLogoScreen } from '../components/screens/OnboardingLogoScreen';
import { OnboardingStep1 } from '../components/screens/OnboardingStep1';
import { OnboardingBackupPrompt } from '../components/screens/OnboardingBackupPrompt';
import { CreateItemFlow } from '../components/screens/CreateItemFlow';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false, animation: 'fade' }}
        >
            <Stack.Screen name="OnboardingLogo" component={OnboardingLogoScreen} />
            <Stack.Screen name="OnboardingStep1" component={OnboardingStep1} />
            <Stack.Screen
                name="CreateItem"
                component={CreateItemFlow}
                options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="OnboardingBackupPrompt" component={OnboardingBackupPrompt} />
        </Stack.Navigator>
    );
}
