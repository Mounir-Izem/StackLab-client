export type Deck = {
    id: string;
    labId: string;
    parentId: string | null;
    name: string;
    coverPhotoUrl: string | null;
    position: number;
    createdAt: string;
    updatedAt: string;
};