import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { SoldItemDetailScreen } from './SoldItemDetailScreen';
import { initI18n } from '../../i18n';
import type { Item } from '../../types/item.types';

// Mock minimal — navigation, route params, stores, icônes. Aucun rendu réel de
// react-navigation nécessaire (SoldItemDetailScreen ne consomme que les
// hooks useRoute/useNavigation, jamais un NavigationContainer réel).
jest.mock('@react-navigation/native', () => ({
    useRoute: () => ({ params: { itemId: 'item-1' } }),
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));
// @expo/vector-icons charge expo-font/expo-asset (non installé, hors sujet
// pour ce test de contenu texte) — stub minimal, aucune icône à vérifier ici.
jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

let mockSoldItems: Item[] = [];
jest.mock('../../stores/itemStore', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useItemStore: (selector: (s: any) => unknown) => selector({
        soldItems: mockSoldItems,
        deleteItem: jest.fn(),
        loadSoldItems: jest.fn(),
    }),
}));
jest.mock('../../stores/settingsStore', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useSettingsStore: (selector: (s: any) => unknown) => selector({
        settings: { currency: 'USD', weightUnit: 'oz' },
    }),
}));
jest.mock('../../stores/spotStore', () => ({
    useSpotStore: () => ({ spot: null, rates: {} }),
}));

const makeSoldItem = (overrides: Partial<Item> = {}): Item => ({
    id: 'item-1', labId: 'lab-1', deckId: null, status: 'sold',
    name: 'Maple Leaf', familyKey: 'maple-leaf-silver', metal: 'silver',
    mintName: null, shape: 'coin', shapeDescription: null,
    weightOz: 1.0, weightUnitInput: 'oz', purity: 0.9999,
    year: 2022, strikeFinish: null, condition: null, features: [], packaging: [],
    gradingCompany: null, gradeValue: null, notes: null, quantity: 1,
    purchasePrice: 30, purchasePriceBasis: 'lotTotal', purchaseCurrency: 'USD', purchaseExchangeRate: null, purchaseDate: '2026-01-01',
    observedPrice: null, observedPriceBasis: null, observedCurrency: null, observedPriceDate: null,
    soldDate: '2026-02-01', soldPrice: 40, soldPriceBasis: 'lotTotal', soldCurrency: 'USD',
    photoUrl: null, location: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

function renderedText(tree: ReactTestRenderer): string {
    return tree.root.findAllByType(Text)
        .map(node => (Array.isArray(node.props.children) ? node.props.children.join('') : (node.props.children ?? '')))
        .join(' | ');
}

beforeAll(async () => {
    await initI18n('fr');
});

test('ne montre pas le libellé générique "Valeur fonte" (melt live) sur un soldRecord', () => {
    mockSoldItems = [makeSoldItem()];
    let tree!: ReactTestRenderer;
    act(() => { tree = TestRenderer.create(<SoldItemDetailScreen />); });
    expect(renderedText(tree)).not.toContain('Valeur fonte');
});

test('affiche le P&L réalisé quand achat et vente sont complets', () => {
    mockSoldItems = [makeSoldItem({ purchasePrice: 30, soldPrice: 40 })];
    let tree!: ReactTestRenderer;
    act(() => { tree = TestRenderer.create(<SoldItemDetailScreen />); });
    expect(renderedText(tree)).toContain('P&L réalisé');
});
