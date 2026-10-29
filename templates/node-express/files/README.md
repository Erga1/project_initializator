# {{projectName}}

An Express API written in {{languageName}} with Helmet, CORS, rate limiting, Zod-validated environment variables, tests, formatting, linting, Git hooks, CI, Dependabot, and Docker support.

## Development

```sh
cp .env.example .env
{{pm}} install
{{pm}} run dev
```

The health endpoint is available at `http://localhost:3000/health`.

## Verification

```sh
{{pm}} test
{{pm}} run lint
{{pm}} run format:check
```

## Docker

```sh
docker build -t {{projectName}} .
docker run --rm -p 3000:3000 --env-file .env {{projectName}}
```
