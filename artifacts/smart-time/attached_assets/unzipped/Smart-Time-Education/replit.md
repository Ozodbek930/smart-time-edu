# SMART TIME EDUCATION - IELTS Preparation Platform

## Overview
An IELTS test preparation website covering all four modules: Speaking, Listening, Reading, and Writing. Features a yellow/amber theme, framer-motion animations, trilingual support (EN, RU, UZ), admin panel, and PostgreSQL database.

## Architecture
- **Frontend**: React + TypeScript with Vite, TailwindCSS, shadcn/ui, framer-motion
- **Backend**: Express.js with PostgreSQL (Drizzle ORM) + session-based auth
- **Database**: PostgreSQL via Replit (Drizzle ORM, drizzle-kit for schema push)
- **Routing**: wouter for client-side routing
- **Data fetching**: TanStack React Query
- **i18n**: Custom context-based system (EN, RU, UZ)

## Pages
- `/` - Home page with hero, about section, stats, tips (public, no auth required)
- `/dashboard` - Student personal cabinet with 4 skill module cards, progress stats from DB (requires auth)
- `/speaking` - Speaking practice with Part 1, 2, 3 tabs and expandable question cards
- `/listening` - Listening practice with Section 1-4 tabs and interactive quizzes
- `/reading` - Reading practice with passages, comprehension questions, and answer checking
- `/writing` - Writing practice with Task 1 & Task 2 prompts, tips, sample answers, and submission
- `/register` - Registration form (full name, username, parent phone, password)
- `/login` - Login form → redirects to /dashboard on success
- `/admin` - Admin panel (admin only) with tabs for managing all content

## Admin Panel
- Protected: only accessible to users with `isAdmin: true`
- Default admin account: username "admin", password "admin123"
- Tabs: Homepage Content, Speaking Tests, Listening Tests, Reading Tests, Writing Tests, Users, Test Results
- CRUD operations for all 4 test types
- Site content editing (key-value pairs for homepage text)
- View all users and test results

## Key Components
- `client/src/components/navbar.tsx` - Responsive nav with Home, Dashboard (auth), Admin (admin only) links
- `client/src/pages/dashboard.tsx` - Student dashboard with real progress stats from test_results
- `client/src/pages/admin.tsx` - Full admin panel with tabbed CRUD interface
- `client/src/components/footer.tsx` - Site footer
- `client/src/components/language-switcher.tsx` - EN/RU/UZ language dropdown
- `client/src/lib/i18n.tsx` - Translation context with all strings

## Database Schema (PostgreSQL)
- `users` - id, username, password, fullName, parentPhone, isAdmin
- `speaking_tests` - id, title, part, topic, description, questions[], tips[], difficulty, duration
- `listening_tests` - id, title, section, topic, description, questions (JSONB), difficulty, duration
- `reading_tests` - id, title, passage, topic, description, questions (JSONB), difficulty, duration
- `writing_tests` - id, title, task, topic, description, prompt, tips[], sampleAnswer, difficulty, duration
- `site_content` - id, key, value (for editable homepage text)
- `test_results` - id, userId, testType, testId, score, totalQuestions, answers, completedAt

## Backend
- `server/db.ts` - PostgreSQL connection via Drizzle ORM
- `server/routes.ts` - All API endpoints including admin CRUD
- `server/storage.ts` - DatabaseStorage class implementing IStorage interface
- `server/seed.ts` - Seeds initial tests and admin user

## API Endpoints
### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Public
- `GET /api/speaking-tests` - List speaking tests
- `GET /api/speaking-tests/:id` - Get speaking test
- `GET /api/listening-tests` - List listening tests
- `GET /api/listening-tests/:id` - Get listening test
- `GET /api/reading-tests` - List reading tests
- `GET /api/reading-tests/:id` - Get reading test
- `GET /api/writing-tests` - List writing tests
- `GET /api/writing-tests/:id` - Get writing test
- `GET /api/site-content` - Get site content

### Authenticated
- `POST /api/test-results` - Submit test result
- `GET /api/test-results/my` - Get user's test results

### Admin Only
- `GET /api/admin/users` - List all users
- `GET /api/admin/test-results` - List all test results
- `GET/PUT /api/admin/site-content` - Manage site content
- `POST/PUT/DELETE /api/admin/speaking-tests/:id` - Manage speaking tests
- `POST/PUT/DELETE /api/admin/listening-tests/:id` - Manage listening tests
- `POST/PUT/DELETE /api/admin/reading-tests/:id` - Manage reading tests
- `POST/PUT/DELETE /api/admin/writing-tests/:id` - Manage writing tests

## Theme
- Yellow/amber primary color (hue 45)
- Poppins + Inter font family
- Light mode with dark mode support

## SMS Integration
- Twilio SMS integration planned but not yet configured (user deferred setup)
- Note in future: use Replit Twilio connector for SMS on registration and test completion
