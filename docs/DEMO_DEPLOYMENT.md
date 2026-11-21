# Managed demo deployment

Use the repository Dockerfile for one HTTPS web service with external PostgreSQL. The image builds the frontend with Node, then runs Uvicorn as a non-root user. The `app.web:create_app` factory mounts FastAPI at `/api` and serves the React build at `/`. Set the platform health path to `/api/health` and leave `API_ROOT_PATH` unset.

Build from the repository root with `docker build --build-arg VITE_SITE_URL=https://your-domain.example -t trace-x .`. The default command uses `PORT` (8000 by default) and `WEB_CONCURRENCY` (one worker by default). For a native deployment, install `requirements.txt`, build `frontend` with `VITE_API_BASE_URL=/api`, then run `uvicorn app.web:create_app --factory --host 0.0.0.0 --port "$PORT"`. Keep the browser and API on one HTTPS origin and leave production CORS empty.

Configure `ENVIRONMENT=production`, a generated `SECRET_KEY`, `FRONTEND_URL`, `DATABASE_URL` and a small connection pool. Follow [Database bootstrap](DATABASE_BOOTSTRAP.md) from an authorized workstation before startup. Configure the platform health path as `/api/health`. Check the homepage, direct navigation to a private route, cookie login, a device write, and telemetry ingestion using synthetic readings against a disposable demo account.

## Free-tier options and tradeoffs

- **Render Free web service** can host one container or compatible build and supplies managed HTTPS. The service sleeps after 15 minutes without traffic, can take about one minute to wake, and shares 750 monthly instance hours per workspace. The runtime filesystem is ephemeral. Free services block common SMTP ports, so production reset email needs a compatible delivery method and should be treated as unavailable on this configuration until verified. Static hosting is an alternative for the frontend, with the same-origin proxy still required for unrelated domains. [Render free-tier limits](https://render.com/docs/free) · [Health checks](https://render.com/docs/health-checks)
- **Neon Free** is an external PostgreSQL option. As of November 21, 2026 its published limits include 100 compute-unit hours and 1 GB storage per project, with compute scaling down after five idle minutes. The Render free PostgreSQL alternative expires after 30 days. Confirm account eligibility, billing settings, transfer allowances and current terms before provisioning. [Neon plans](https://neon.com/docs/introduction/plans) · [Render free PostgreSQL](https://render.com/docs/free)

All PostgreSQL-backed workers share the same sliding-window rate limits after migration 004. Configure an SMTP relay reachable from the hosting service and supply the verified sender and `FRONTEND_URL` for reset links. The free configuration is for intermittent demos. A cold start or exhausted quota can delay ingestion. Review backup, retention and provider-specific delivery before inviting production users.

## Local verification

The production image ran with two Uvicorn workers connected through PgBouncer in transaction mode to a disposable PostgreSQL 16 database. Chromium exercised account registration, session login, device registration, a synthetic map fix, navigation at 1366px and 390px, sign-out, password reset, and login with the new password. A private SMTP receiver accepted the message over STARTTLS with certificate verification. Public hosting, delivery through a real email provider, third-party map tile availability and physical GPS reception require separate checks.
