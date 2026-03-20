# Authentication

Comic Shelf uses JWT-based authentication with HTTP-only cookies.

## Setup Flow

On first launch, navigate to `/setup` to create the initial admin account. This route is only accessible once — subsequent visits redirect to login.

## Login

POST to `/api/auth/login` with `{ username, password }`. On success, an `access_token` cookie is set (HTTP-only, secure).

## JWT Configuration

| Variable | Description | Default |
|---|---|---|
| `JWT_SECRET` | Signing secret | *(required)* |
| `JWT_EXPIRATION` | Token TTL | `7d` |

## Guards

- All routes are protected by `JwtAuthGuard` by default
- Use `@Public()` to skip auth on specific endpoints
- Use `@Roles('ADMIN')` for admin-only routes
