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
