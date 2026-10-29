# {{projectName}}

A Next.js (App Router) application written in {{languageName}} with linting, formatting, Git hooks, CI, Dependabot, security headers, and a standalone production Docker image.

## Development

```sh
cp .env.example .env.local
{{pm}} install
{{pm}} run dev
```

Open http://localhost:3000. Only variables prefixed with `NEXT_PUBLIC_` are exposed to browser code; never put secrets in them.

## Verification

```sh
{{pm}} run lint
{{pm}} run format:check
{{pm}} run build
```

## Docker

```sh
docker build -t {{projectName}} .
docker run --rm -p 3000:3000 {{projectName}}
```

Basic security headers are set in the Next.js config. A strict Content-Security-Policy needs per-request nonces in Next.js, so add one deliberately once you know which scripts and origins your app uses.
