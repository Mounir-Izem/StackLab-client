// Déclaration minimale — @types/react-test-renderer n'est pas installé.
// react-test-renderer lui-même est déjà présent (dépendance transitive de
// react, version alignée) ; ce shim ne couvre que l'API utilisée par les
// tests de rendu composant du projet.
declare module 'react-test-renderer' {
    import type { ReactElement } from 'react';

    export type ReactTestInstance = {
        props: Record<string, unknown>;
        children: ReactTestInstance[];
        findAllByType(type: unknown): ReactTestInstance[];
    };

    export type ReactTestRenderer = {
        toJSON(): unknown;
        root: ReactTestInstance;
        unmount(): void;
    };

    export function create(element: ReactElement): ReactTestRenderer;
    export function act(callback: () => void): void;

    const TestRenderer: {
        create: typeof create;
        act: typeof act;
    };
    export default TestRenderer;
}
