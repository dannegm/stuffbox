import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const listAllKeys = async () => {
    const keys = [];
    let ContinuationToken;

    do {
        const { Contents, NextContinuationToken } = await client.send(
            new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET, ContinuationToken }),
        );
        (Contents ?? []).forEach(object => keys.push(object.Key));
        ContinuationToken = NextContinuationToken;
    } while (ContinuationToken);

    return keys;
};

// Referenced keys (item_photos.r2_key + location_photos.r2_key, across every
// workspace) are read client-side via Supabase, not here — this route only
// holds the R2 secret, per the plan's "server-side code exists only to hide a
// secret" rule. DeleteObjectsCommand caps out at 1000 keys per call.
export const POST = async request => {
    const { referencedKeys = [] } = await request.json();
    const referenced = new Set(referencedKeys);

    const allKeys = await listAllKeys();
    const orphanKeys = allKeys.filter(key => !referenced.has(key));

    for (let i = 0; i < orphanKeys.length; i += 1000) {
        const batch = orphanKeys.slice(i, i + 1000);
        await client.send(
            new DeleteObjectsCommand({
                Bucket: process.env.R2_BUCKET,
                Delete: { Objects: batch.map(Key => ({ Key })) },
            }),
        );
    }

    return NextResponse.json({ totalObjects: allKeys.length, deletedCount: orphanKeys.length });
};
