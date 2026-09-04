import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.R2_BUCKET!;

// R2 has no regions, but SigV4 will not sign without one.
export const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

export const imageKey = (workspaceId: string, imageId: string) =>
    `${workspaceId}/${imageId}`;

export async function putImage(
    key: string,
    body: Buffer,
    contentType: string,
): Promise<void> {
    await r2.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    );
}

export async function deleteImage(key: string): Promise<void> {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// A list page caps at 1000 keys, which is exactly what DeleteObjects accepts,
// so a page maps to one delete call with no further chunking.
export async function deleteWorkspaceImages(
    workspaceId: string,
): Promise<void> {
    let continuationToken: string | undefined;

    do {
        const listed = await r2.send(
            new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: `${workspaceId}/`,
                ContinuationToken: continuationToken,
            }),
        );

        const keys = (listed.Contents ?? [])
            .map((object) => object.Key)
            .filter((key): key is string => Boolean(key));

        if (keys.length > 0) {
            await r2.send(
                new DeleteObjectsCommand({
                    Bucket: BUCKET,
                    Delete: { Objects: keys.map((Key) => ({ Key })) },
                }),
            );
        }

        continuationToken = listed.IsTruncated
            ? listed.NextContinuationToken
            : undefined;
    } while (continuationToken);
}

export function presignImage(key: string, expiresIn: number): Promise<string> {
    return getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        {
            expiresIn,
        },
    );
}
