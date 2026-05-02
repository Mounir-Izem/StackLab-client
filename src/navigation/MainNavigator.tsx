import { Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../stores/settingsStore';
import type { MainTabParamList } from './types';

function GearButton() {
    return (
        <Pressable onPress={() => useSettingsStore.getState().openSettings()} hitSlop={8} style={{ marginRight: 4 }}>
            <Ionicons name="settings-outline" size={20} color="#00FF75" />
        </Pressable>
    );
}
import { LabsStack } from './LabsStack';
import { SpotHome } from '../components/screens/SpotHome';
import { DashboardHome } from '../components/screens/DashboardHome';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const HEADER_OPTIONS = {
    headerStyle: { backgroundColor: '#2D1B5E' },
    headerTintColor: '#00FF75',
    headerTitleStyle: { fontFamily: 'Manrope_700Bold', fontSize: 17, color: '#00FF75' },
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
    return (
        <DashNav.Navigator screenOptions={{ ...HEADER_OPTIONS, headerRight: () => <GearButton /> }}>
            <DashNav.Screen name="DashHome" component={DashboardHome} options={{ title: 'Dashboard' }} />
        </DashNav.Navigator>
    );
}

export function MainNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#1A1030',
                    borderTopWidth: 1,
                    borderTopColor: '#9945FF',
                    elevation: 0,
                },
                tabBarActiveTintColor: '#00FF75',
                tabBarInactiveTintColor: '#888899',
                tabBarLabelStyle: { fontFamily: 'Outfit_500Medium', fontSize: 11 },
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
