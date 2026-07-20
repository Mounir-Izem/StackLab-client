import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import { colors, fonts } from '../../utils/theme';
import type { OnboardingStackScreenProps } from '../../navigation/types';

type Props = OnboardingStackScreenProps<'OnboardingLogo'>;

// Wording verrouillé dans PRODUCT_DECISIONS.md §2/§3.3 — jamais traduit,
// même quand l'app est en FR. Ne pas faire passer par i18n.
const TAGLINE = 'Bring your stack to life.';
const PRIVACY_LINE = '100% private by default.';

const FADE_MS = 450;
const HOLD_MS = 1600;

function fade(value: Animated.Value, toValue: number, duration: number): Promise<void> {
    return new Promise(resolve => {
        Animated.timing(value, { toValue, duration, useNativeDriver: true }).start(() => resolve());
    });
}

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function OnboardingLogoScreen({ navigation }: Props) {
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.85)).current;
    const beat1Opacity = useRef(new Animated.Value(0)).current;
    const beat2Opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let cancelled = false;

        async function run() {
            await Promise.all([
                fade(logoOpacity, 1, 900),
                new Promise<void>(resolve => {
                    Animated.spring(logoScale, {
                        toValue: 1, friction: 8, tension: 40, useNativeDriver: true,
                    }).start(() => resolve());
                }),
            ]);
            if (cancelled) return;

            await wait(600);
            if (cancelled) return;

            await Promise.all([fade(logoOpacity, 0, FADE_MS), fade(beat1Opacity, 1, FADE_MS)]);
            if (cancelled) return;

            await wait(HOLD_MS);
            if (cancelled) return;

            await Promise.all([fade(beat1Opacity, 0, FADE_MS), fade(beat2Opacity, 1, FADE_MS)]);
            if (cancelled) return;

            await wait(HOLD_MS);
            if (cancelled) return;

            await fade(beat2Opacity, 0, FADE_MS);
            if (cancelled) return;

            await wait(200);
            if (!cancelled) navigation.replace('OnboardingStep1');
        }

        run();
        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <View style={styles.screen}>
            <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
                <Image
                    source={require('../../../assets/splash.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>
            <Animated.Text style={[styles.beat, { opacity: beat1Opacity }]}>{TAGLINE}</Animated.Text>
            <Animated.Text style={[styles.beat, { opacity: beat2Opacity }]}>{PRIVACY_LINE}</Animated.Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoWrap: {
        position: 'absolute',
    },
    logo: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    beat: {
        position: 'absolute',
        fontFamily: fonts.manrope,
        fontSize: 22,
        color: colors.text,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
