# Coaching Platform API

Multi-tenant backend for instructors, courses, reusable lessons, learner progress, timers, theming, notifications, reports, analytics, and tenant administration. It is built with NestJS, Prisma, MySQL, and JWT authentication.

Payment processing is intentionally not implemented in this version because the POK merchant/API contract is still required. Course pricing, currency, billing type, and enrollment tables are ready for that integration. Video playback access uses short-lived, learner-specific tokens and records a dynamic watermark value; the video hosting provider remains responsible for encrypted HLS/DASH streams when DRM is required.

## Run locally

1. Install dependencies:

```powershell
npm install
```

2. Copy `.env.example` to `.env`, then set a MariaDB/MySQL connection string and a long random JWT secret:

```env
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/coaching_platform"
JWT_SECRET="use-a-long-random-secret"
JWT_EXPIRES_IN="15m"
PORT=3000
```

3. Apply the database schema and generate the client:

```powershell
npx prisma migrate dev
npx prisma generate
```

4. Start the server:

```powershell
npm run start:dev
```

Open Swagger at [http://localhost:3000/docs](http://localhost:3000/docs).

## Authentication

For a new empty database, call `POST /auth/bootstrap` once in Swagger. It creates the first active tenant and platform-admin account, then returns an access token. The endpoint is permanently unavailable after the first tenant is created.

Learners self-register with `POST /auth/register` using the branded `tenantSlug` (the legacy `tenantId` is still accepted). Instructors self-register and create their own branded tenant with `POST /auth/register/instructor`. `POST /auth/login` accepts either tenant slug or tenant ID and returns an access token. In Swagger, click **Authorize** and paste the `accessToken` value only; Swagger adds the `Bearer ` prefix automatically.

Instructor and administrator operations require an `ADMIN` or `INSTRUCTOR` role. Tenant IDs and creator/upload fields are taken from the authenticated token for tenant-owned records.

## Frontend workflow API

The frontend should use the named workflow endpoints in Swagger, not database-table CRUD routes:

- `/instructor/courses` creates and lists courses; a course has dedicated builder, publish, archive, duplicate, module, and lesson routes.
- `/instructor/library` is the searchable reusable lesson library; `/instructor/timers` creates timer configurations and lesson timer routes attach them.
- `/learning/my-courses` and `/learning/lessons/{lessonId}/progress` provide learner dashboard and progress persistence.
- `/public/{tenantSlug}/courses` exposes the public instructor catalog and free previews; `/learning/courses/{courseId}` returns the full purchased course tree.
- `/public/{tenantSlug}/videos/{videoId}/access` and `/playback` serve only explicitly marked free-preview video sessions to guests. Paid playback requires the authenticated learner who created the short-lived token.
- `/learning/videos/{videoId}/access` creates a five-minute playback token and an associated watermark session. The configured video URL must be a streaming-provider URL, never a downloadable object URL.
- `/learning/notifications`, `/learning/reports`, `/account`, and `/admin` provide notification, moderation-reporting, account-management, data-export, tenant lifecycle, and report review workflows.
- `/timers/{timerId}/sessions` starts a timer; the session pause, resume, finish, and round-log routes persist timer state.

`POST /auth/password-reset/request` queues a reset email in `EmailLog`; an email provider can consume that queue later. In non-production it returns a development token to make the flow testable.

Course publishing, archival, pricing, free previews, lesson instructions/metadata, module schedule labels/rest days, configurable timer alerts, tenant branding revisions, protected document sessions, device sessions, password resets, and lesson analytics are stored in the database through migrations `20260729133206_add_course_workflows` and `20260730090611_add_frontend_workflows`.

## Verification

```powershell
npm run test:e2e
npm test -- --runInBand
npm run build
npx eslint "{src,apps,libs,test}/**/*.ts"
```
