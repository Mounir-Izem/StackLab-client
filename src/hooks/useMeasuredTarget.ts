import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import type { TargetRect } from '../components/common/CoachMarkOverlay';

export function useMeasuredTarget() {
    const ref = useRef<View>(null);
    const [rect, setRect] = useState<TargetRect | null>(null);

    const measure = useCallback(() => {
        ref.current?.measureInWindow((x, y, width, height) => {
            setRect({ x, y, width, height });
        });
    }, []);

    return { ref, rect, measure };
}
