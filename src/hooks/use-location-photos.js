'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { processImageFile } from '@/helpers/image-pipeline';
import { presignUploads, uploadToR2, deleteR2Objects } from '@/services/uploads';
import {
    locationPhotosQuery,
    createLocationPhotosMutation,
    deleteLocationPhotoMutation,
} from '@/queries/location-photos';

const MAX_DIMENSION = Number(process.env.NEXT_PUBLIC_STUFFBOX_MAX_IMAGE_DIMENSION) || 2000;

// Simpler than useItemPhotos — a location always exists (has an id) by the
// time its photo gallery is editable (only reachable from location/[id]/edit,
// an existing row's own route), so there's no pending/deferred-upload
// lifecycle to manage.
export const useLocationPhotos = ({ locationId, workspaceId }) => {
    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: photos = [] } = useQuery(locationPhotosQuery(locationId));

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: ['location-photos', locationId] });

    const { mutate: persistPhotos } = useMutation(
        createLocationPhotosMutation({ onSuccess: invalidate }),
    );
    const { mutate: removePersisted } = useMutation(
        deleteLocationPhotoMutation({ onSuccess: invalidate }),
    );

    const addFiles = async fileList => {
        const files = Array.from(fileList);
        if (files.length === 0) return;
        setIsProcessing(true);
        try {
            const blobs = await Promise.all(
                files.map(file => processImageFile(file, MAX_DIMENSION)),
            );
            const uploads = await presignUploads({ workspaceId, count: blobs.length });
            await Promise.all(
                blobs.map((blob, index) => uploadToR2(uploads[index].uploadUrl, blob)),
            );
            persistPhotos({
                locationId,
                photos: uploads.map((upload, index) => ({
                    r2Key: upload.r2Key,
                    order: photos.length + index,
                })),
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const removePhoto = photo => {
        removePersisted(photo.id);
        deleteR2Objects([photo.r2_key]);
    };

    return { photos, isProcessing, addFiles, removePhoto };
};
