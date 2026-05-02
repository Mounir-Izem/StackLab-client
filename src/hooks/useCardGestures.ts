import { useRef } from 'react';
import { Animated, Platform, Share, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { triggerLight, triggerMedium } from '../utils/haptics';

type Options = {
    onPress?: () => void;
    buildShareText: () => string;
};

export function useCardGestures({ onPress, buildShareText }: Options) {
    const cardRef = useRef<View>(null);
    const isSharing = useRef(false);
    const onPressRef = useRef(onPress);
    onPressRef.current = onPress;
    const buildShareTextRef = useRef(buildShareText);
    buildShareTextRef.current = buildShareText;

    const scale = useRef(new Animated.Value(1)).current;
    const animatedStyle = { transform: [{ scale }] };

    const canvasOpacity = useRef(new Animated.Value(0)).current;
    const canvasRef = useRef<View>(null);

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
            Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
            triggerLight();
        })
        .onEnd(() => { onPressRef.current?.(); })
        .onFinalize(() => {
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
        });

    const longPress = Gesture.LongPress()
        .runOnJS(true)
        .minDuration(500)
        .maxDistance(10)
        .onStart(() => {
            triggerMedium();
            handleShare();
        });

    const gesture = Gesture.Exclusive(longPress, tap);

    return { cardRef, canvasRef, canvasOpacity, gesture, animatedStyle };
}
