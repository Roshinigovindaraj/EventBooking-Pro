# Eventoria API v1

Base path: `/api/v1`

All errors use:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

Protected endpoints require `Authorization: Bearer <access-token>`. Refresh tokens are HttpOnly cookies scoped to `/api/v1/auth`.

## Role access and frontend workspaces

| Persona | Required role | Frontend workspace | Primary API scope |
| --- | --- | --- | --- |
| Guest | none | `/`, `/discover`, `/venues` | public catalog only |
| Customer | `customer` | `/dashboard` | own bookings, venue reservations, wishlist and profile |
| Event Organizer | `event_organizer` | `/portal/organizer` | own events, bookings and attendees |
| Venue Owner | `venue_owner` | `/portal/venue-owner` | own venues and reservation requests |
| Event Staff | `event_staff` | `/portal/event-staff` | assigned events and ticket check-in |
| Venue Staff | `venue_staff` | `/portal/venue-staff` | assigned operational tasks |
| Admin | `admin` | `/portal/admin` | users, applications, listing approvals and audit logs |
| Super Admin | `super_admin` | `/portal/super-admin` | all admin modules plus role assignment |

Frontend workspace guards and backend `authorize(...)` checks both enforce this matrix. Assign privileged roles through `PATCH /super-admin/users/:id/roles`; adding a role never removes customer access unless the submitted role array intentionally excludes it.

For local/development role testing, run `npm run seed:roles` inside `server`. This creates isolated `@eventoria.local` accounts for every workspace. These accounts and their shared temporary password must not be used in production.

## Public and authentication

- `GET /health`
- `POST /auth/register` — customer registration only
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /events`, `GET /events/:id`
- `GET /venues`, `GET /venues/:id`
- `GET /categories`

## Customer

- `GET|PATCH /users/me`
- `GET /bookings/me`
- `POST /bookings`
- `GET /bookings/:id`
- `PATCH /bookings/:id/cancel`
- `POST /venue-reservations`
- `GET /venue-reservations/me`
- `GET|POST /wishlist`
- `DELETE /wishlist/:id`
- `POST /payments/create-order`
- `POST /payments/mock-confirm` — non-production mock mode only
- `POST /payments/razorpay/order` — creates an order from `{ "bookingId": "<booking object id>" }`
- `POST /payments/razorpay/verify` — verifies payment, confirms the booking, and issues tickets

## Marketplace applications

- `POST /organizer/applications`
- `GET /organizer/applications/me`
- `POST /venue-owner/applications`
- `GET /venue-owner/applications/me`

## Organizer and venue owner

- `GET|POST /organizer/events`
- `PATCH /organizer/events/:id`
- `POST /organizer/events/:id/submit`
- `GET /organizer/bookings`
- `GET|POST /venue-owner/venues`
- `POST /venue-owner/venues/:id/submit`
- `GET /venue-owner/reservations`

## Staff and administration

- `GET /event-staff/assignments`
- `POST /tickets/check-in`
- `GET /venue-staff/tasks`
- `PATCH /venue-staff/tasks/:id`
- `GET /admin/applications`
- `POST /admin/applications/:id/review`
- `POST /admin/events/:id/review`
- `POST /admin/venues/:id/review`
- `GET /admin/users`
- `PATCH /admin/users/:id/status`
- `GET /admin/audit-logs`
- `PATCH /super-admin/users/:id/roles`

