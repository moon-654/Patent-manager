# Cloud Deployment

Cloud 운영은 `deploy/cloud` 디렉터리를 기준으로 관리합니다.

주요 파일:

- `deploy/cloud/cloudbuild.web.yaml`
- `deploy/cloud/cloudbuild.api.yaml`
- `deploy/cloud/cloud-run.web.yaml`
- `deploy/cloud/cloud-run.api.yaml`
- `deploy/cloud/cloud-run.web.env.example.yaml`
- `deploy/cloud/cloud-run.api.env.example.yaml`

운영 원칙:

- 웹과 API는 별도 Cloud Run 서비스로 분리합니다.
- DB는 GCP Cloud SQL 또는 외부 Postgres/Supabase를 사용할 수 있습니다.
- 문서 저장은 `STORAGE_BACKEND` 환경변수로 `local` 또는 `gcs`를 선택합니다.
- GitHub 자동배포는 cloud 전용 트리거만 사용합니다.
