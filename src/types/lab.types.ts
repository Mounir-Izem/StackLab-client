export type LabType = 'standard' | 'wishlist' | 'trash';

export type Lab = {
    id: string;
    userId: string | null;
    name: string;
    coverPhotoUrl: string | null;
    type: LabType;
    isSystem: boolean;
    position: number;
    createdAt: string;
    updatedAt: string;
};