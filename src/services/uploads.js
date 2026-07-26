import { supabase } from '@/services/supabase';

export const presignUploads = async ({ workspaceId, count }) => {
    const res = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, count }),
    });
    if (!res.ok) throw new Error('No se pudieron generar las URLs de subida.');
    const { uploads } = await res.json();
    return uploads;
};

export const uploadToR2 = async (uploadUrl, blob) => {
    const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
    });
    if (!res.ok) throw new Error('Falló la subida de la foto.');
};

export const deleteR2Objects = async r2Keys => {
    if (r2Keys.length === 0) return;
    await fetch('/api/uploads/presign', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2Keys }),
    });
};

// Server-side R2→R2 copy (see the presign route's PUT handler) — used by
// "duplicate item" to give each copied photo its own object. Returns
// [{ sourceKey, r2Key }], not a same-order array, so callers must match by
// sourceKey rather than by index.
export const copyR2Objects = async ({ workspaceId, r2Keys }) => {
    if (r2Keys.length === 0) return [];
    const res = await fetch('/api/uploads/presign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, r2Keys }),
    });
    if (!res.ok) throw new Error('No se pudieron copiar las fotos.');
    const { copies } = await res.json();
    return copies;
};

// Admin-only, one-shot orchestration (/admin/settings' "optimizar
// almacenamiento" button). Referenced keys are read directly via Supabase —
// admin RLS grants full access to item_photos/location_photos across every
// workspace, not just the caller's own — then the optimize route (which
// holds the R2 secret) deletes whatever's left over in the bucket.
export const optimizeStorage = async () => {
    const client = supabase();
    const [itemPhotos, locationPhotos] = await Promise.all([
        client.from('item_photos').select('r2_key'),
        client.from('location_photos').select('r2_key'),
    ]);
    if (itemPhotos.error) throw itemPhotos.error;
    if (locationPhotos.error) throw locationPhotos.error;

    const referencedKeys = [
        ...itemPhotos.data.map(photo => photo.r2_key),
        ...locationPhotos.data.map(photo => photo.r2_key),
    ];

    const res = await fetch('/api/uploads/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referencedKeys }),
    });
    if (!res.ok) throw new Error('No se pudo optimizar el almacenamiento.');
    return res.json();
};
