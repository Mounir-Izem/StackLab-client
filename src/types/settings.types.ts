export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
export type WeightUnit = 'oz' | 'g' | 'kg';
export type SubscriptionStatus = 'free' | 'monthly' | 'annual';

export type Settings = {
    currency: Currency;
    weightUnit: WeightUnit;
    cloudSync: boolean;
    autoBackupEnabled: boolean;
    backupReminder: boolean;
    hideValues: boolean;
    subscriptionStatus: SubscriptionStatus;
    subscriptionExpiry: string | null;
    onboardingCompleted: boolean;
    onboardingStep: 0 | 1 | 2 | 3;
    updatedAt: string;
};