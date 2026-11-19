# Auth0 test frontend

This copy runs separately from the original frontend on port `4201`.

## Required Auth0 application settings

Add `http://localhost:4201` to:

- Allowed Callback URLs
- Allowed Web Origins
- Allowed Origins (CORS)

Add `http://localhost:4201/login` to Allowed Logout URLs.

## Run

```powershell
cd C:\Users\war92\Documents\sales-system\frontend-auth0
npm install
npm start -- --port 4201
```

If you use pnpm instead, run `pnpm install` and `pnpm start -- --port 4201`.

Then open `http://localhost:4201/login` and select **Continue with Auth0**.

The Go backend now validates Auth0 RS256 access tokens for `/auth/*` routes. Restart the backend after pulling these changes.

For production, configure the backend with:

```text
AUTH0_DOMAIN=dev-tt4k8xbex7v1qfuk.us.auth0.com
AUTH0_AUDIENCE=https://api.shibidi.my
```

Local development uses these values as non-secret defaults. Production release mode requires the environment variables explicitly.
