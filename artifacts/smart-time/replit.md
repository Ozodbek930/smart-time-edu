# SMART TIME EDUCATION - IELTS Preparation Platform

## Overview

SMART TIME EDUCATION is a full-stack web application for IELTS exam preparation. It covers all four IELTS modules: Speaking, Listening, Reading, and Writing. Students can register, practice with test content, and receive AI-powered feedback on their writing. Admins can manage all test content, site text, users, and view test results through a dedicated admin panel. The platform supports three languages: English, Russian, and Uzbek.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React with TypeScript, bundled via Vite
- **Routing**: `wouter` (lightweight client-side routing)
- **Data Fetching**: TanStack React Query v5 — handles caching, invalidation, and server state
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming; yellow/amber color scheme
- **Animations**: Framer Motion for page transitions, hover effects, and stagger animations
- **Forms**: React Hook Form with `@hookform/resolvers` and Zod for validation
- **Internationalization**: Custom context-based i18n system in `client/src/lib/i18n.tsx` supporting EN, RU, UZ
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

**Pages:**
- `/` — Public home page with hero, stats, tips
- `/register` and `/login` — Auth pages
- `/dashboard` — Student personal area showing progress (auth required)
- `/speaking`, `/listening`, `/reading`, `/writing` — Test practice pages for each IELTS module (full-screen exam mode with configurable timer, question nav bar, auto-submit)
- `/fullmock` — Full Mock listing page
- `/fullmock/:id` — Full Mock exam overview/intro page (shows rules, section list, Start/Resume button)
- `/fullmock/:id/section/:step` — Individual section exam page (dedicated full-screen exam per section, no back navigation, no answer feedback, each section has its own timer; localStorage tracks progress and locks completed sections)
- `/online-lessons` — Student page listing all active online lessons (auth required)
- `/online-lesson/:id` — Student test-taking page with live countdown timer, MCQ + text questions, auto-submit on timer expiry
- `/admin` — Admin-only management panel (CRUD for all test types, users, site content, results)
- `/admin/mock-builder` — Visual Mock Test Builder (create new full mock exam)
- `/admin/mock-builder/:id` — Edit existing full mock exam via builder

### Backend Architecture

- **Framework**: Express.js (Node.js), TypeScript, run with `tsx` in development
- **Session Management**: `express-session` with `memorystore` for in-memory session storage
- **File Uploads**: `multer` — handles audio files (MP3/WAV/OGG/M4A, up to 50MB) and PDFs stored in an `uploads/` directory
- **Email**: `nodemailer` with Gmail SMTP — sends welcome emails on registration (requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` env vars)
- **AI Writing Evaluation**: Google Gemini API (`@google/genai`) via `server/gemini.ts` — evaluates IELTS writing submissions using the official 9-band scoring system across 4 criteria
- **Storage Layer**: `server/storage.ts` defines an `IStorage` interface; the PostgreSQL implementation uses Drizzle ORM
- **Seed Data**: `server/seed.ts` auto-populates the DB with sample tests and a default admin account on first run

**API Route Structure:**
- `/api/auth/*` — register, login, logout, current user (`/api/auth/me`)
- `/api/speaking-tests`, `/api/listening-tests`, `/api/reading-tests`, `/api/writing-tests` — CRUD for test content (admin protected for write operations)
- `/api/test-results` — Store and retrieve student test results
- `/api/site-content` — Editable homepage text key-value pairs
- `/api/upload` — File upload endpoint for audio/PDF
- `/api/writing/evaluate` — Triggers Gemini AI evaluation

**Replit AI Integrations** (`server/replit_integrations/`):
- `chat/` — Conversation and message management with Gemini chat API
- `image/` — Image generation using `gemini-2.5-flash-image`
- `batch/` — Batch processing utility with concurrency limits and retry logic (using `p-limit` and `p-retry`)

### Data Storage

- **Database**: PostgreSQL via `drizzle-orm/node-postgres`; connection string from `DATABASE_URL` env var
- **ORM**: Drizzle ORM with schema defined in `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: `drizzle-kit` with `drizzle-kit push` for schema deployment

**Exam Layout Rule**: All sections/parts within a module use a **continuous scroll layout** — no navigation buttons between parts inside a test. `MultiSectionListeningExam`, `FullListeningExam`, `MultiSectionReadingExam`, and `FullReadingExam` all render all their sections stacked vertically with a single shared timer. Navigation buttons only exist between main modules (Listening → Reading → Writing → Speaking) in Full Mock.

**Database Tables:**
- `users` — id (UUID), username, password, fullName, parentPhone, email, isAdmin
- `speaking_tests` — id, title, part (1-3), topic, description, questions (text array), tips (text array), difficulty, duration
- `listening_tests` — id, title, section (1-4), topic, description, questions (JSONB), audioUrl, difficulty, duration, testSections (JSONB — for multi-section tests)
- `reading_tests` — id, title, passage, pdfUrl, topic, description, questions (JSONB), difficulty, duration, testSections (JSONB — for multi-passage tests)
- `writing_tests` — id, title, task (1 or 2), topic, description, prompt, tips, sampleAnswer, difficulty, duration
- `site_content` — id, key, value (editable homepage text blocks)
- `test_results` — id, userId, testType, testId, score, totalQuestions, answers (JSONB), completedAt
- `conversations` + `messages` — for the Replit chat integration

### Authentication and Authorization

- **Mechanism**: Session-based authentication using `express-session`
- **Session Store**: `memorystore` (in-memory; sessions are lost on server restart)
- **Auth Flow**: POST `/api/auth/login` → sets `req.session.userId`; `/api/auth/me` returns current user or 401
- **Admin Access**: `isAdmin` boolean on the `users` table; admin routes check this flag server-side
- **Default Admin**: username `admin`, password `admin123` (created by seed script)
- **Passwords**: Stored as plain text in the current implementation — this should be hashed with bcrypt in production

### Build System

- **Dev**: `tsx server/index.ts` with Vite middleware for HMR
- **Production Build**: Custom `script/build.ts` runs Vite for the client, then esbuild for the server (bundles key server deps to reduce cold start times, outputs to `dist/`)

## External Dependencies

### APIs and AI Services
- **Google Gemini API** (`@google/genai`): Used for IELTS writing evaluation (`server/gemini.ts`) and Replit AI integrations (chat, image generation, batch processing). Requires `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL` env vars (provided by Replit AI Integrations)

### Email Service
- **Gmail SMTP via Nodemailer**: Sends registration confirmation emails. Requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` (Google App Password) env vars. Gracefully skips if not configured.

### Database
- **PostgreSQL**: Required via `DATABASE_URL` env var. Used for all persistent data storage.

### Key NPM Packages
- `drizzle-orm` + `drizzle-zod` — ORM and schema validation
- `express-session` + `memorystore` — Session management
- `multer` — File upload handling
- `framer-motion` — UI animations
- `@tanstack/react-query` — Server state management
- `wouter` — Client-side routing
- `radix-ui/*` + `shadcn/ui` — Accessible UI primitives
- `p-limit` + `p-retry` — Concurrency and retry logic for batch AI processing

### Environment Variables Required
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Gemini API key (Replit AI Integrations) |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Gemini base URL (Replit AI Integrations) |
| `GMAIL_USER` | Gmail address for sending emails (optional) |
| `GMAIL_APP_PASSWORD` | Gmail App Password (optional) |