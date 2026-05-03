import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSpotStore } from '../stores/spotStore';

export function useSpotPrice(): void {
    const fetchPrices = useSpotStore(s => s.fetchPrices);

    useEffect(() => {
        fetchPrices();

        const interval = setInterval(fetchPrices, 5 * 60 * 1000);

        const unsubNetInfo = NetInfo.addEventListener(state => {
            if (state.isConnected && state.isInternetReachable) {
                fetchPrices();
            }
        });

        const appStateSub = AppState.addEventListener('change', nextState => {
            if (nextState === 'active') fetchPrices();
        });

        return () => {
            clearInterval(interval);
            unsubNetInfo();
            appStateSub.remove();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
