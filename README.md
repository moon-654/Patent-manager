# Patent Manager

직무발명 신고, 심의/평가, 특허, 보상, 정책 관리를 위한 monorepo입니다.

## Structure

- `apps/api`: NestJS API
- `apps/web`: Next.js web app
- `prisma`: Prisma schema
- `deploy/gcp`: Cloud Run deployment examples
- `docs`: 운영 및 설계 문서

## Local Development

기본 로컬 포트:

- Web: `22021`
- API: `22020`

실행 순서:

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run dev
```

기본 접속 주소:

- Web: `http://localhost:22021`
- API: `http://localhost:22020/api/v1`
- Swagger: `http://localhost:22020/api/docs`

## Production Deployment

현재 운영 배포 구조:

- Web service: `patent-manager`
- API service: `patent-manager-api`
- Database: Cloud SQL for PostgreSQL
- Document storage: Cloud Storage
- Secret storage: Secret Manager

운영 URL:

- Web: `https://patent-manager-k6y2romega-du.a.run.app`
- API: `https://patent-manager-api-k6y2romega-du.a.run.app`

추가 배포 메모는 [gcp-cloud-run-deployment.md](c:/Users/Lenovo/Documents/Workspace/Patent_manager/docs/gcp-cloud-run-deployment.md)에 정리되어 있습니다.

## GitHub Auto Deploy

GitHub push 기반 Cloud Build 트리거는 두 개로 분리되어 있습니다.

- `patent-manager-web-main`
  - build config: `cloudbuild.yaml`
  - 대상: `apps/web/**`, `apps/web/Dockerfile`, `cloudbuild.yaml`, 루트 `package*.json`, `.dockerignore`
  - 결과: Cloud Run web service `patent-manager`

- `patent-manager-api-main`
  - build config: `cloudbuild-api.yaml`
  - 대상: `apps/api/**`, `prisma/**`, `apps/api/Dockerfile`, `cloudbuild-api.yaml`, 루트 `package*.json`, `.dockerignore`
  - 결과: Cloud Run API service `patent-manager-api`

즉:

- 웹 변경 푸시 -> 웹만 배포
- API 또는 Prisma 변경 푸시 -> API만 배포

## Current Status

- Web service is serving successfully.
- API service is serving successfully and connected to Cloud SQL.
- Web app proxies API requests to the API Cloud Run service.

## Next Recommendations

- 운영용 인증 도입
- 초기 시드 데이터/관리자 계정 정리
- 커스텀 도메인 연결
