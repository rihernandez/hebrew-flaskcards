# API Docs Strategy

This project uses a two-layer documentation strategy:

## 1) Public API (for mobile/web clients)

Single unified Swagger in gateway:

- URL: `http://localhost:3010/docs`
- Owner: `state-gateway`
- Scope: only public HTTP endpoints consumed by clients

Why:

- single contract for client teams
- stable API surface
- hides internal service topology

## 2) Internal Contracts (for backend teams)

Redis message contracts are documented per domain under `docs/contracts/`:

- [preferences.md](/home/ykvbnr/Workspace/flaskcard/services/state-gateway/docs/contracts/preferences.md)
- [learning.md](/home/ykvbnr/Workspace/flaskcard/services/state-gateway/docs/contracts/learning.md)
- [progression.md](/home/ykvbnr/Workspace/flaskcard/services/state-gateway/docs/contracts/progression.md)

These are not OpenAPI endpoints; they are service-to-service contracts.
