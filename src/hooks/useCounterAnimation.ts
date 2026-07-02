import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// Anime une valeur numérique de 0 → target à chaque changement de target.
// useNativeDriver: false obligatoire (valeur numérique, pas transform/opacity).
// Ne s'anime pas si target est null/0 ou si reduceMotion est actif.
export function useCounterAnimation(
    target: number | null,
    reduceMotion: boolean,
    duration = 600,
): Animated.Value {
    const animated = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (target === null || target === 0 || reduceMotion) {
            animated.setValue(target ?? 0);
            return;
        }
        animated.setValue(0);
        Animated.timing(animated, {
            toValue: target,
            duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, reduceMotion]);

    return animated;
}

// Variante qui reset depuis 0 quand la devise change (Dashboard).
export function useCounterAnimationWithCurrency(
    target: number | null,
    currency: string,
    reduceMotion: boolean,
    duration = 600,
): Animated.Value {
    const animated = useRef(new Animated.Value(0)).current;
    const prevCurrency = useRef(currency);

    useEffect(() => {
        if (currency !== prevCurrency.current) {
            prevCurrency.current = currency;
            animated.setValue(0);
        }

        if (target === null || target === 0 || reduceMotion) {
            animated.setValue(target ?? 0);
            return;
        }
        animated.setValue(0);
        Animated.timing(animated, {
            toValue: target,
            duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, currency, reduceMotion]);

    return animated;
}
