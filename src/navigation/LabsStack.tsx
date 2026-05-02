import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSettingsStore } from '../stores/settingsStore';
import type { LabsStackParamList } from './types';
import { LabsHome } from '../components/screens/LabsHome';
import { LabDetail } from '../components/screens/LabDetail';
import { DeckDetail } from '../components/screens/DeckDetail';
import { ItemDetail } from '../components/screens/ItemDetail';
import { CreateItemFlow } from '../components/screens/CreateItemFlow';
import { EditItemFlow } from '../components/screens/EditItemFlow';
import { ModifierFlow } from '../components/screens/ModifierFlow';
import { TrashModifierFlow } from '../components/screens/TrashModifierFlow';


const Stack = createNativeStackNavigator<LabsStackParamList>();

const HEADER_OPTIONS = {
    headerStyle: { backgroundColor: '#2D1B5E' },
    headerTintColor: '#00FF75',
    headerTitleStyle: { fontFamily: 'Manrope_700Bold', fontSize: 17, color: '#00FF75' },
    headerTitleAlign: 'center' as const,
    headerShadowVisible: false,
} as const;

function GearButton() {
    return (
        <Pressable onPress={() => useSettingsStore.getState().openSettings()} hitSlop={8} style={{ marginRight: 4 }}>
            <Ionicons name="settings-outline" size={20} color="#00FF75" />
        </Pressable>
    );
}

export function LabsStack() {
    return (
        <Stack.Navigator screenOptions={HEADER_OPTIONS}>
            <Stack.Screen
                name="LabsHome"
                component={LabsHome}
                options={{ title: 'Labs', headerRight: () => <GearButton /> }}
            />
            <Stack.Screen name="LabDetail" component={LabDetail} options={{ title: 'Lab' }} />
            <Stack.Screen name="DeckDetail" component={DeckDetail} options={{ title: 'Deck' }} />
            <Stack.Screen name="ItemDetail" component={ItemDetail} options={{ title: 'Item' }} />
            <Stack.Screen
                name="CreateItem"
                component={CreateItemFlow}
                options={{ presentation: 'fullScreenModal', headerShown: false }}
            />
            <Stack.Screen
                name="EditItem"
                component={EditItemFlow}
                options={{ presentation: 'fullScreenModal', headerShown: false }}
            />

            <Stack.Screen
                name="Modifier"
                component={ModifierFlow}
                options={{ presentation: 'fullScreenModal', headerShown: false }}
            />
            <Stack.Screen
                name="TrashModifier"
                component={TrashModifierFlow}
                options={{ presentation: 'fullScreenModal', headerShown: false }}
            />
        </Stack.Navigator>
    );
}
