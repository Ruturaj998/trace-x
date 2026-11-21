# TRACE-X frontend

From this directory, use Node.js 24 LTS and run `npm ci`, then `npm run dev`. Open `http://127.0.0.1:5173` with the API running at `http://127.0.0.1:8000`. On Windows use `npm.cmd` if PowerShell blocks the npm script shim.

Run `npm run lint`, `npm test` and `npm run build`. The current Node tests inspect source contracts. Vite writes the production bundle to `dist/`.

For the included Nginx deployment, build with `VITE_API_BASE_URL=/api` and set `VITE_SITE_URL` to the public HTTPS origin. See the [project README](../README.md) for API setup and the [managed demo plan](../docs/DEMO_DEPLOYMENT.md) for other hosting options.
