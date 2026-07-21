export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
export type WeightUnit = 'oz' | 'g' | 'kg';
export type SubscriptionStatus = 'free' | 'monthly' | 'annual';
export type AppLanguage = 'system' | 'en' | 'fr';

export type Settings = {
    currency: Currency;
    weightUnit: WeightUnit;
    cloudSync: boolean;
    autoBackupEnabled: boolean;
    backupReminder: boolean;
    backupBannerDismissed: boolean;
    lastBackupAt: string | null;
    appLockEnabled: boolean;
    appLockAutoWipeEnabled: boolean;
    appLockPromptShown: boolean;
    screenProtectionEnabled: boolean;
    hideValues: boolean;
    subscriptionStatus: SubscriptionStatus;
    subscriptionExpiry: string | null;
    onboardingCompleted: boolean;
    onboardingStep: 0 | 1;
    language: AppLanguage;
    betaCenterLastSeenVersion: string | null;
    seenCoachMarks: string[];
    updatedAt: string;
};