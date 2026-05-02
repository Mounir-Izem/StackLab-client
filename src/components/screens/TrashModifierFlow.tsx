import React, { useState } from 'react';
import { useItemStore } from '../../stores/itemStore';
import { useLabStore } from '../../stores/labStore';
import { ModifierScreenB } from './ModifierScreenB';
import { TrashScreenC } from './TrashScreenC';
import type { LabsStackScreenProps } from '../../navigation/types';

type Props = LabsStackScreenProps<'TrashModifier'>;

export function TrashModifierFlow({ route, navigation }: Props) {
    const { labId } = route.params;
    const [showC, setShowC] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { items } = useItemStore();
    const { labs } = useLabStore();

    const lab = labs.find(l => l.id === labId);
    const selectedItems = items.filter(i => selectedIds.includes(i.id));

    function handleClose() { navigation.goBack(); }

    if (showC) return (
        <TrashScreenC
            items={selectedItems}
            labName={lab?.name ?? 'Trash'}
            onBack={() => setShowC(false)}
            onCancel={handleClose}
            onDone={handleClose}
        />
    );

    return (
        <ModifierScreenB
            items={items}
            labName={lab?.name ?? 'Trash'}
            deckName={null}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onContinue={() => setShowC(true)}
            onCancel={handleClose}
        />
    );
}
