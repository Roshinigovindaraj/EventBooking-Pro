# Deployment configuration

The frontend and API are separate applications. Vercel hosts the Vite frontend; the Express `server` must be running on a Node.js host such as Render or Railway.

## Frontend (Vercel)

Set the Vercel project root to `client` and add this environment variable for Production and Preview:

```env
VITE_API_BASE_URL=https://YOUR-BACKEND-HOST/api/v1
```

The URL must be the public HTTPS address of the deployed Express server, not `localhost`. Redeploy after changing a `VITE_*` variable because Vite embeds it during the build.

## Backend

Set the backend root to `server`, use `npm start`, and configure all variables from `server/.env.example`. In particular:

```env
NODE_ENV=production
CLIENT_URL=https://event-booking-pro.vercel.app
COOKIE_SECURE=true
```

For Vercel preview deployments, add each trusted preview origin to the comma-separated `CLIENT_URL`; do not use `*` with credentialed requests.

Verify the deployment before testing registration:

```text
https://YOUR-BACKEND-HOST/api/v1/health
```

