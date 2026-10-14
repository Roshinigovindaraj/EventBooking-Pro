# Eventoria

Eventoria is a React/Vite frontend with an Express/MongoDB API for discovering events and venues, applying for marketplace roles, and managing bookings.

## Local setup

Requirements: Node.js 20+ and MongoDB (a replica set is recommended because ticket reservations use transactions).

```powershell
npm install
Copy-Item .env.example .env
npm --prefix server install
Copy-Item server\.env.example server\.env
```

Replace the example secrets in `server/.env` with two different cryptographically random values of at least 32 characters. Never commit `.env`.

Run the applications in separate terminals:

```powershell
npm run dev
npm run server:dev
```

Frontend: `http://localhost:5173`  
API health check: `http://localhost:5000/api/v1/health`

## Verification

```powershell
npm test
npm run build
npm run server:test
npm audit --omit=dev
npm --prefix server audit --omit=dev
```

## Security model

- Public registration always creates a `customer`. The registration payload cannot assign privileged roles.
- Organizer and venue-owner access is granted only after an Admin reviews an application.
- Only a Super Admin route can replace a user's role list.
- Access tokens are short-lived. Refresh tokens are stored in HttpOnly cookies and only SHA-256 token digests are persisted.
- Resource ownership is enforced in organizer, venue-owner, customer booking, and wishlist queries.
- Payment confirmation is development-only while `PAYMENT_MODE=mock`; the mock endpoint is unavailable in production.
- Ticket check-in is a conditional atomic update, so a ticket cannot be accepted twice.

## Current implementation boundary

Implemented foundations include authentication, role checks, public catalog queries, customer event bookings, venue reservation requests, wishlists, organizer/venue-owner applications, listing drafts and review, Admin moderation, Super Admin role assignment, development mock checkout, ticket issuance/check-in, venue-staff tasks, and audit records.

The following production work remains intentionally incomplete: live payment and refund adapters, signed webhooks, reservation-expiry worker, concurrency-proof venue time-slot locking, QR image rendering, identity passes, meal entitlement/redemption, notification delivery, file uploads, email verification/password reset, reporting/settlement calculations, complete role dashboards, end-to-end tests, and production hosting configuration. Development mock payments must never be represented as real payments.

