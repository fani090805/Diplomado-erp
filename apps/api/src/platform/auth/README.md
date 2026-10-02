# Auth platform service

`index.ts` is the public entry point. Passwords use Argon2id through the `argon2` package.

The API exposes `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, and `GET /api/v1/auth/me`. Access tokens expire after 15 minutes. Refresh tokens are hashed at rest and rotated transactionally; replaying a rotated token is rejected.

Account provisioning, tenant/company/user repositories, invitations, native SecureStore integration, and web `httpOnly` cookies remain incomplete. Do not provision production accounts by writing directly to the identity collection.
