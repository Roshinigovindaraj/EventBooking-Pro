# Eventoria API v1

Base path: `/api/v1`

All errors use:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

Protected endpoints require `Authorization: Bearer <access-token>`. Refresh tokens are HttpOnly cookies scoped to `/api/v1/auth`.

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
- `POST /venue-reservations`
- `GET /venue-reservations/me`
- `GET|POST /wishlist`
- `DELETE /wishlist/:id`
- `POST /payments/create-order`
- `POST /payments/mock-confirm` — non-production mock mode only

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

