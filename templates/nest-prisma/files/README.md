# {{projectName}}

A NestJS and Prisma API with PostgreSQL, validated configuration, Helmet, request throttling, global DTO validation, unit tests, formatting, linting, Git hooks, CI, Dependabot, and Docker support.

## Development

```sh
cp .env.example .env
{{pm}} install
{{pm}} run prisma:generate
docker compose up -d postgres
{{pm}} run prisma:migrate
{{pm}} run start:dev
```

The health endpoint at `GET /health` checks the database connection. The Compose configuration is for local development only; use managed secrets and a production database configuration when deploying.

## Verification

```sh
{{pm}} test
{{pm}} run lint
{{pm}} run format:check
{{pm}} run build
```

## Docker

```sh
docker build -t {{projectName}} .
docker run --rm -p 3000:3000 --env-file .env {{projectName}}
```

Run migrations against the target database before starting production application instances.
