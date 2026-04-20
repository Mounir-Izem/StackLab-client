import { Currency } from './settings.types';

export type ItemStatus = 'active' | 'sold' | 'wishlist';
export type ItemMetal = 'gold' | 'silver';
export type ItemShape = 'coin' | 'bar' | 'token' | 'bust' | 'custom';
export type ItemWeightUnit = 'oz' | 'g' | 'kg';

export type StrikeFinish =
    | 'BU'
    | 'proof'
    | 'reverse_proof'
    | 'antique'
    | 'matte'
    | 'specimen'
    | 'burnished'
    | 'proof_like'
    | 'unknown';

export type ItemFeature =
    | 'privy'
    | 'colorized'
    | 'gilded'
    | 'high_relief'
    | 'ultra_high_relief'
    | 'hologram'
    | 'enamel'
    | 'ruthenium'
    | 'plated'
    | 'insert'
    | 'numbered_certificate';

export type ItemPackaging =
    | 'sealed'
    | 'capsule'
    | 'mint_box'
    | 'with_certificate'
    | 'raw';

export type ItemCondition =
    | 'uncirculated'
    | 'circulated'
    | 'damaged'
    | 'unknown';

export type Item = {
    id: string;
    labId: string;
    deckId: string | null;
    status: ItemStatus;
    name: string;
    familyKey: string;
    metal: ItemMetal;
    mintName: string | null;
    shape: ItemShape;
    shapeDescription: string | null;
    weightOz: number;
    weightUnitInput: ItemWeightUnit;
    purity: number;
    year: number | null;
    strikeFinish: StrikeFinish | null;
    condition: ItemCondition | null;
    features: ItemFeature[];
    packaging: ItemPackaging[];
    gradingCompany: string | null;
    gradeValue: string | null;
    notes: string | null;
    quantity: number;
    purchasePrice: number | null;
    purchaseCurrency: Currency | null;
    purchaseExchangeRate: number | null;
    purchaseDate: string | null;
    observedPrice: number | null;
    observedCurrency: Currency | null;
    observedPriceDate: string | null;
    soldDate: string | null;
    soldPrice: number | null;
    soldCurrency: Currency | null;
    photoUrl: string | null;
    location: string | null;
    createdAt: string;
    updatedAt: string;
};
