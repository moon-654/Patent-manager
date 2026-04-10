# On-prem Deployment

On-prem 운영은 Docker Compose 기반으로 관리합니다.

기본 파일:

- `docker-compose.onprem.yml`
- `.env.onprem.example`

기본 구성:

- `web`
- `api`
- `postgres`

운영 원칙:

- 기능 코드는 cloud/on-prem으로 분기하지 않습니다.
- 환경 차이는 env와 compose 설정으로만 나눕니다.
- 문서 저장은 로컬 볼륨을 기본값으로 사용합니다.
- reverse proxy, TLS, 백업 자동화는 2차 운영 옵션으로 둡니다.
