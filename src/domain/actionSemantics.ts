import type { BusinessItemRole } from './itemSemantics';

export type ActionKind =
    | 'view'
    | 'edit'
    | 'sell'
    | 'acquire'
    | 'move'
    | 'trash'
    | 'restore'
    | 'deleteForever'
    | 'duplicate';

export type ActionPermissionMap = Record<ActionKind, boolean>;

// Ordre stable pour getAllowedActions — jamais l'ordre d'insertion d'un objet.
const ACTION_ORDER: ActionKind[] = [
    'view', 'edit', 'sell', 'acquire', 'move', 'trash', 'restore', 'deleteForever', 'duplicate',
];

const ALL_FALSE: ActionPermissionMap = {
    view: false,
    edit: false,
    sell: false,
    acquire: false,
    move: false,
    trash: false,
    restore: false,
    deleteForever: false,
    duplicate: false,
};

const TRASH_LIFECYCLE: ActionPermissionMap = {
    ...ALL_FALSE,
    view: true,
    restore: true,
    deleteForever: true,
};

const PERMISSIONS_BY_ROLE: Record<BusinessItemRole, ActionPermissionMap> = {
    activeHolding: {
        ...ALL_FALSE,
        view: true,
        edit: true,
        sell: true,
        move: true,
        trash: true,
        duplicate: true,
    },
    wish: {
        ...ALL_FALSE,
        view: true,
        edit: true,
        acquire: true,
        trash: true,
        duplicate: true,
    },
    soldRecord: {
        ...ALL_FALSE,
        view: true,
        trash: true,
    },
    trashedHolding: TRASH_LIFECYCLE,
    trashedWish: TRASH_LIFECYCLE,
    trashedSale: TRASH_LIFECYCLE,
    invalid: { ...ALL_FALSE },
};

export function getActionPermissions(role: BusinessItemRole): ActionPermissionMap {
    return PERMISSIONS_BY_ROLE[role];
}

export function canPerformAction(role: BusinessItemRole, action: ActionKind): boolean {
    return getActionPermissions(role)[action];
}

export function getAllowedActions(role: BusinessItemRole): ActionKind[] {
    const permissions = getActionPermissions(role);
    return ACTION_ORDER.filter(action => permissions[action]);
}
