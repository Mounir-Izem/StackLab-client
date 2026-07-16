import fr from '../i18n/locales/fr.json';
import en from '../i18n/locales/en.json';

// MainNavigator.tsx utilise t('dashboard.soldHistory') pour le titre de l'écran
// SoldHistory (QA/product correction — était codé en dur "Sold History", jamais
// traduit). Pas de test de rendu : monter un Navigator réel échoue dans cet
// environnement jest (NavigationContainer nécessite I18nManager natif
// indisponible) et le contourner exigerait de mocker 5+ stores Zustand pour un
// seul titre — disproportionné. Ce test couvre le risque réel (clé manquante ou
// mal traduite) ; le câblage `t('dashboard.soldHistory')` lui-même est vérifié
// par lecture directe du code + typecheck.
describe('dashboard.soldHistory', () => {
    test('résout en français', () => {
        expect(fr.dashboard.soldHistory).toBe('Historique des ventes');
    });

    test('résout en anglais', () => {
        expect(en.dashboard.soldHistory).toBe('Sold history');
    });
});

// Phase 10K — mêmes titres statiques ("Labs"/"Spot"/"Dashboard"/"Détail")
// jamais traduits, dans LabsStack.tsx (tab LabsHome) et MainNavigator.tsx
// (tabs + headers Spot/Dashboard/SoldItemDetail). Même limite de test que
// ci-dessus : pas de rendu de Navigator possible dans cet environnement,
// vérification par résolution i18n directe.
describe('titres de navigation Phase 10K', () => {
    test('labs.title résout dans les deux locales', () => {
        expect(fr.labs.title).toBe('Mes Labs');
        expect(en.labs.title).toBe('My Labs');
    });

    test('spot.title résout dans les deux locales', () => {
        expect(fr.spot.title).toBe('Prix Spot');
        expect(en.spot.title).toBe('Spot Prices');
    });

    test('dashboard.title résout dans les deux locales', () => {
        expect(fr.dashboard.title).toBe('Tableau de bord');
        expect(en.dashboard.title).toBe('Dashboard');
    });

    test('common.detail résout dans les deux locales', () => {
        expect(fr.common.detail).toBe('Détail');
        expect(en.common.detail).toBe('Detail');
    });
});
