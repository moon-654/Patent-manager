# Patent Manager

직무발명 신고, 심의/평가, 특허, 보상, 정책 관리를 위한 monorepo입니다.

## Repository Rules

- 기능 코드는 하나의 공통 코드베이스로 유지합니다.
- 장기 브랜치 분리는 하지 않고 `main`을 기준으로 개발합니다.
- 환경 차이는 코드 분기가 아니라 `deploy`, `env`, `문서`, `CI/CD` 설정으로만 분리합니다.
- 배포 프로파일의 진실 원천은 `deploy/cloud`, `deploy/onprem`, 루트 env 예시 파일입니다.

## Structure

- `apps/api`: NestJS API
- `apps/web`: Next.js web app
- `prisma`: Prisma schema
- `deploy/cloud`: Cloud Build, Cloud Run, cloud env templates
- `deploy/onprem`: on-prem 운영 메모
- `docs`: 배포/운영/설계 문서

## Common Development

로컬 개발 기본 포트:

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

접속 주소:

- Web: `http://localhost:22021`
- API: `http://localhost:22020/api/v1`
- Swagger: `http://localhost:22020/api/docs`

공통 예시 env:

- `.env.example`
- `.env.common.example`

## Cloud Profile

Cloud 프로파일은 `deploy/cloud`를 기준으로 관리합니다.

주요 파일:

- `deploy/cloud/cloudbuild.web.yaml`
- `deploy/cloud/cloudbuild.api.yaml`
- `deploy/cloud/cloud-run.web.yaml`
- `deploy/cloud/cloud-run.api.yaml`
- `.env.cloud.example`

현재 운영 구조:

- Web service: `patent-manager`
- API service: `patent-manager-api`

현재 운영 URL:

- Web: `https://patent-manager-k6y2romega-du.a.run.app`
- API: `https://patent-manager-api-k6y2romega-du.a.run.app`

추가 문서:

- [deploy-cloud.md](c:/Users/Lenovo/Documents/Workspace/Patent_manager/docs/deploy-cloud.md)

### Cloud Auto Deploy

GitHub push 기반 Cloud Build 트리거는 cloud 전용으로만 유지합니다.

- `patent-manager-web-main`
  - 대상: `apps/web/**`, `apps/web/Dockerfile`, `deploy/cloud/cloudbuild.web.yaml`, 루트 `package*.json`, `.dockerignore`
  - 결과: Cloud Run web service `patent-manager`

- `patent-manager-api-main`
  - 대상: `apps/api/**`, `prisma/**`, `apps/api/Dockerfile`, `deploy/cloud/cloudbuild.api.yaml`, 루트 `package*.json`, `.dockerignore`
  - 결과: Cloud Run API service `patent-manager-api`

즉:

- 웹 변경 푸시 -> 웹만 자동배포
- API 또는 Prisma 변경 푸시 -> API만 자동배포

## On-prem Profile

On-prem 프로파일은 내부망 서버 기준 `web + api + postgres`를 기본 세트로 제공합니다.

주요 파일:

- `docker-compose.onprem.yml`
- `.env.onprem.example`
- `deploy/onprem/README.md`

기본 실행:

```bash
cp .env.onprem.example .env.onprem
docker compose --env-file .env.onprem -f docker-compose.onprem.yml up -d --build
```

보조 스크립트:

- `npm run onprem:up`
- `npm run onprem:down`
- `npm run onprem:logs`

추가 문서:

- [deploy-onprem.md](c:/Users/Lenovo/Documents/Workspace/Patent_manager/docs/deploy-onprem.md)

## Environment Files

- `.env.example`: 공통 최소값
- `.env.common.example`: 공통 운영 키 예시
- `.env.cloud.example`: cloud 운영 예시
- `.env.onprem.example`: on-prem 운영 예시

## Notes

- API는 Postgres 연결만 바꾸면 GCP Cloud SQL 또는 Supabase 같은 외부 Postgres를 모두 사용할 수 있습니다.
- 문서 저장은 `STORAGE_BACKEND` 환경변수로 `local` 또는 `gcs`를 선택할 수 있습니다.
- 내부망 운영은 compose 기준, cloud 운영은 Cloud Build/Cloud Run 기준으로 분리 관리합니다.
