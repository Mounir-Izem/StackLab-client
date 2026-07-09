import { Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import { colors, fonts } from '../utils/theme';
import type { MainTabParamList } from './types';
import { LabsStack } from './LabsStack';
import { SpotHome } from '../components/screens/SpotHome';
import { DashboardHome } from '../components/screens/DashboardHome';
import { SoldHistoryScreen } from '../components/screens/SoldHistoryScreen';
import { SoldItemDetailScreen } from '../components/screens/SoldItemDetailScreen';

function GearButton() {
    return (
        <Pressable onPress={() => useSettingsStore.getState().openSettings()} hitSlop={8} style={{ marginRight: 4 }}>
            <Ionicons name="settings-outline" size={20} color={colors.text2} />
        </Pressable>
    );
}

const Tab = createBottomTabNavigator<MainTabParamList>();

export const HEADER_OPTIONS = {
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.text,
    headerTitleStyle: { fontFamily: fonts.manrope, fontSize: 17, color: colors.text },
    headerTitleAlign: 'center' as const,
    headerShadowVisible: false,
} as const;

const SpotNav = createNativeStackNavigator();
function SpotStack() {
    return (
        <SpotNav.Navigator screenOptions={{ ...HEADER_OPTIONS, headerRight: () => <GearButton /> }}>
            <SpotNav.Screen name="SpotHome" component={SpotHome} options={{ title: 'Spot' }} />
        </SpotNav.Navigator>
    );
}

const DashNav = createNativeStackNavigator();
function DashStack() {
    // QA/product correction — "Sold History" était codé en dur (jamais traduit).
    // dashboard.soldHistory existe déjà dans les deux locales, réutilisée telle
    // quelle. Les autres titres de cet écran restent inchangés (hors périmètre).
    const { t } = useTranslation();
    return (
        <DashNav.Navigator screenOptions={{ ...HEADER_OPTIONS, headerRight: () => <GearButton /> }}>
            <DashNav.Screen name="DashHome" component={DashboardHome} options={{ title: 'Dashboard' }} />
            <DashNav.Screen name="SoldHistory" component={SoldHistoryScreen} options={{ title: t('dashboard.soldHistory') }} />
            <DashNav.Screen name="SoldItemDetail" component={SoldItemDetailScreen} options={{ title: 'Détail' }} />
        </DashNav.Navigator>
    );
}

export function MainNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.bg,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.06)',
                    elevation: 0,
                },
                tabBarActiveTintColor: colors.violet,
                tabBarInactiveTintColor: colors.text2,
                tabBarLabelStyle: { fontFamily: fonts.outfitMedium, fontSize: 11 },
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'LabsTab') return <Ionicons name="layers-outline" size={size} color={color} />;
                    if (route.name === 'SpotTab') return <Ionicons name="flame-outline" size={size} color={color} />;
                    return <Ionicons name="pie-chart-outline" size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="LabsTab" component={LabsStack} options={{ title: 'Labs' }} />
            <Tab.Screen name="SpotTab" component={SpotStack} options={{ title: 'Spot' }} />
            <Tab.Screen name="DashboardTab" component={DashStack} options={{ title: 'Dashboard' }} />
        </Tab.Navigator>
    );
}
