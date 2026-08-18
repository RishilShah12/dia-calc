# dia-calc

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Hono, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **workers** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **Cloudflare D1** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **PWA** - Progressive Web App support
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses Cloudflare D1 (SQLite) with Drizzle ORM.

Runtime database access uses the Cloudflare `DB` binding from `packages/infra/alchemy.run.ts`. If a local `DATABASE_URL` is present, it is only for database tooling.

Alchemy provisions the D1 database and applies migrations during `dev` and `deploy`.

1. Generate migration files:

```bash
pnpm run db:generate
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
Use the Expo Go app to run the mobile application.
The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@dia-calc/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Deployment

### Cloudflare via Alchemy

- Target: web + server (D1 + Workers)
- Local/dev stage: `pnpm run deploy` (uses `.env` files, stage = your username)
- Production: `pnpm run deploy:prod` (uses `.env.prod` files, stage = `prod`)
- Destroy: `pnpm run destroy`

**Production env files** (gitignored — copy from `*.env.prod.example`):

| File | Keys |
|------|------|
| `packages/infra/.env.prod` | `ALCHEMY_PASSWORD`, `ALCHEMY_STAGE=prod` |
| `apps/server/.env.prod` | Auth secrets, `BETTER_AUTH_URL`, `CORS_ORIGIN`, RapNet, OAuth |
| `apps/web/.env.prod` | `NEXT_PUBLIC_SERVER_URL` |
| `apps/native/.env.prod` | `EXPO_PUBLIC_SERVER_URL` |

After the first prod deploy, Alchemy prints `Server ->` / `Web ->`. Put those URLs into the `.env.prod` files and run `pnpm run deploy:prod` once more so auth/CORS bindings match.

Current prod Workers (after deploy):

- API: `https://dia-calc-server-prod.rishilshah12.workers.dev`
- Web: `https://dia-calc-web-prod.rishilshah12.workers.dev`

For more details, see the guide on [Deploying to Cloudflare with Alchemy](https://www.better-t-stack.dev/docs/guides/cloudflare-alchemy).

### Android release APK (local)

Points the app at the Cloudflare API via `apps/native/.env.prod`:

```bash
pnpm native:apk
```

Output: `apps/native/android/app/build/outputs/apk/release/app-release.apk`  
(Uses the default debug signing unless you configure a release keystore — fine for sideloading.)

The build script mirrors `.env.prod` → `.env.production` for Expo’s release bundler and forces a JS rebundle so `EXPO_PUBLIC_SERVER_URL` is inlined.

Keep `apps/native/.env` on localhost for day-to-day `pnpm android` / Metro.

## Git Hooks and Formatting

- Run checks: `pnpm run check`

## Project Structure

```
dia-calc/
├── apps/
│   ├── web/         # Frontend application (Next.js)
│   ├── native/      # Mobile application (React Native, Expo)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Rapaport price list

The calculator prices stones off the Rapaport list, fetched from the RapNet API. Put your API
credentials — activated at `trade.rapnet.com` → Settings → Privacy → Access Key — in
`apps/server/.env`:

```
RAPNET_CLIENT_ID=...
RAPNET_CLIENT_SECRET=...
```

They are bound to the server Worker only (see `packages/infra/alchemy.run.ts`); the web app never
talks to Rapaport directly. Never commit them.

Rapaport publishes exactly two lists: **Round**, and one **fancy** list (the API calls it `Pear`)
that covers every non-round shape — asking for `shape=Princess` returns HTTP 400. Both are cached in
D1 as one row each and refetched when more than a day old, or on demand via the refresh button.
Rapaport republishes every Thursday at 23:59 ET.

The shape picker in the app lists the shapes a dealer actually trades and maps each to its list; no
per-shape adjustment is hard-coded, because Rapaport publishes those as weekly commentary rather
than data. That adjustment belongs in the back %.

**The Rapaport price list is copyrighted and available to subscribers only.** Every price procedure
is `protectedProcedure` for that reason — do not expose it publicly. Serving it to users beyond your
own subscription requires the per-user OAuth flow, which needs Rapaport to whitelist a redirect URI
first.

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run dev:native`: Start the React Native/Expo development server
- `pnpm run db:generate`: Generate database client/types
- `pnpm run deploy`: Deploy web + server (local Alchemy stage)
- `pnpm run deploy:prod`: Deploy to Cloudflare stage `prod` (loads `.env.prod`)
- `pnpm native:apk`: Build a release APK using `apps/native/.env.prod`
- `pnpm run check`: Run Biome formatting and linting
- `cd apps/web && pnpm run generate-pwa-assets`: Generate PWA assets
