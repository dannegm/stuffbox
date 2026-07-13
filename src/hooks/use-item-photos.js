'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { processImageFile } from '@/helpers/image-pipeline';
import { presignUploads, uploadToR2, deleteR2Objects } from '@/services/uploads';
import {
    itemPhotosQuery,
    createItemPhotosMutation,
    deleteItemPhotoMutation,
} from '@/queries/item-photos';

const MAX_DIMENSION = Number(process.env.NEXT_PUBLIC_STUFFBOX_MAX_IMAGE_DIMENSION) || 2000;

// Photos have two lifecycles: an existing item persists an item_photos row
// right after upload; a not-yet-created item (item/new) still uploads to R2
// immediately (so the user sees a preview) but only gets its rows once the
// item is saved — commitPending() does that hand-off.
export const useItemPhotos = ({ itemId, workspaceId }) => {
    const queryClient = useQueryClient();
    const [pending, setPending] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: photos = [] } = useQuery(itemPhotosQuery(itemId));

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['item-photos', itemId] });

    const { mutate: persistPhotos } = useMutation(
        createItemPhotosMutation({ onSuccess: invalidate }),
    );
    const { mutate: removePersisted } = useMutation(
        deleteItemPhotoMutation({ onSuccess: invalidate }),
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

            if (itemId) {
                persistPhotos({
                    itemId,
                    photos: uploads.map((upload, index) => ({
                        r2Key: upload.r2Key,
                        order: photos.length + index,
                    })),
                });
            } else {
                setPending(current => [
                    ...current,
                    ...uploads.map((upload, index) => ({
                        r2Key: upload.r2Key,
                        previewUrl: URL.createObjectURL(blobs[index]),
                        order: current.length + index,
                    })),
                ]);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const removePhoto = photo => {
        if (photo.id) {
            removePersisted(photo.id);
            deleteR2Objects([photo.r2_key]);
        } else {
            setPending(current => current.filter(p => p.r2Key !== photo.r2Key));
            deleteR2Objects([photo.r2Key]);
        }
    };

    const commitPending = newItemId => {
        if (pending.length === 0) return;
        persistPhotos({
            itemId: newItemId,
            photos: pending.map((photo, index) => ({ r2Key: photo.r2Key, order: index })),
        });
        setPending([]);
    };

    return { photos, pending, isProcessing, addFiles, removePhoto, commitPending };
};
