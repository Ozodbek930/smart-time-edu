# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Smart Time Education (`artifacts/smart-time`)
- Full IELTS preparation platform (React + Vite + Express + PostgreSQL)
- Runs as a monolithic server (Express serves API + Vite frontend)
- Port: 22168, Preview path: `/`
- Dev command: `pnpm --filter @workspace/smart-time run dev` (runs `tsx server/index.ts`)
- Admin credentials: username `admin`, password `admin123`
- AI writing evaluation via Gemini API (requires `GEMINI_API_KEY`)
- Email on registration via Gmail SMTP (requires `GMAIL_USER` and `GMAIL_APP_PASSWORD`)
- DB schema: `artifacts/smart-time/shared/schema.ts` (uses its own drizzle config)
- Run `pnpm --filter @workspace/smart-time run db:push` to sync schema changes

### Full Mock Exam Flow
- Intro (`/fullmock/:id`) → Section pages (`/fullmock/:id/section/0,1,2…`) → Results (`/fullmock/:id/results`)
- `FullMockSection` groups `activeSections` by consecutive type into `groupedSteps` (e.g. all Listening = 1 step)
- Multi-test components: `MultiListeningSectionExam` (all listening stacked), `MultiReadingSectionExam` (all reading stacked)
- Single-test groups use the original `ListeningSectionExam`, `ReadingSectionExam`, `WritingSectionExam`, `SpeakingSectionExam`
- Top bar shows one amber tab per grouped step; progress bar is amber; old "Parts:" sub-bar removed
- Timer spans sum of all test durations in a group
