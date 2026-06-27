import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type OnboardingStackParamList = {
    OnboardingLogo: undefined;
    OnboardingStep1: undefined;
    CreateItem: { labId: string; deckId: string | null };
    OnboardingBackupPrompt: undefined;
};

export type OnboardingStackScreenProps<T extends keyof OnboardingStackParamList> =
    NativeStackScreenProps<OnboardingStackParamList, T>;

export type LabsStackParamList = {
    LabsHome: undefined;
    LabDetail: { labId: string };
    DeckDetail: { deckId: string; labId: string };
    ItemDetail: { itemId: string };
    CreateItem: { labId: string; deckId: string | null };
    EditItem: { itemId: string };
    Modifier: { labId: string; deckId: string | null };
    TrashModifier: { labId: string };
};


export type MainTabParamList = {
    LabsTab: undefined;
    SpotTab: undefined;
    DashboardTab: undefined;
};

export type LabsStackScreenProps<T extends keyof LabsStackParamList> =
    NativeStackScreenProps<LabsStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
    BottomTabScreenProps<MainTabParamList, T>;
