import { NextResponse } from 'next/server';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectsCommand,
    CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    // R2 only serves path-style requests (endpoint/bucket/key) — without
    // this the SDK signs virtual-hosted-style urls (bucket.endpoint/key),
    // which don't resolve and fail as an opaque "Failed to fetch" in-browser.
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Returns presigned PUT urls only — item_photos rows are inserted client-side
// once the upload succeeds (and, for a not-yet-created item, only once the
// item itself is saved).
export const POST = async request => {
    const { workspaceId, count = 1 } = await request.json();
    if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const uploads = await Promise.all(
        Array.from({ length: count }, async () => {
            const photoId = nanoid(8);
            const r2Key = `${workspaceId}/uploads/${photoId}.jpg`;
            const uploadUrl = await getSignedUrl(
                client,
                new PutObjectCommand({
                    Bucket: process.env.R2_BUCKET,
                    Key: r2Key,
                    ContentType: 'image/jpeg',
                }),
                { expiresIn: 300 },
            );
            return { photoId, r2Key, uploadUrl };
        }),
    );

    return NextResponse.json({ uploads });
};

// Immediate-deletion path (photo removed in the UI, or item discarded before
// save) — the safety net for anything this misses is the future manual
// "optimize storage" button in Settings, not this route.
export const DELETE = async request => {
    const { r2Keys } = await request.json();
    if (!r2Keys?.length) {
        return NextResponse.json({ error: 'r2Keys is required' }, { status: 400 });
    }

    await client.send(
        new DeleteObjectsCommand({
            Bucket: process.env.R2_BUCKET,
            Delete: { Objects: r2Keys.map(Key => ({ Key })) },
        }),
    );

    return NextResponse.json({ ok: true });
};

// "Duplicar item" — each photo needs its own R2 object (not a second row
// pointing at the same key), so deleting one item's photo can never take the
// other's down with it. A server-side CopyObjectCommand does that directly
// R2→R2 — no image bytes round-trip through the browser, which would also
// need the bucket's CORS enabled for fetch() (plain <img> loads don't need
// that, but reading bytes into JS does).
export const PUT = async request => {
    const { workspaceId, r2Keys } = await request.json();
    if (!workspaceId || !r2Keys?.length) {
        return NextResponse.json({ error: 'workspaceId and r2Keys are required' }, { status: 400 });
    }

    const copies = await Promise.all(
        r2Keys.map(async sourceKey => {
            const photoId = nanoid(8);
            const r2Key = `${workspaceId}/uploads/${photoId}.jpg`;
            await client.send(
                new CopyObjectCommand({
                    Bucket: process.env.R2_BUCKET,
                    CopySource: `${process.env.R2_BUCKET}/${sourceKey}`,
                    Key: r2Key,
                }),
            );
            return { sourceKey, r2Key };
        }),
    );

    return NextResponse.json({ copies });
};
