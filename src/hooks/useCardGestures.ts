import { useRef } from 'react';
import { Animated, Platform, Share, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { triggerLight, triggerMedium } from '../utils/haptics';

type Options = {
    onPress?: () => void;
    onLongPress?: () => void;
    buildShareText: () => string;
    glowColor?: string;
    reduceMotion?: boolean;
};

export function useCardGestures({ onPress, onLongPress, buildShareText, glowColor, reduceMotion }: Options) {
    const cardRef = useRef<View>(null);
    const isSharing = useRef(false);
    const onPressRef = useRef(onPress);
    onPressRef.current = onPress;
    const onLongPressRef = useRef(onLongPress);
    onLongPressRef.current = onLongPress;
    const buildShareTextRef = useRef(buildShareText);
    buildShareTextRef.current = buildShareText;

    // Scale tap — useNativeDriver: true
    const scale = useRef(new Animated.Value(1)).current;
    const animatedStyle = { transform: [{ scale }] };

    // Glow au tap — useNativeDriver: true (opacity uniquement)
    const glowAnim = useRef(new Animated.Value(0)).current;

    // Canvas share
    const canvasOpacity = useRef(new Animated.Value(0)).current;
    const canvasRef = useRef<View>(null);

    function triggerGlow() {
        if (reduceMotion || !glowColor) return;
        glowAnim.setValue(0);
        Animated.sequence([
            Animated.timing(glowAnim, { toValue: 0.4, duration: 60, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]).start();
    }

    async function handleShare() {
        if (isSharing.current) return;
        isSharing.current = true;
        canvasOpacity.setValue(1);
        await new Promise<void>(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        try {
            const uri = await captureRef(canvasRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
            if (Platform.OS === 'android') {
                await Sharing.shareAsync(uri);
            } else {
                await Share.share({ url: uri, message: buildShareTextRef.current() });
            }
        } catch {}
        finally {
            canvasOpacity.setValue(0);
            isSharing.current = false;
        }
    }

    const tap = Gesture.Tap()
        .runOnJS(true)
        .onBegin(() => {
            if (!reduceMotion) {
                Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
            }
            triggerLight();
            triggerGlow();
        })
        .onEnd(() => { onPressRef.current?.(); })
        .onFinalize(() => {
            if (!reduceMotion) {
                Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
            }
        });

    const longPress = Gesture.LongPress()
        .runOnJS(true)
        .minDuration(500)
        .maxDistance(10)
        .onStart(() => {
            triggerMedium();
            if (!reduceMotion) {
                Animated.spring(scale, { toValue: 1.05, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
            }
            onLongPressRef.current?.();
        })
        .onEnd(() => {
            if (!reduceMotion) {
                Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
            }
        });

    const gesture = Gesture.Exclusive(longPress, tap);

    return {
        cardRef,
        canvasRef,
        canvasOpacity,
        gesture,
        animatedStyle,
        glowAnim,
        glowColor,
        handleShare,
    };
}
