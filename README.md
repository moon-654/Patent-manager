# 직무발명 통합 관리 시스템 MVP

문서 중심으로 정리되어 있던 직무발명 관리 요구사항을 실행 가능한 코드베이스로 옮긴 모노레포입니다.

## 구성

- `apps/api`: NestJS 기반 API, Swagger 문서, 인메모리 MVP 워크플로우 서비스, Prisma 스키마
- `apps/web`: Next.js 기반 PC 웹 UI
- `prisma`: 관계형 데이터 모델 초안
- `docs/plans`: 설계 및 구현 문서

## 포트 규칙

이 앱은 `Research Lab` 범주의 앱 번호 `02`를 사용합니다.

- Backend API: `22020`
- Frontend UI: `22021`

공통 기본 포트인 `3000`, `4000`, `8000`, `8080`을 이 프로젝트의 체크인된 실행 스크립트에서 사용하지 않습니다.

## 빠른 시작

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run dev
```

## 기본 접속

- 웹: `http://localhost:22021`
- API: `http://localhost:22020/api/v1`
- Swagger: `http://localhost:22020/api/docs`

## 개발 메모

- MVP는 문서의 1차 구현 범위를 기준으로 `신고 -> 심의 -> 특허 -> 보상 -> 정책` 흐름을 우선 구현합니다.
- API는 데모 가능한 워크플로우를 위해 인메모리 상태 저장을 사용하고, Prisma 스키마로 영속 모델을 함께 정의합니다.
- 로컬 로그인은 시드 사용자 선택 기반으로 동작합니다.
