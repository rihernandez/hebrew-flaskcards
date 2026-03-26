# State Gateway - Unified Microservices Documentation

This document is the single source of truth for the segmented microservices architecture under `services/`.

## 1) Architecture Overview

The platform is split into independent services:

- `auth` - registration/login/JWT issuance
- `state-gateway` - HTTP entrypoint for user state APIs (JWT protected)
- `preferences-ms` - user preferences domain
- `learning-ms` - learning/interaction domain
- `progression-ms` - progression/streak/SRS domain
- `content` - read-only educational content APIs
- `redis` - async/sync messaging transport between gateway and state microservices

### Request Flow

1. Mobile app authenticates against `auth` (`/auth/register`, `/auth/login`)
2. Mobile app sends `Bearer <jwt>` to `state-gateway`
3. `state-gateway` validates JWT and routes request to target domain service via Redis transport
4. Domain service reads/writes MongoDB scoped by `userId` from JWT payload

## 2) Service Boundaries

### 2.1 `preferences-ms`

Owns preference-like keys:

- `darkMode`
- `selected_language`
- `wod_seen`
- `wod_date`
- `wod_id`

### 2.2 `learning-ms`

Owns learning activity keys:

- `favorites`
- `error_history`
- `traduccion_errors`
- `dictado_level_progress`
- `seen_*`
- `activity_results_*`

### 2.3 `progression-ms`

Owns long-term progression keys:

- `streak_data`
- `achievements`
- `srs_data`
- `daily_challenge`
- `daily_challenge_history`

## 3) Gateway HTTP API

Base URL: `http://localhost:3010`
Swagger: `http://localhost:3010/docs`

All routes require:

- `Authorization: Bearer <jwt>`

### 3.1 Preferences routes

- `GET /preferences`
- `GET /preferences/:key`
- `PATCH /preferences/:key`
- `POST /preferences/bulk-get`
- `POST /preferences/bulk-set`
- `DELETE /preferences/:key`
- `DELETE /preferences`

### 3.2 Learning-state routes

- `GET /learning-state`
- `GET /learning-state/:key`
- `PATCH /learning-state/:key`
- `POST /learning-state/bulk-get`
- `POST /learning-state/bulk-set`
- `DELETE /learning-state/:key`
- `DELETE /learning-state`

### 3.3 Progression-state routes

- `GET /progression-state`
- `GET /progression-state/:key`
- `PATCH /progression-state/:key`
- `POST /progression-state/bulk-get`
- `POST /progression-state/bulk-set`
- `DELETE /progression-state/:key`
- `DELETE /progression-state`

### Payload contracts

`PATCH /.../:key`

```json
{
  "value": { "any": "json" }
}
```

`POST /.../bulk-get`

```json
{
  "keys": ["favorites", "streak_data"]
}
```

`POST /.../bulk-set`

```json
{
  "entries": [
    { "key": "favorites", "value": ["Hebreo_agua_Sustantivos"] },
    { "key": "darkMode", "value": true }
  ]
}
```

## 4) Redis Messaging Contract

Transport: `@nestjs/microservices` with `Transport.REDIS`

### 4.1 Preferences patterns

- `prefs.list`
- `prefs.get`
- `prefs.set`
- `prefs.bulk_get`
- `prefs.bulk_set`
- `prefs.delete`
- `prefs.clear`

### 4.2 Learning patterns

- `learning.list`
- `learning.get`
- `learning.set`
- `learning.bulk_get`
- `learning.bulk_set`
- `learning.delete`
- `learning.clear`

### 4.3 Progression patterns

- `progression.list`
- `progression.get`
- `progression.set`
- `progression.bulk_get`
- `progression.bulk_set`
- `progression.delete`
- `progression.clear`

## 5) Environment Variables

### `auth`

- `PORT` (default `3001`)
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

### `state-gateway`

- `PORT` (default `3010`)
- `JWT_SECRET` (must match `auth`)
- `REDIS_HOST` (default `localhost`)
- `REDIS_PORT` (default `6379`)

### `preferences-ms`, `learning-ms`, `progression-ms`

- `MONGO_URI`
- `REDIS_HOST` (default `localhost`)
- `REDIS_PORT` (default `6379`)

### `content`

- `PORT` (default `3003`)

## 6) Local Run (Docker Compose)

Use:

- [docker-compose.microservices.yml](/home/ykvbnr/Workspace/flaskcard/services/docker-compose.microservices.yml)

From `services/`:

```bash
docker compose -f docker-compose.microservices.yml up --build
```

## 6.1 Documentation Navigation

- Public client API docs (Swagger): `http://localhost:3010/docs`
- Internal docs index: [docs/README.md](/home/ykvbnr/Workspace/flaskcard/services/state-gateway/docs/README.md)
- Internal Redis contracts:
  - [preferences.md](/home/ykvbnr/Workspace/flaskcard/services/state-gateway/docs/contracts/preferences.md)
  - [learning.md](/home/ykvbnr/Workspace/flaskcard/services/state-gateway/docs/contracts/learning.md)
  - [progression.md](/home/ykvbnr/Workspace/flaskcard/services/state-gateway/docs/contracts/progression.md)

## 7) Mobile Migration Map (AsyncStorage -> API)

| Legacy key | New API domain |
|---|---|
| `darkMode`, `selected_language`, `wod_*` | `/preferences/*` |
| `favorites`, `error_history`, `traduccion_errors`, `dictado_level_progress`, `seen_*`, `activity_results_*` | `/learning-state/*` |
| `streak_data`, `achievements`, `srs_data`, `daily_challenge`, `daily_challenge_history` | `/progression-state/*` |

## 8) Security Notes

- Gateway trusts JWT signature from `auth` using shared `JWT_SECRET`.
- Domain services are not publicly exposed; they should only receive traffic via Redis from gateway.
- Data ownership is enforced by `userId` from JWT payload (`sub`).

## 9) Next Recommended Steps

1. Add request/response tracing IDs from gateway to microservices.
2. Add schema validation per key type (beyond generic JSON `value`).
3. Add versioned state DTOs for backward compatibility with old app clients.
4. Add integration tests for each domain boundary.
