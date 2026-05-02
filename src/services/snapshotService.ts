import { snapshotRepository } from '../repositories/snapshotRepository';
import { itemRepository } from '../repositories/itemRepository';
import { calcFineWeightOz } from '../utils/calculations';
import { generateUUID } from '../utils/uuid';
import type { StackSnapshot } from '../types/snapshot.types';
import type { Currency } from '../types/settings.types';

export const snapshotService = {
    async captureIfNeeded(
        spotGold: number,
        spotSilver: number,
        currency: Currency,
    ): Promise<StackSnapshot | null> {
        const today = new Date().toISOString().split('T')[0];

        const existing = await snapshotRepository.findByDate(today);
        if (existing) return null;

        const activeItems = await itemRepository.findAll('active');
        if (activeItems.length === 0) return null;

        let totalValue = 0;
        let totalOzGold = 0;
        let totalOzSilver = 0;

        for (const item of activeItems) {
            const fineOz = calcFineWeightOz(item.weightOz, item.purity) * item.quantity;
            const spot = item.metal === 'gold' ? spotGold : spotSilver;
            totalValue += fineOz * spot;
            if (item.metal === 'gold') totalOzGold += fineOz;
            else totalOzSilver += fineOz;
        }

        return snapshotRepository.create({
            id: generateUUID(),
            date: today,
            totalValue,
            totalOzGold,
            totalOzSilver,
            spotGold,
            spotSilver,
            currency,
        });
    },
};
