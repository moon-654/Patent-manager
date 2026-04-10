# On-prem Deployment

이 디렉터리는 사내 서버 또는 내부망 환경에서 사용하는 운영 가이드를 담습니다.

기본 운영 조합:

- `web`
- `api`
- `postgres`

실행용 compose 파일:

- 루트 `docker-compose.onprem.yml`
- `deploy/onprem/docker-compose.onprem.yml`

기본 실행:

```bash
cp .env.onprem.example .env.onprem
docker compose --env-file .env.onprem -f docker-compose.onprem.yml up -d --build
```
