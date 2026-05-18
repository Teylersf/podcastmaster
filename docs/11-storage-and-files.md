# 11 — Storage & Files

We have two file backends:

| Backend | What goes there | Who owns the bytes |
|---|---|---|
| **Cloudflare R2** | All free-tier audio uploads + outputs, all rendered videos | Modal (Python) |
| **Vercel Blob** | Subscriber mastered outputs (permanent) | Next.js + Modal both upload, Next.js owns the metadata |

Plus **Postgres** holds file metadata (filename, size, URLs, expiry) — see [06-database.md](06-database.md).

## Why two backends?

R2 is dirt cheap and Modal's container already needs S3-API access for the long jobs. Vercel Blob has tighter integration with Next.js for the subscriber dashboard (ACL via Stack Auth, presigned uploads, easy delete API). We could in theory move everything to one — there's a trade-off doc that hasn't been written yet, but the split has held up.

## Cloudflare R2

S3-compatible. Accessed from Python via `boto3`:
```python
import boto3
s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
)
```

### Bucket layout

```
uploads/{jobId}/{originalfilename}            ← raw audio
outputs/{jobId}/{originalfilename}_mastered.wav ← mastered audio (free tier)
videos/{jobId}/{filename}.mp4                 ← rendered videos
```

### Public access

Each path is served via a public R2 URL like:
```
https://<bucket-public-host>/outputs/{jobId}/{filename}.wav
```

The bucket is configured with public read on these prefixes (in the R2 dashboard). No presigning needed for downloads.

### TTL — 24-hour retention

A Modal Cron function ([backend/modal_app.py](../backend/modal_app.py)):
```python
@modal.Cron("0 0 * * *")  # 00:00 UTC daily
def cleanup_old_files():
    cutoff = datetime.utcnow() - timedelta(hours=24)
    for prefix in ["uploads/", "outputs/", "videos/"]:
        for obj in paginate_list_objects(prefix):
            if obj.last_modified < cutoff:
                s3.delete_object(Bucket=BUCKET, Key=obj.key)
```

This is the load-bearing deletion mechanism that backs the "files deleted within 24 hours" privacy promise. Don't break it.

### Environment variables (Modal side)

| Var | Where set |
|---|---|
| `R2_ACCOUNT_ID` | Modal secrets |
| `R2_ACCESS_KEY_ID` | Modal secrets |
| `R2_SECRET_ACCESS_KEY` | Modal secrets |
| `R2_BUCKET_NAME` | Modal secrets |
| `R2_PUBLIC_URL` | Modal secrets (the public domain prefix) |

Set with `modal secret create r2-credentials ...` and referenced in the app via `modal.Secret.from_name("r2-credentials")`.

## Vercel Blob

Vercel's S3-style object store, scoped per-project. Accessed two ways:

### From Next.js (server)
```ts
import { put, del, list } from "@vercel/blob";

const blob = await put(`subscribers/${userId}/${name}`, fileBuffer, {
  access: "public",
  contentType: "audio/wav",
  token: process.env.BLOB_READ_WRITE_TOKEN,
});
// blob.url, blob.pathname
```
Used in `POST /api/files/upload` (subscriber direct upload through the API).

### From Modal (Python)
`POST /api/files/get-blob-upload-url` (with Bearer auth) returns `{ blobToken, blobPathname, ... }`. Modal then uploads via the `vercel_blob` Python SDK:
```python
from vercel_blob import put
result = put(blob_pathname, file_bytes, token=blob_token, access="public")
```

Used when a premium mastering job completes — Modal sends the mastered output directly to Vercel Blob without round-tripping through Next.js.

### Path convention

```
subscribers/{userId}/{timestamp}-{filename}            ← from /api/files/upload
subscribers/{subscriptionId}/{timestamp}_{name}_mastered.wav ← from Modal premium output
```

(The two prefixes differ because the upload endpoint has `user.id` handy, while Modal has `subscriptionId` from the `/get-blob-upload-url` response. Either works — `del()` keys off `blobPathname` regardless.)

### Quota — 5 GB per subscriber

Enforced application-side. Before any upload:
```ts
const total = await prisma.subscriberFile.aggregate({
  _sum: { fileSize: true },
  where: { subscription: { userId } },
});
if (total._sum.fileSize + newFileSize > 5 * 1024 * 1024 * 1024) {
  return { error: "Quota exceeded" };
}
```
This runs in both `/api/files/upload` and `/api/files/get-blob-upload-url`.

### Environment variables (Next.js side)

| Var | Notes |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Single token, used for all blob ops; set in Vercel project env |

## Postgres metadata models

Tied to the bytes by URL / pathname:

| Model | When created | When deleted |
|---|---|---|
| [FreeUserFile](../prisma/schema.prisma) | `POST /api/files/free-user` | Never explicitly; filtered out by `expiresAt` on read |
| [SubscriberFile](../prisma/schema.prisma) | `POST /api/files/upload` or webhook | `DELETE /api/files/delete` |
| [PremiumUserJob](../prisma/schema.prisma) | `POST /api/files/premium-job` | Never (orphans accumulate; tiny) |

Reads in `GET /api/files/list` and `GET /api/subscription/status`.

## File operations from the dashboard

The dashboard ([src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx)) supports:

- **Download** — direct browser `window.open(blobUrl)` for subscriber files, R2 URL for free files. Has a fallback `fetch` → `Blob` URL → trigger download anchor pattern for browsers that block popups.
- **Delete** (subscribers only) — `DELETE /api/files/delete?fileId=...` removes from Blob and DB in that order.
- **Make Video** — opens [VideoGenerator](../src/components/video/VideoGenerator.tsx) with the file's audio URL.

Free users see their files with a live countdown timer ("Expires in 17h 23m") computed from `expiresAt - now`.

## File size limits

| Path | Limit | Where enforced |
|---|---|---|
| Free upload | 500 MB (soft) | Vercel route body size in [api/files/upload](../src/app/api/files/upload/route.ts); Modal can take larger via direct upload |
| Audio duration | ~4 hours | Matchering config in [backend/modal_app.py](../backend/modal_app.py) |
| Per-subscriber total | 5 GB | Application code |
| Video render | bound by Modal 30-min runtime | [backend/remotion_ssr.py](../backend/remotion_ssr.py) |

## How free-tier files clean themselves up

Two parallel mechanisms — both must work for the privacy promise to hold:

1. **R2 cron deletes the bytes** — Modal `cleanup_old_files()` runs daily.
2. **Postgres filter hides the metadata** — `expiresAt > now()` clause in `GET /api/files/free-user`.

If the cron breaks but the filter still works, users won't see expired files — but the bytes are still in R2. *That violates the privacy promise.* Monitor the cron via Modal's dashboard.

## What's NOT here

- No CDN in front of R2 or Blob. Both serve directly from their own edge networks.
- No virus scanning or content moderation. We trust upload contents.
- No per-file ACL beyond "subscriber's files visible to that subscriber". Files are public-URL-readable to anyone with the URL. If you need stronger privacy in the future, use Vercel Blob's `access: "private"` + token-based fetch.
