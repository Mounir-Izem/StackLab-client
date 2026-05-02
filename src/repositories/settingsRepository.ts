import { getDatabase } from '../db/database';
import type { Settings, Currency, WeightUnit, SubscriptionStatus } from '../types/settings.types';

type RawSettings = {
    currency: string;
    weight_unit: string;
    cloud_sync: number;
    auto_backup_enabled: number;
    backup_reminder: number;
    hide_values: number;
    subscription_status: string;
    subscription_expiry: string | null;
    onboarding_completed: number;
    onboarding_step: number;
    updated_at: string;
};

function mapRowToSettings(row: RawSettings): Settings {
    return {
        currency: row.currency as Currency,
        weightUnit: row.weight_unit as WeightUnit,
        cloudSync: row.cloud_sync === 1,
        autoBackupEnabled: row.auto_backup_enabled === 1,
        backupReminder: row.backup_reminder === 1,
        hideValues: row.hide_values === 1,
        subscriptionStatus: row.subscription_status as SubscriptionStatus,
        subscriptionExpiry: row.subscription_expiry,
        onboardingCompleted: row.onboarding_completed === 1,
        onboardingStep: row.onboarding_step as 0 | 1 | 2 | 3,
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
        if (data.hideValues !== undefined) { fields.push('hide_values = ?'); values.push(data.hideValues ? 1 : 0); }
        if (data.subscriptionStatus !== undefined) { fields.push('subscription_status = ?'); values.push(data.subscriptionStatus); }
        if (data.subscriptionExpiry !== undefined) { fields.push('subscription_expiry = ?'); values.push(data.subscriptionExpiry); }
        if (data.onboardingCompleted !== undefined) { fields.push('onboarding_completed = ?'); values.push(data.onboardingCompleted ? 1 : 0); }
        if (data.onboardingStep !== undefined) { fields.push('onboarding_step = ?'); values.push(data.onboardingStep); }

        fields.push('updated_at = ?');
        values.push(now);

        await db.runAsync(
            `UPDATE settings SET ${fields.join(', ')} WHERE id = 1`,
            values
        );
        return this.get();
    },
};
