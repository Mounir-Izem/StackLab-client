export type LabType = 'standard' | 'premium' | 'wishlist';

export type Lab = {
    id: string;
    userId: string | null;
    name: string;
    coverPhotoUrl: string | null;
    type: LabType;
    position: number;
    createdAt: string;
    updatedAt: string;
};