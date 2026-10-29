# {{projectName}}

A React and Vite application written in {{languageName}} with linting, formatting, Git hooks, CI, Dependabot, and a production Nginx Docker image.

## Development

```sh
{{pm}} install
{{pm}} run dev
```

Copy `.env.example` to `.env.local` when you need local environment variables. Vite exposes only variables prefixed with `VITE_` to browser code; never put secrets in them.

## Verification

```sh
{{pm}} run lint
{{pm}} run format:check
{{pm}} run build
```

## Docker

```sh
docker build -t {{projectName}} .
docker run --rm -p 8080:80 {{projectName}}
```
