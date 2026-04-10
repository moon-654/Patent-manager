# Patent Manager Local Port Governance

## Assigned App Number

- Category: `22` Research Lab
- App name: `Patent Manager`
- App number: `02`

## Fixed Ports

- Backend API: `22020`
- Frontend UI: `22021`
- PostgreSQL (on-prem host binding): `22022`
- Redis (reserved if needed): `22023`

## Rules

- Do not use `3000`, `4000`, `8000`, or `8080` in checked-in scripts for this app.
- Infrastructure ports exposed to the host should also follow the app-number rule.
- Keep container-internal defaults (`5432`, `6379`) inside Docker networks when needed.
- Use the same frontend/backend ports for local development and LAN access unless a future reverse proxy changes the external entrypoint.

## Applied Files

- `apps/api/package.json`
- `apps/web/package.json`
- `.env.example`
- `.env.onprem.example`
- `docker-compose.onprem.yml`
- `apps/api/src/main.ts`
- `README.md`
