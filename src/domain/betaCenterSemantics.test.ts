import { hasUnseenBetaCenterContent } from './betaCenterSemantics';

describe('hasUnseenBetaCenterContent', () => {
    test('jamais visité (null) → non lu', () => {
        expect(hasUnseenBetaCenterContent(null, '2026-07-24')).toBe(true);
    });

    test('dernière version vue différente de la version courante → non lu', () => {
        expect(hasUnseenBetaCenterContent('2026-06-01', '2026-07-24')).toBe(true);
    });

    test('dernière version vue égale à la version courante → lu', () => {
        expect(hasUnseenBetaCenterContent('2026-07-24', '2026-07-24')).toBe(false);
    });
});
