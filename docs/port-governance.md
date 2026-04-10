# Patent Manager Local Port Governance

## Assigned App Number

- Category: `22` Research Lab
- App name: `Patent Manager`
- App number: `02`

## Fixed Ports

- Backend API: `22020`
- Frontend UI: `22021`

## Rules

- Do not use `3000`, `4000`, `8000`, or `8080` in checked-in scripts for this app.
- Keep `5432` and `6379` as local infrastructure ports for PostgreSQL and Redis.
- Use the same frontend/backend ports for local development and LAN access unless a future reverse proxy changes the external entrypoint.

## Applied Files

- `apps/api/package.json`
- `apps/web/package.json`
- `.env.example`
- `apps/api/src/main.ts`
- `README.md`
