# {{projectName}}

A NestJS API for mobile apps (Expo, React Native, Flutter, or native), with PostgreSQL via Prisma, JWT access tokens, rotating refresh tokens, device push-token registration, validation, throttling, Helmet, tests, CI, Dependabot, and Docker.

## Development

```sh
cp .env.example .env
docker compose up -d postgres
{{pm}} install
{{pm}} run prisma:migrate
{{pm}} run start:dev
```

Replace `JWT_ACCESS_SECRET` in `.env` with a real secret (`openssl rand -base64 48`). The API listens on http://localhost:3000; the health check is `GET /health`.

## Endpoints (prefix `/api/v1`)

| Method | Path              | Auth   | Purpose                                     |
| ------ | ----------------- | ------ | ------------------------------------------- |
| POST   | `/auth/register`  | none   | Create an account, returns both tokens      |
| POST   | `/auth/login`     | none   | Returns an access token and a refresh token |
| POST   | `/auth/refresh`   | none   | Exchanges a refresh token for a new pair    |
| POST   | `/auth/logout`    | none   | Revokes a refresh token                     |
| GET    | `/auth/me`        | Bearer | Current user                                |
| POST   | `/devices`        | Bearer | Register a push token (`ios` or `android`)  |
| DELETE | `/devices/:token` | Bearer | Remove a push token                         |

Access tokens are short-lived (15 minutes by default). Refresh tokens are single-use, stored only as SHA-256 hashes, and rotated on every refresh. On the device, keep them in secure storage (Keychain/Keystore, for example `expo-secure-store`), never in plain storage.

## Verification

```sh
{{pm}} run prisma:generate
{{pm}} run lint
{{pm}} test
{{pm}} run build
```

Sending the actual push notifications (APNs/FCM/Expo) is left to you: the server stores tokens and you add a sender service.
