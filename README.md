# init-proj

A configuration-driven project scaffolder for web, backend, and mobile projects. Templates declare which languages they support, the engine enforces those rules, and shared quality defaults (formatting, hooks, CI, dependency updates) are inherited by every template.

## Templates and compatibility rules

A template only accepts the languages listed for it. Unsupported combinations are rejected with a clear message, and the wizard never offers them.

| Template       | Type     | Languages              | Stack                                                                  |
| -------------- | -------- | ---------------------- | ---------------------------------------------------------------------- |
| `react-vite`   | frontend | TypeScript, JavaScript | React 19 single-page app on Vite, production Nginx image               |
| `react-next`   | frontend | TypeScript, JavaScript | Next.js 16 App Router with security headers, standalone Docker         |
| `expo`         | mobile   | TypeScript, JavaScript | React Native + Expo Router (iOS, Android, web), Jest tests             |
| `flutter`      | mobile   | Dart                   | Flutter for iOS and Android with strict analysis (needs the SDK)       |
| `node-express` | backend  | JavaScript, TypeScript | Express 5, Helmet, rate limiting, Zod-validated environment            |
| `nest-prisma`  | backend  | TypeScript             | NestJS 11, Prisma 6, PostgreSQL, validation, throttling                |
| `mobile-api`   | backend  | TypeScript             | `nest-prisma` plus JWT access/refresh auth and push-token registration |

React is deliberately offered on more than one toolchain (Vite or Next.js), and every template exposes only the languages its framework actually supports (for example NestJS is TypeScript-only, Flutter is Dart-only).

For a mobile product, pair a mobile front end (`expo` or `flutter`) with the `mobile-api` back end by running the CLI once for each.

Node-based templates also receive Prettier, Husky, lint-staged, EditorConfig, GitHub Actions CI, Dependabot, `.nvmrc`, and `.gitignore`. Server and web templates add a Dockerfile; mobile templates intentionally do not. An audit command runs after installation and only warns on failure.

## Install the CLI

Node.js 18.17 or newer is required. Generated projects expect Node.js 20 or newer (`.nvmrc` selects 22).

```sh
npm install
npm link
```

## Usage

```sh
# Interactive wizard: asks only for what you did not pass
init-proj

# Explicit and script-friendly
init-proj node-express my-api --lang ts --pm pnpm --git
init-proj react-next my-site --lang js
init-proj expo my-app --lang typescript
init-proj flutter my_app
init-proj nest-prisma my-api -y

# Discovery
init-proj --list
init-proj --help
```

The wizard asks for: project type, language, framework (filtered to that language), project name, package manager (skipped for non-Node templates such as Flutter), Git, whether to install, then a final confirmation.

Options:

- `--lang <language>` selects the language (`typescript`/`ts`, `javascript`/`js`, `dart`). Without it, the template's first language is used (or you are asked, interactively).
- `--pm npm|pnpm|yarn|bun` selects the package manager. Without it, the launching manager is detected, then npm.
- `--git` / `--no-git` initialize or skip a repository. Git is initialized before installation so Husky can register hooks.
- `--install` / `--no-install` install without asking, or copy files only (also skips bootstrap and post-install commands).
- `-y`, `--yes` disable prompts. Prompts are also disabled when not in a TTY or when `CI` is set.

Project names may contain letters, numbers, hyphens, and underscores. Flutter additionally needs a valid Dart package name; hyphens are converted to underscores for it.

## How templates work

```text
templates/
├── _shared/files/                 # inherited by templates that "extend" it
└── react-vite/
    ├── _structure.json            # manifest
    ├── files/                     # applied for every language
    ├── languages/
    │   ├── typescript/files/      # applied only for TypeScript
    │   └── javascript/files/      # applied only for JavaScript
    └── pm/
        └── pnpm/files/            # applied only for that package manager
```

Layers are applied in order: parent template, then `files/`, then `languages/<language>/files/`, then `pm/<manager>/files/`. Later files override earlier ones, except `package.json`, which is deep-merged (objects merge, arrays union, `null` deletes a key). That is how a language layer adds `typescript` and a `build` script to a shared base without duplicating it.

Manifest fields:

```json
{
  "framework": "React + Vite",
  "projectType": "frontend",
  "languages": ["TypeScript", "JavaScript"],
  "description": "React single-page app on Vite",
  "extends": "_shared",
  "exclude": ["Dockerfile"],
  "ecosystem": "node",
  "rules": { "requires": [{ "command": "flutter", "hint": "install the Flutter SDK" }] },
  "bootstrap": ["flutter create --project-name {{dartName}} ."],
  "directories": ["src"],
  "postInstall": ["{{pm}} run prisma:generate"],
  "audit": "{{pm}} audit",
  "nextSteps": ["cd {{projectName}}", "{{pm}} run dev"]
}
```

- `languages`: the supported languages; the first is the default. This is the compatibility rule.
- `extends`: parent files, directories, and commands come first; `nextSteps` replaces the parent's list.
- `exclude`: inherited paths to delete (for example, no Dockerfile for a mobile app).
- `ecosystem`: `node` (default) or another value such as `dart`, which skips package-manager prompts and checks.
- `rules.requires`: external tools that must exist when installing. Missing ones fail early with the install hint.
- `bootstrap`: generator commands run before files are copied, so template files can refine the generator's output (used for `flutter create`).
- Placeholders in text files and commands: `{{projectName}}`, `{{pm}}`, `{{language}}` (slug), `{{languageName}}`, `{{dartName}}`, `{{identifier}}`.
- Store `.gitignore` as `_gitignore` and `.npmrc` as `_npmrc`; npm strips the real names from published packages and the engine restores them.
- In YAML and JSX, quote placeholders (`'{{projectName}}'`) so Prettier cannot reshape them.

To add a template, create a directory with `_structure.json` and layers. It appears in `--list` and in the wizard automatically.

## Verification status

All 25 CLI tests run without downloading dependencies. They cover every template and language combination, the compatibility rules, layering and merging, and a scan that fails if any generated file keeps an unreplaced placeholder.

Generated projects were additionally installed and exercised end to end while building this version:

- `react-vite` (TS, JS) and `react-next` (TS, JS): lint, format check, production build; Next.js security headers confirmed at runtime.
- `node-express` (TS, JS): lint, format check, typecheck, tests, build; compiled server run and probed.
- `expo` (TS, JS): lint, format check, typecheck, Jest, and a real Metro/Hermes Android bundle export.
- `mobile-api`: lint, format check, build, unit tests, and a full register, login, refresh-rotation, and device flow over HTTP against the real Nest app using an in-memory database.

Not verified in that environment: `prisma generate` and migrations against a real PostgreSQL (the Prisma engine download was unavailable, so a typed stand-in was used), and `flutter` (the SDK was not installed), so the Flutter template's `flutter analyze` and `flutter test` have not been run.

## Security notes

Template `bootstrap`, `postInstall`, and `audit` fields execute shell commands. Only use templates you trust and review new commands first. This version supports local templates only and never fetches remote repositories.

The generated security baseline is a starting point, not a substitute for threat modeling, secret management, dependency review, database backups, or production hardening. Placeholder values such as the `mobile-api` development JWT secret and the `com.example.*` mobile identifiers must be replaced before deployment.

## CLI development

```sh
npm test
npm run check
```
