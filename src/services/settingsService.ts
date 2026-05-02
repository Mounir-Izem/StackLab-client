import { settingsRepository } from '../repositories/settingsRepository';
import type { Settings } from '../types/settings.types';

export const settingsService = {
    async get(): Promise<Settings> {
        return settingsRepository.get();
    },

    async update(data: Partial<Omit<Settings, 'updatedAt'>>): Promise<Settings> {
        return settingsRepository.update(data);
    },
};
