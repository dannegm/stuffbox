'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { processImageFile, fileSignature } from '@/helpers/image-pipeline';
import { presignUploads, uploadToR2, deleteR2Objects } from '@/services/uploads';
import {
    itemPhotosQuery,
    createItemPhotosMutation,
    deleteItemPhotoMutation,
    reorderItemPhotosMutation,
    updateItemPhotoCropMutation,
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
    // signature (name+size+lastModified) -> r2Key of the photo it produced —
    // lets a repeated pick/drop of the same file skip re-upload and point the
    // caller at the thumbnail that already exists (session-only, not backed
    // by any stored file metadata).
    const uploadedSignatures = useRef(new Map());

    const { data: photos = [] } = useQuery(itemPhotosQuery(itemId));

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['item-photos', itemId] });

    const { mutate: persistPhotos } = useMutation(
        createItemPhotosMutation({ onSuccess: invalidate }),
    );
    const { mutate: removePersisted } = useMutation(
        deleteItemPhotoMutation({ onSuccess: invalidate }),
    );
    const { mutate: persistCrop } = useMutation(
        updateItemPhotoCropMutation({ onSuccess: invalidate }),
    );
    const { mutate: persistReorder } = useMutation(
        reorderItemPhotosMutation({ onSuccess: invalidate }),
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

        if (photo.id) {
            removePersisted(photo.id);
            deleteR2Objects([photo.r2_key]);
        } else {
            setPending(current => current.filter(p => p.r2Key !== photo.r2Key));
            deleteR2Objects([photo.r2Key]);
        }
    };

    // newOrder is the gallery's full reordered list (PhotoGallery's own
    // `all` — pending photos included). Only one of the two branches ever
    // actually applies: an existing item's `pending` is always empty (new
    // uploads persist immediately once itemId exists — see addFiles above),
    // and item/new has no itemId, so its `photos` is always empty too.
    // The query cache is written to directly (not just invalidated) so the
    // grid reflects the new order immediately, instead of snapping back
    // until the persisted mutation's refetch lands.
    const reorderPhotos = newOrder => {
        if (itemId) {
            const reordered = newOrder.map((photo, index) => ({ ...photo, order: index }));
            queryClient.setQueryData(['item-photos', itemId], reordered);
            persistReorder(reordered.map(photo => ({ id: photo.id, order: photo.order })));
        } else {
            setPending(newOrder.map((photo, index) => ({ ...photo, order: index })));
        }
    };

    const commitPending = newItemId => {
        if (pending.length === 0) return;
        persistPhotos({
            itemId: newItemId,
            photos: pending.map((photo, index) => ({
                r2Key: photo.r2Key,
                order: index,
                crop_x: photo.crop_x,
                crop_y: photo.crop_y,
                zoom: photo.zoom,
                rotation: photo.rotation,
                flip_x: photo.flip_x,
                flip_y: photo.flip_y,
            })),
        });
        setPending([]);
    };

    // Persisted photo → a real mutation by id. Pending (item/new, no row yet)
    // → just update the local draft; commitPending carries crop_x/crop_y/zoom
    // over once the item (and its rows) actually get created.
    const updateCrop = (photo, cropValues) => {
        if (photo.id) {
            return new Promise((resolve, reject) => {
                persistCrop(
                    { id: photo.id, ...cropValues },
                    { onSuccess: resolve, onError: reject },
                );
            });
        }
        setPending(current =>
            current.map(p => (p.r2Key === photo.r2Key ? { ...p, ...cropValues } : p)),
        );
        return Promise.resolve();
    };

    return {
        photos,
        pending,
        isProcessing,
        addFiles,
        removePhoto,
        commitPending,
        updateCrop,
        reorderPhotos,
    };
};
