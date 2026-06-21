import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../../utils/theme';
import type { OnboardingStackScreenProps } from '../../navigation/types';

type Props = OnboardingStackScreenProps<'OnboardingLogo'>;

export function OnboardingLogoScreen({ navigation }: Props) {
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.85)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 900,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setTimeout(() => navigation.replace('OnboardingStep1'), 600);
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <View style={styles.screen}>
            <Animated.View style={{ opacity, transform: [{ scale }] }}>
                <Image
                    source={require('../../../assets/splash.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>
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
    logo: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
});
