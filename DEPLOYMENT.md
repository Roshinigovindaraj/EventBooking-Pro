# Deployment configuration

The frontend and API are separate applications. Vercel hosts the Vite frontend; the Express `server` must be running on a Node.js host such as Render or Railway.

## Frontend (Vercel)

Set the Vercel project root to `client` and add this environment variable for Production and Preview:

```env
VITE_API_BASE_URL=https://YOUR-BACKEND-HOST/api/v1
```

The URL must be the public HTTPS address of the deployed Express server, not `localhost`. Redeploy after changing a `VITE_*` variable because Vite embeds it during the build.

The `client/vercel.json` rewrite sends direct requests for React routes (for example `/portal/organizer`, `/auth/login`, and `/booking/123`) to `index.html`. Keep the Vercel project root set to `client` so this configuration is applied.

## Backend

Set the backend root to `server`, use `npm start`, and configure all variables from `server/.env.example`. In particular:

```env
NODE_ENV=production
CLIENT_URL=https://event-booking-pro.vercel.app
COOKIE_SECURE=true
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Create the Cloudinary credentials in **Cloudinary Console → Settings → API Keys**. Add all three values only to the backend host; never expose `CLOUDINARY_API_SECRET` through a `VITE_*` frontend variable. Organizer uploads are stored in the `eventoria/events` Cloudinary folder.

For Vercel preview deployments, add each trusted preview origin to the comma-separated `CLIENT_URL`; do not use `*` with credentialed requests.

Verify the deployment before testing registration:

```text
https://YOUR-BACKEND-HOST/api/v1/health
```

