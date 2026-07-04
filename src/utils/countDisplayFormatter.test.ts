import i18next from 'i18next';
import type { TFunction } from 'i18next';
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';
import { formatCountDisplay } from './countDisplayFormatter';
import type { CountDisplayModel } from '../domain/countSemantics';

// Instance i18next réelle chargée avec les vraies ressources fr/en du projet —
// pas de faux système de traduction, on teste contre les fichiers réels.
async function getT(lng: 'fr' | 'en'): Promise<TFunction> {
    const instance = i18next.createInstance();
    await instance.init({
        lng,
        fallbackLng: 'en',
        resources: {
            en: { translation: en },
            fr: { translation: fr },
        },
        interpolation: { escapeValue: false },
    });
    return instance.t;
}

describe('formatCountDisplay', () => {
    test('segments lots + units (pluriel)', async () => {
        const model: CountDisplayModel = {
            kind: 'segments',
            segments: [{ unit: 'lots', count: 2 }, { unit: 'units', count: 10 }],
        };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('2 lots · 10 unités');
        expect(formatCountDisplay(model, await getT('en'))).toBe('2 lots · 10 units');
    });

    test('segments lots + units (singulier)', async () => {
        const model: CountDisplayModel = {
            kind: 'segments',
            segments: [{ unit: 'lots', count: 1 }, { unit: 'units', count: 1 }],
        };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('1 lot · 1 unité');
        expect(formatCountDisplay(model, await getT('en'))).toBe('1 lot · 1 unit');
    });

    test('segment wishes (pluriel)', async () => {
        const model: CountDisplayModel = { kind: 'segments', segments: [{ unit: 'wishes', count: 3 }] };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('3 souhaits');
        expect(formatCountDisplay(model, await getT('en'))).toBe('3 wishes');
    });

    test('segment wishes (singulier)', async () => {
        const model: CountDisplayModel = { kind: 'segments', segments: [{ unit: 'wishes', count: 1 }] };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('1 souhait');
        expect(formatCountDisplay(model, await getT('en'))).toBe('1 wish');
    });

    test('segments sales + soldUnits (pluriel)', async () => {
        const model: CountDisplayModel = {
            kind: 'segments',
            segments: [{ unit: 'sales', count: 2 }, { unit: 'soldUnits', count: 25 }],
        };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('2 ventes · 25 unités vendues');
        expect(formatCountDisplay(model, await getT('en'))).toBe('2 sales · 25 sold units');
    });

    test('segments sales + soldUnits (singulier)', async () => {
        const model: CountDisplayModel = {
            kind: 'segments',
            segments: [{ unit: 'sales', count: 1 }, { unit: 'soldUnits', count: 1 }],
        };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('1 vente · 1 unité vendue');
        expect(formatCountDisplay(model, await getT('en'))).toBe('1 sale · 1 sold unit');
    });

    test('empty trashEmpty', async () => {
        const model: CountDisplayModel = { kind: 'empty', emptyKind: 'trashEmpty' };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('Vide');
        expect(formatCountDisplay(model, await getT('en'))).toBe('Empty');
    });

    test('segment objects (pluriel)', async () => {
        const model: CountDisplayModel = { kind: 'segments', segments: [{ unit: 'objects', count: 4 }] };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('4 objets');
        expect(formatCountDisplay(model, await getT('en'))).toBe('4 objects');
    });

    test('segment objects (singulier)', async () => {
        const model: CountDisplayModel = { kind: 'segments', segments: [{ unit: 'objects', count: 1 }] };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('1 objet');
        expect(formatCountDisplay(model, await getT('en'))).toBe('1 object');
    });

    // Cas issus de la règle "lotCount === unitCount" / "saleCount === soldUnitCount"
    // (countSemantics ne produit plus qu'un seul segment dans ce cas) — le
    // formatter doit rendre ce segment seul correctement, singulier et pluriel.
    test('segment units seul, singulier (lotCount === unitCount)', async () => {
        const model: CountDisplayModel = { kind: 'segments', segments: [{ unit: 'units', count: 1 }] };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('1 unité');
        expect(formatCountDisplay(model, await getT('en'))).toBe('1 unit');
    });

    test('segment units seul, pluriel (lotCount === unitCount)', async () => {
        const model: CountDisplayModel = { kind: 'segments', segments: [{ unit: 'units', count: 3 }] };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('3 unités');
        expect(formatCountDisplay(model, await getT('en'))).toBe('3 units');
    });

    test('segments lots + units, lot singulier + units pluriel (différents)', async () => {
        const model: CountDisplayModel = {
            kind: 'segments',
            segments: [{ unit: 'lots', count: 1 }, { unit: 'units', count: 10 }],
        };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('1 lot · 10 unités');
        expect(formatCountDisplay(model, await getT('en'))).toBe('1 lot · 10 units');
    });

    test('segment sales seul (saleCount === soldUnitCount)', async () => {
        const model: CountDisplayModel = { kind: 'segments', segments: [{ unit: 'sales', count: 2 }] };
        expect(formatCountDisplay(model, await getT('fr'))).toBe('2 ventes');
        expect(formatCountDisplay(model, await getT('en'))).toBe('2 sales');
    });
});
