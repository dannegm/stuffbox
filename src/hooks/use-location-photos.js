'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { processImageFile, fileSignature } from '@/helpers/image-pipeline';
import { presignUploads, uploadToR2, deleteR2Objects } from '@/services/uploads';
import {
    locationPhotosQuery,
    createLocationPhotosMutation,
    deleteLocationPhotoMutation,
    reorderLocationPhotosMutation,
    updateLocationPhotoCropMutation,
} from '@/queries/location-photos';

const MAX_DIMENSION = Number(process.env.NEXT_PUBLIC_STUFFBOX_MAX_IMAGE_DIMENSION) || 2000;

// Simpler than useItemPhotos — a location always exists (has an id) by the
// time its photo gallery is editable (only reachable from location/[id]/edit,
// an existing row's own route), so there's no pending/deferred-upload
// lifecycle to manage.
export const useLocationPhotos = ({ locationId, workspaceId }) => {
    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = useState(false);
    // signature (name+size+lastModified) -> r2Key of the photo it produced —
    // lets a repeated pick/drop of the same file skip re-upload and point the
    // caller at the thumbnail that already exists (session-only, not backed
    // by any stored file metadata).
    const uploadedSignatures = useRef(new Map());

    const { data: photos = [] } = useQuery(locationPhotosQuery(locationId));

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: ['location-photos', locationId] });

    const { mutate: persistPhotos } = useMutation(
        createLocationPhotosMutation({ onSuccess: invalidate }),
    );
    const { mutate: removePersisted } = useMutation(
        deleteLocationPhotoMutation({ onSuccess: invalidate }),
    );
    const { mutate: persistCrop } = useMutation(
        updateLocationPhotoCropMutation({ onSuccess: invalidate }),
    );
    const { mutate: persistReorder } = useMutation(
        reorderLocationPhotosMutation({ onSuccess: invalidate }),
    );

    const addFiles = async fileList => {
        const files = Array.from(fileList).filter(file => file.type.startsWith('image/'));
        if (files.length === 0) return { duplicates: [] };

        // Dedupe both against photos already uploaded this session and
        // against repeats within this same batch (e.g. the same file dropped
        // twice at once) — only the first occurrence gets uploaded.
        const signatures = files.map(fileSignature);
        const seenInBatch = new Set();
        const uniqueIndexes = [];
        const duplicateSignatures = [];
        signatures.forEach((signature, index) => {
            if (uploadedSignatures.current.has(signature) || seenInBatch.has(signature)) {
                duplicateSignatures.push(signature);
            } else {
                seenInBatch.add(signature);
                uniqueIndexes.push(index);
            }
        });

        const resolveDuplicates = () =>
            duplicateSignatures
                .map(signature => uploadedSignatures.current.get(signature))
                .filter(Boolean);

        if (uniqueIndexes.length === 0) {
            return { duplicates: resolveDuplicates() };
        }

        setIsProcessing(true);
        try {
            const uniqueFiles = uniqueIndexes.map(index => files[index]);
            const uniqueSignatures = uniqueIndexes.map(index => signatures[index]);
            const blobs = await Promise.all(
                uniqueFiles.map(file => processImageFile(file, MAX_DIMENSION)),
            );
            const uploads = await presignUploads({ workspaceId, count: blobs.length });
            await Promise.all(
                blobs.map((blob, index) => uploadToR2(uploads[index].uploadUrl, blob)),
            );

            uniqueSignatures.forEach((signature, index) => {
                uploadedSignatures.current.set(signature, uploads[index].r2Key);
            });

            persistPhotos({
                locationId,
                photos: uploads.map((upload, index) => ({
                    r2Key: upload.r2Key,
                    order: photos.length + index,
                })),
            });

            return { duplicates: resolveDuplicates() };
        } finally {
            setIsProcessing(false);
        }
    };

    const removePhoto = photo => {
        const r2Key = photo.r2Key ?? photo.r2_key;
        for (const [signature, key] of uploadedSignatures.current.entries()) {
            if (key === r2Key) {
                uploadedSignatures.current.delete(signature);
                break;
            }
        }

        removePersisted(photo.id);
        deleteR2Objects([photo.r2_key]);
    };

    const updateCrop = (photo, cropValues) =>
        new Promise((resolve, reject) => {
            persistCrop({ id: photo.id, ...cropValues }, { onSuccess: resolve, onError: reject });
        });

    // A location always exists by the time its gallery is editable (see
    // module comment), so newOrder is always fully persisted rows — no
    // pending-vs-persisted split to handle here, unlike useItemPhotos. The
    // query cache is written to directly so the grid reflects the new order
    // immediately, instead of snapping back until the mutation's refetch
    // lands.
    const reorderPhotos = newOrder => {
        const reordered = newOrder.map((photo, index) => ({ ...photo, order: index }));
        queryClient.setQueryData(['location-photos', locationId], reordered);
        persistReorder(reordered.map(photo => ({ id: photo.id, order: photo.order })));
    };

    return { photos, isProcessing, addFiles, removePhoto, updateCrop, reorderPhotos };
};
