import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Manrope_700Bold } from '@expo-google-fonts/manrope';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { initDatabase } from './src/db/database';
import { labService } from './src/services/labService';
import { useSettingsStore } from './src/stores/settingsStore';
import { useSpotPrice } from './src/hooks/useSpotPrice';
import { useAutoBackup } from './src/hooks/useAutoBackup';
import { useAppLock } from './src/hooks/useAppLock';
import { useLockStore } from './src/stores/lockStore';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LockScreen } from './src/components/screens/LockScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function App() {
  useSpotPrice();
  useAutoBackup();
  useAppLock();
  const isLocked = useLockStore(s => s.isLocked);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Manrope_700Bold,
    DMMono_500Medium,
  });

  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync('light');
    }
    initDatabase()
      .then(() => labService.ensureSystemLabs())
      .then(() => useSettingsStore.getState().loadSettings())
      .then(() => useLockStore.getState().checkInitialLockState())
      .then(() => setDbReady(true))
      .catch((e: unknown) => console.error('[DB INIT ERROR]', e));
  }, []);

  useEffect(() => {
    if (fontsLoaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#13111A' }}>
      <SafeAreaProvider>
        <RootNavigator />
        {isLocked && <LockScreen />}
        <StatusBar style="light" translucent backgroundColor="transparent" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
