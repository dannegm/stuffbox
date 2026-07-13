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
