# GCP Deployment Guide

## Architecture

- `apps/web` -> Cloud Run service `patent-manager-web`
- `apps/api` -> Cloud Run service `patent-manager-api`
- PostgreSQL -> Cloud SQL for PostgreSQL
- generated PDFs -> Cloud Storage bucket
- secrets -> Secret Manager
- images -> Artifact Registry

## Runtime Design

- The API keeps Prisma on PostgreSQL and uses `STORAGE_BACKEND=gcs` in production.
- Generated PDF snapshots are rendered in local temp storage and then uploaded to Cloud Storage.
- The API download route streams the stored PDF back from the selected storage backend.
- The API container installs `fonts-noto-cjk` so Korean PDF rendering works on Cloud Run.

## Required Secrets and Variables

- `DATABASE_URL`
- `GCS_BUCKET_NAME`
- `STORAGE_BACKEND=gcs`
- `STORAGE_PREFIX=generated-docs`
- `PDF_FONT_PATH=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`
- `NEXT_PUBLIC_API_URL`

## Recommended GCP Resources

- Artifact Registry repository: `patent-manager`
- Cloud SQL instance: PostgreSQL 16, same region as Cloud Run
- Cloud Storage bucket: `patent-manager-documents`
- Service account: `patent-manager-runtime`

## Build and Push

```bash
gcloud auth configure-docker REGION-docker.pkg.dev

docker build -f apps/api/Dockerfile -t REGION-docker.pkg.dev/PROJECT_ID/patent-manager/api:latest .
docker push REGION-docker.pkg.dev/PROJECT_ID/patent-manager/api:latest

docker build -f apps/web/Dockerfile -t REGION-docker.pkg.dev/PROJECT_ID/patent-manager/web:latest .
docker push REGION-docker.pkg.dev/PROJECT_ID/patent-manager/web:latest
```

## Deploy

```bash
gcloud run services replace deploy/gcp/cloud-run-api.yaml --region REGION --project PROJECT_ID
gcloud run services replace deploy/gcp/cloud-run-web.yaml --region REGION --project PROJECT_ID
```

## Database Migration

- Run `prisma db push` or a migration job against Cloud SQL before exposing traffic.
- Keep Cloud SQL and Cloud Run in the same region.

## Follow-up

- Replace demo auth with Firebase Auth or your OIDC/SSO provider before production use.
- Move user-uploaded attachments to the same storage abstraction if actual binary uploads are added.
