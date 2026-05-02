import { NavigationContainer } from '@react-navigation/native';
import { MainNavigator } from './MainNavigator';
import { SettingsModal } from '../components/modals/SettingsModal';

export function RootNavigator() {
    return (
        <NavigationContainer>
            <MainNavigator />
            <SettingsModal />
        </NavigationContainer>
    );
}
