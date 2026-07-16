import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import { colors, fonts } from '../utils/theme';
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
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.text,
    headerTitleStyle: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text },
    headerTitleAlign: 'center' as const,
    headerShadowVisible: false,
} as const;

function GearButton() {
    return (
        <Pressable onPress={() => useSettingsStore.getState().openSettings()} hitSlop={8} style={{ marginRight: 4 }}>
            <Ionicons name="settings-outline" size={20} color={colors.text2} />
        </Pressable>
    );
}

export function LabsStack() {
    const { t } = useTranslation();
    return (
        <Stack.Navigator screenOptions={HEADER_OPTIONS}>
            <Stack.Screen
                name="LabsHome"
                component={LabsHome}
                // Phase 10K — seul titre statique réellement visible de cette stack :
                // LabDetail/DeckDetail/ItemDetail écrasent le leur dynamiquement
                // (setOptions synchrone avant peinture, jamais visible en pratique).
                options={{ title: t('labs.title'), headerRight: () => <GearButton /> }}
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
