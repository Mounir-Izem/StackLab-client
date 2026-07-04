import type { TFunction } from 'i18next';
import type { CountDisplayModel, CountUnit } from '../domain/countSemantics';

const UNIT_I18N_KEY: Record<CountUnit, string> = {
    lots: 'common.lots',
    units: 'common.units',
    wishes: 'common.wishes',
    sales: 'common.sales',
    soldUnits: 'common.soldUnits',
    objects: 'common.objects',
};

// Traduit un CountDisplayModel (modèle sémantique pur, domain) en texte
// affichable — pluriel + jointure uniquement. Aucune règle métier ici,
// déjà tranchée par countSemantics.ts.
export function formatCountDisplay(model: CountDisplayModel, t: TFunction): string {
    if (model.kind === 'empty') {
        return t('labs.trashEmpty');
    }
    return model.segments
        .map(segment => t(UNIT_I18N_KEY[segment.unit], { count: segment.count }))
        .join(' · ');
}
