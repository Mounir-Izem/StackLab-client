import { getDatabase } from '../db/database';
import type { Settings, Currency, WeightUnit, SubscriptionStatus, AppLanguage } from '../types/settings.types';

type RawSettings = {
    currency: string;
    weight_unit: string;
    cloud_sync: number;
    auto_backup_enabled: number;
    backup_reminder: number;
    backup_banner_dismissed: number;
    hide_values: number;
    subscription_status: string;
    subscription_expiry: string | null;
    onboarding_completed: number;
    onboarding_step: number;
    last_backup_at: string | null;
    app_lock_enabled: number;
    app_lock_auto_wipe_enabled: number;
    app_lock_prompt_shown: number;
    screen_protection_enabled: number;
    language: string | null;
    beta_center_last_seen_version: string | null;
    updated_at: string;
};

function mapRowToSettings(row: RawSettings): Settings {
    return {
        currency: row.currency as Currency,
        weightUnit: row.weight_unit as WeightUnit,
        cloudSync: row.cloud_sync === 1,
        autoBackupEnabled: row.auto_backup_enabled === 1,
        backupReminder: row.backup_reminder === 1,
        backupBannerDismissed: row.backup_banner_dismissed === 1,
        hideValues: row.hide_values === 1,
        subscriptionStatus: row.subscription_status as SubscriptionStatus,
        subscriptionExpiry: row.subscription_expiry,
        onboardingCompleted: row.onboarding_completed === 1,
        onboardingStep: row.onboarding_step as 0 | 1,
        lastBackupAt: row.last_backup_at,
        appLockEnabled: row.app_lock_enabled === 1,
        appLockAutoWipeEnabled: row.app_lock_auto_wipe_enabled === 1,
        appLockPromptShown: row.app_lock_prompt_shown === 1,
        screenProtectionEnabled: row.screen_protection_enabled === 1,
        language: (row.language === 'en' || row.language === 'fr' ? row.language : 'system') as AppLanguage,
        betaCenterLastSeenVersion: row.beta_center_last_seen_version,
        updatedAt: row.updated_at,
    };
}

export const settingsRepository = {
    async get(): Promise<Settings> {
        const db = getDatabase();
        const row = await db.getFirstAsync<RawSettings>(
            'SELECT * FROM settings WHERE id = 1'
        );
        if (!row) {
            throw new Error('SETTINGS_NOT_FOUND');
        }
        return mapRowToSettings(row);
    },

    async update(data: Partial<Omit<Settings, 'updatedAt'>>): Promise<Settings> {
        const db = getDatabase();
        const now = new Date().toISOString();
        const fields: string[] = [];
        const values: (string | number | null)[] = [];


        if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }
        if (data.weightUnit !== undefined) { fields.push('weight_unit = ?'); values.push(data.weightUnit); }
        if (data.cloudSync !== undefined) { fields.push('cloud_sync = ?'); values.push(data.cloudSync ? 1 : 0); }
        if (data.autoBackupEnabled !== undefined) { fields.push('auto_backup_enabled = ?'); values.push(data.autoBackupEnabled ? 1 : 0); }
        if (data.backupReminder !== undefined) { fields.push('backup_reminder = ?'); values.push(data.backupReminder ? 1 : 0); }
        if (data.backupBannerDismissed !== undefined) { fields.push('backup_banner_dismissed = ?'); values.push(data.backupBannerDismissed ? 1 : 0); }
        if (data.hideValues !== undefined) { fields.push('hide_values = ?'); values.push(data.hideValues ? 1 : 0); }
        if (data.subscriptionStatus !== undefined) { fields.push('subscription_status = ?'); values.push(data.subscriptionStatus); }
        if (data.subscriptionExpiry !== undefined) { fields.push('subscription_expiry = ?'); values.push(data.subscriptionExpiry); }
        if (data.onboardingCompleted !== undefined) { fields.push('onboarding_completed = ?'); values.push(data.onboardingCompleted ? 1 : 0); }
        if (data.onboardingStep !== undefined) { fields.push('onboarding_step = ?'); values.push(data.onboardingStep); }
        if (data.lastBackupAt !== undefined) { fields.push('last_backup_at = ?'); values.push(data.lastBackupAt); }
        if (data.appLockEnabled !== undefined) { fields.push('app_lock_enabled = ?'); values.push(data.appLockEnabled ? 1 : 0); }
        if (data.appLockAutoWipeEnabled !== undefined) { fields.push('app_lock_auto_wipe_enabled = ?'); values.push(data.appLockAutoWipeEnabled ? 1 : 0); }
        if (data.appLockPromptShown !== undefined) { fields.push('app_lock_prompt_shown = ?'); values.push(data.appLockPromptShown ? 1 : 0); }
        if (data.screenProtectionEnabled !== undefined) { fields.push('screen_protection_enabled = ?'); values.push(data.screenProtectionEnabled ? 1 : 0); }
        if (data.language !== undefined) { fields.push('language = ?'); values.push(data.language); }
        if (data.betaCenterLastSeenVersion !== undefined) { fields.push('beta_center_last_seen_version = ?'); values.push(data.betaCenterLastSeenVersion); }

        fields.push('updated_at = ?');
        values.push(now);

        await db.runAsync(
            `UPDATE settings SET ${fields.join(', ')} WHERE id = 1`,
            values
        );
        return this.get();
    },
};
