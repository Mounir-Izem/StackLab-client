import type { Item, ItemStatus } from '../types/item.types';
import type { Lab, LabType } from '../types/lab.types';

export type BusinessItemRole =
    | 'activeHolding'
    | 'wish'
    | 'soldRecord'
    | 'trashedHolding'
    | 'trashedWish'
    | 'trashedSale'
    | 'invalid';

type RoleInput = Pick<Item, 'status'>;
type LabInput = Pick<Lab, 'type'>;

const ROLE_BY_LAB_TYPE_AND_STATUS: Record<LabType, Record<ItemStatus, BusinessItemRole>> = {
    standard: {
        active: 'activeHolding',
        sold: 'soldRecord',
        wishlist: 'invalid',
    },
    wishlist: {
        active: 'invalid',
        sold: 'invalid',
        wishlist: 'wish',
    },
    trash: {
        active: 'trashedHolding',
        sold: 'trashedSale',
        wishlist: 'trashedWish',
    },
};

export function getItemRole(item: RoleInput, lab: LabInput): BusinessItemRole {
    return ROLE_BY_LAB_TYPE_AND_STATUS[lab.type][item.status];
}

export function isActiveHolding(role: BusinessItemRole): boolean {
    return role === 'activeHolding';
}

export function isWish(role: BusinessItemRole): boolean {
    return role === 'wish';
}

export function isSoldRecord(role: BusinessItemRole): boolean {
    return role === 'soldRecord';
}

export function isTrashedHolding(role: BusinessItemRole): boolean {
    return role === 'trashedHolding';
}

export function isTrashedWish(role: BusinessItemRole): boolean {
    return role === 'trashedWish';
}

export function isTrashedSale(role: BusinessItemRole): boolean {
    return role === 'trashedSale';
}

export function isTrashRole(role: BusinessItemRole): boolean {
    return role === 'trashedHolding' || role === 'trashedWish' || role === 'trashedSale';
}

export function isInvalidRole(role: BusinessItemRole): boolean {
    return role === 'invalid';
}
