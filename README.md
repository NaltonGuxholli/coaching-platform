# Northstar Coaching Platform

A multi-tenant, themeable online coaching and course platform for independent instructors, creators, and learners.

The platform combines:

- Branded public teaching sites for each tenant
- Course and program authoring from reusable lesson libraries
- Protected HLS/DASH video and view-only document access
- Learner enrollment, progress tracking, notifications, and reporting
- Configurable practice timers and persisted timer sessions
- POK checkout, payment orders, webhook processing, and instructor payouts
- Tenant branding, domains, themes, terminology, and revision history
- Instructor analytics and exportable enrollment reports
- Platform administration, moderation, tenant lifecycle, and theme management
- Responsive Nocturne-inspired public, learner, instructor, and admin experiences

This repository contains the NestJS API, Prisma/MySQL data layer, React/Vite frontend, Docker deployment, migrations, automated tests, and product documentation.

## Contents

1. [Product model](#product-model)
2. [User journeys](#user-journeys)
3. [Architecture](#architecture)
4. [Repository structure](#repository-structure)
5. [Requirements coverage](#requirements-coverage)
6. [Local development](#local-development)
7. [Docker development](#docker-development)
8. [Environment configuration](#environment-configuration)
9. [Database operations](#database-operations)
10. [Authentication](#authentication)
11. [Frontend application](#frontend-application)
12. [Public tenant sites](#public-tenant-sites)
13. [Instructor workflows](#instructor-workflows)
14. [Learner workflows](#learner-workflows)
15. [Payments and POK](#payments-and-pok)
16. [Video and document protection](#video-and-document-protection)
17. [Theming and white-labeling](#theming-and-white-labeling)
18. [API surface](#api-surface)
19. [Testing and verification](#testing-and-verification)
20. [Troubleshooting](#troubleshooting)
21. [Security and production readiness](#security-and-production-readiness)
22. [Known limitations](#known-limitations)
23. [Development conventions](#development-conventions)

## Product model

The platform is organized around four roles.

| Role | Primary job | Main workspace |
| --- | --- | --- |
| Guest | Discover an instructor, understand a program, and decide whether to start | Public tenant site |
| Learner | Purchase, resume, complete, and reflect on learning | Learner workspace |
| Instructor | Create, publish, sell, protect, and improve programs | Instructor workspace |
| Platform admin | Operate tenants, themes, reports, and platform policy | Admin workspace |

The generic content hierarchy is:

```text
Tenant
  ├── Tenant settings and theme revisions
  ├── Public domains
  ├── Library items (reusable lessons)
  ├── Courses / programs
  │     └── Modules / weeks / sessions
  │           └── Course lessons
  │                 ├── Video assets
  │                 ├── Protected files
  │                 ├── Timer attachments
  │                 └── Learner progress
  ├── Orders and payments
  ├── Payouts
  └── Analytics and reports
```

A lesson is intentionally generic. It can represent an exercise, recipe, chapter, technique drill, language practice, coding walkthrough, or any other short teaching unit.

## User journeys

### Guest to learner

1. A visitor opens a tenant slug, subdomain, or custom domain.
2. The public site loads the tenant name, browser title, theme settings, catalog, and optional page sections.
3. The visitor opens a program detail page and sees price, lesson count, description, and preview availability.
4. The visitor creates a learner account or signs in.
5. The learner creates a POK order and selects QR/instant transfer or card checkout.
6. After payment confirmation, the learner can access the purchased course.
7. The learner resumes lessons, records watch progress, completes lessons, and uses timers where attached.

### Instructor to published program

1. The creator signs up with a business name, workspace slug, and subdomain.
2. The instructor opens the instructor overview and sees catalog, learner, completion, and payout signals.
3. The instructor creates a draft program with slug, description, price, currency, and billing type.
4. The instructor creates or reuses library lessons.
5. The instructor creates modules and orders lessons within the course.
6. The instructor registers provider-hosted HLS/DASH video and protected document assets.
7. The instructor attaches timers to lessons, modules, or whole courses.
8. The instructor previews the learner structure, fixes missing details, and publishes.
9. Learners discover the program from the tenant’s public site.
10. Analytics and enrollment exports inform the next course decision.

### Platform operation

1. A platform admin reviews tenant status and moderation reports.
2. The admin suspends or reinstates tenants.
3. The admin resolves or rejects reports with optional resolution notes.
4. The admin creates and updates shared theme records.
5. Theme revisions preserve tenant overrides while allowing safe base-theme evolution.

## Architecture

### Backend

- **NestJS** application modules and controllers
- **Prisma 7** ORM and generated client
- **MySQL 8.4** persistence
- **JWT bearer authentication** with persisted device sessions
- **class-validator** DTO validation with `whitelist` and `forbidNonWhitelisted`
- **Swagger/OpenAPI** at `/docs` and `/docs-json`
- **Helmet** security headers
- **CORS** configuration from the application bootstrap
- **Audit interceptor** for authenticated activity
- **BigInt JSON serialization** for database values

### Frontend

- React 19
- Vite 7
- TypeScript strict mode
- Phosphor icons
- Nocturne token system and responsive application styles
- Browser-history routing without a router dependency
- Shared API client with authenticated requests and public-request handling
- Modular feature pages under `frontend/src/app/`

### Runtime topology

```text
Browser :8080
   │
   ▼
Nginx frontend container
   ├── static React/Vite assets
   └── /api/* proxy
          │
          ▼
      NestJS API :3000
          │
          ▼
       MySQL 8.4
```

External integrations sit beside the API rather than inside the frontend:

- POK for checkout and payment notifications
- Video provider/CDN for HLS or DASH delivery
- Optional DRM provider
- Email provider or queue consumer for transactional messages

## Repository structure

```text
.
├── frontend/
│   ├── index.html
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── app/
│       │   ├── AppRouter.tsx
│       │   ├── auth-normal.tsx
│       │   ├── shell.tsx
│       │   ├── public-site.tsx
│       │   ├── learner.tsx
│       │   ├── instructor.tsx
│       │   ├── analytics-pages.tsx
│       │   ├── contract-pages.tsx
│       │   ├── advanced-pages.tsx
│       │   ├── operations.tsx
│       │   ├── admin.tsx
│       │   ├── account.tsx
│       │   ├── components.tsx
│       │   ├── data.ts
│       │   ├── model.ts
│       │   └── app.css
│       ├── client.ts
│       └── downloads.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── auth/
│   ├── workflows/
│   ├── users/
│   ├── tenant/
│   ├── payments/
│   ├── payouts/
│   ├── platform/
│   ├── notifications/
│   ├── video/
│   └── generated/
├── docs/TESTING.md
├── docker-compose.yml
├── Dockerfile
├── prisma.config.ts
└── README.md
```

## Requirements coverage

### Theming and white-labeling

Implemented backend and frontend concepts include:

- Base theme records with token JSON
- Tenant settings layered over base themes
- Brand name and browser title
- Primary, secondary, tertiary, and background colors
- Heading and body font configuration
- Logo, light logo, dark logo, favicon, and hero image fields
- Terminology JSON
- Configurable page-section JSON
- Custom CSS field for advanced tenant plans
- Theme revision history and rollback
- Tenant domains and SSL status fields
- Public tenant resolution by slug

The frontend uses the Nocturne token family as its default visual language: low-chroma blue-grey surfaces, outlined actions, fading rules, compact spacing, modest radii, tonal ramps, and accent marks rather than flooded color.

### Course and lesson authoring

The instructor workspace supports:

- Course creation and editing
- Slug, price, currency, and billing type
- Draft, publish, unpublish, duplicate, and archive lifecycle
- Module creation with ordering, schedule labels, and rest-day flags
- Reusable library lesson attachment
- Course preview before publication
- Video asset registration
- Protected file registration
- Timer creation and attachment workflow entry points
- Library search and item creation/update
- Enrollment and analytics report export

### Timers

The backend supports:

- Countdown
- Stopwatch
- Interval
- AMRAP
- Circuit
- Duration
- Round count
- Rest time
- Auto advance
- Audio cues
- Vibration cues
- Alert-point JSON
- Persisted timer sessions
- Pause, resume, finish, and round logging

### Learner experience

The learner workspace includes:

- Overview dashboard
- Active programs
- Program structure
- Calendar-style practice planning surface
- Notifications and read state
- Protected lesson playback entry
- Protected document viewer entry
- Manual progress completion
- Course-level progress persistence
- Content reporting
- Account, preferences, security, MFA, active sessions, export, and deletion

### Payments and payouts

The platform includes the POK integration boundary:

- Order creation
- QR/instant-transfer checkout path
- Card checkout path
- Provider webhook verification
- Payment notification recording
- Instructor payout listing
- Payout scheduling
- Payout CSV export

The checkout UI explains POK limitations before payment:

- US-issued cards are not accepted
- Mastercard transactions are capped at €300
- QR or instant transfer is the preferred route for higher-value purchases

### Content protection

Implemented controls include:

- Authenticated access-token creation
- Short-lived video access tokens
- Short-lived document access tokens
- Per-user watermark session records
- Streaming URL validation for HLS/DASH
- View-only document response metadata
- Paid content authorization through active enrollment
- Public guest preview access boundary

The open web cannot technically prevent screenshots, screen recording, or filming with another device. The product therefore combines short-lived authorization, streaming delivery, watermarking, access controls, and contractual terms.

## Local development

### Prerequisites

- Node.js 22
- npm
- MySQL 8.4, or Docker Desktop
- A local `.env` file
- Optional POK, email, video, and DRM provider credentials

### Install API dependencies

```powershell
npm install
```

### Configure environment

Copy the example environment file when present:

```powershell
Copy-Item .env.example .env
```

At minimum, configure:

```env
DATABASE_URL="mysql://coaching:coaching-local-password@127.0.0.1:3306/coaching-platform"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="15m"
PORT=3000
DEFAULT_TENANT_SLUG="your-tenant-slug"
```

Never use development secrets in production.

### Prepare Prisma

For a new local database:

```powershell
npx prisma migrate dev
npx prisma generate
```

For a deployed database where migrations already exist:

```powershell
npx prisma migrate deploy
npx prisma generate
```

### Start the API

```powershell
npm run start:dev
```

Useful URLs:

- API root: [http://localhost:3000](http://localhost:3000)
- Health: [http://localhost:3000/health](http://localhost:3000/health)
- Swagger: [http://localhost:3000/docs](http://localhost:3000/docs)
- OpenAPI JSON: [http://localhost:3000/docs-json](http://localhost:3000/docs-json)

### Start the frontend separately

```powershell
Push-Location frontend
npm install
npm run dev
Pop-Location
```

Frontend environment variables:

```env
VITE_API_URL=http://localhost:3000
VITE_TENANT_SLUG=your-tenant-slug
```

The frontend build is validated with:

```powershell
Push-Location frontend
npm run build
Pop-Location
```

## Docker development

The full stack runs with:

```powershell
docker compose up --build
```

The frontend is available at [http://localhost:8080](http://localhost:8080).

The frontend Nginx server:

- Serves the Vite build
- Proxies `/api/*` to the API container
- Proxies Swagger paths
- Uses SPA fallback for frontend routes

The local Compose defaults are intentionally explicit:

```env
MYSQL_DATABASE=coaching-platform
MYSQL_USER=coaching
MYSQL_PASSWORD=coaching-local-password
DEFAULT_TENANT_SLUG=lolol
VITE_TENANT_SLUG=lolol
```

The local slug is an internal development identifier. The seeded display branding should be configured separately through tenant settings; production installations should use a meaningful slug and brand.

Useful commands:

```powershell
# Start or rebuild everything
docker compose up -d --build

# View service state
docker compose ps

# View API logs
docker compose logs -f api

# View frontend logs
docker compose logs -f frontend

# Restart the database while preserving the volume
docker compose restart db

# Stop containers but keep database data
docker compose down

# Stop containers and delete database data: destructive
# docker compose down -v
```

## Database operations

### Inspect the database

```powershell
docker compose exec db mysql -ucoaching -pcoaching-local-password coaching-platform
```

Useful inspection queries:

```sql
SELECT id, slug, name, status FROM Tenant;
SELECT id, title, slug, status FROM Course;
SELECT id, email, status FROM User;
SELECT id, courseId, status, paymentMethod FROM `Order`;
```

### Restart versus reset

A restart is non-destructive:

```powershell
docker compose restart db
```

A reset deletes the persistent MySQL volume and all local data:

```powershell
docker compose down -v
docker compose up -d --build
```

Only use the reset command when intentionally recreating the local database. It removes users, tenants, courses, orders, payments, analytics, sessions, and all seeded content.

### Bootstrap an empty database

`POST /auth/bootstrap` creates the first tenant and platform administrator. It requires `BOOTSTRAP_SECRET` and becomes unavailable once any tenant exists.

Example request shape:

```json
{
  "tenantName": "Northstar Coaching",
  "tenantSlug": "northstar",
  "subdomain": "northstar",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "password": "a-long-password",
  "bootstrapSecret": "configured-bootstrap-secret"
}
```

## Authentication

### Normal learner login

`POST /auth/login` accepts:

```json
{
  "email": "learner@example.com",
  "password": "password-at-least-eight-characters",
  "mfaCode": "optional-six-digit-code"
}
```

Tenant resolution uses, in order:

1. Explicit `tenantId`
2. Explicit `tenantSlug`
3. `DEFAULT_TENANT_SLUG`
4. The only active tenant, when exactly one exists

The frontend intentionally hides tenant internals from ordinary learner login and registration. Creator onboarding still asks for business name, workspace address, and subdomain because those fields create a new tenant.

### Registration

Learner registration:

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "password": "a-long-password"
}
```

Creator registration:

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "password": "a-long-password",
  "tenantName": "Ada Maths",
  "tenantSlug": "ada-maths",
  "subdomain": "ada-maths"
}
```

### Sessions and MFA

- Login creates a persisted device session.
- Tokens include the session ID.
- Revoked or expired sessions fail authentication.
- A maximum of five active sessions is retained per user.
- MFA setup, confirmation, and disable are available to authenticated users.
- Password changes require both `currentPassword` and `newPassword`.

## Frontend application

The frontend is organized around user jobs rather than backend controller names.

### Guest experience

- Branded public tenant page
- Program catalog
- Program detail page
- Sign in
- Learner account creation
- Creator workspace creation
- Password reset request and completion

### Learner experience

- Learning overview
- My programs
- Practice calendar
- Inbox
- Course detail and purchase entry
- Lesson player
- Protected document entry
- Progress completion
- Content report
- Account and security settings

### Instructor experience

- Practice overview
- Course catalog
- Course creation
- Course builder
- Course preview
- Lesson library
- Asset pipeline
- Timer studio
- Analytics
- Enrollment export
- Payouts
- People
- Branding
- Domains
- Theme revisions

### Platform administration

- Tenant control room
- Moderation queue
- Theme library
- Theme creation and token editing

The current frontend entrypoint is `frontend/src/app/entry.tsx`. Routes are handled by `frontend/src/app/AppRouter.tsx`, and shared authenticated navigation is implemented in `frontend/src/app/shell.tsx`.

## Public tenant sites

Public routes:

```text
/
/public/:tenantSlug
/public/:tenantSlug/courses/:courseSlug
/public-domain/:domain
```

The public site is composed of:

- Tenant-branded header
- Primary call to action
- Program discovery
- Outcome/proof band
- Approach section
- Program cards
- Sign-in and registration actions
- Footer navigation

The public page loads tenant settings and courses from the backend rather than hard-coding catalog content.

## Instructor workflows

### Course lifecycle

```text
Create draft
  → edit details and pricing
  → add modules
  → add reusable lessons
  → register assets
  → attach timers
  → preview as learner
  → publish
  → monitor analytics
  → archive or unpublish
```

Course creation requires a title and slug. Pricing is stored in cents at the DTO boundary and converted for display by the frontend.

### Library

Library items are reusable across multiple courses. Supported fields include:

- Title
- Type
- Description
- Instructions
- Difficulty
- Duration
- Metadata JSON
- Tags

Library updates are intended to propagate to every course reference.

### Assets

The asset pipeline deliberately registers provider URLs rather than uploading raw bytes through the API. A video registration includes:

- File name
- HLS/DASH URL
- Thumbnail URL
- Duration
- Resolution
- Streaming format
- DRM flag
- Captions URL
- Transcript

Protected file registration includes:

- File name
- Storage URL
- Type
- MIME type
- Size
- Protected flag

The actual upload/transcoding provider remains an external integration boundary. The API rejects non-streaming video URLs that do not end in `.m3u8` or `.mpd`.

### Analytics

`GET /instructor/analytics` returns:

```json
{
  "generatedAt": "2026-09-08T00:00:00.000Z",
  "courses": [
    {
      "id": "course-id",
      "title": "Program name",
      "status": "PUBLISHED",
      "price": "49.00",
      "currency": "EUR",
      "_count": {
        "enrollments": 12,
        "lessons": 18
      },
      "analytics": {
        "enrollments": 12,
        "completionRate": 42.5,
        "averageWatchTime": 184
      },
      "lessons": []
    }
  ]
}
```

The frontend derives aggregate learner count, mean completion, average watch time, published count, and course-level tables from this response. It does not assume top-level `enrollments` or `completionRate` fields.

## Learner workflows

### Purchase and access

1. Learner opens a public program.
2. Learner signs in or creates an account.
3. Learner creates an order with `/payments/orders`.
4. Learner starts POK checkout with `/payments/pok/checkout`.
5. POK sends a signed webhook to `/payments/webhook/pok`.
6. The learner receives enrollment/access according to the payment result.

### Progress

Progress updates require:

```json
{
  "watchedSeconds": 184,
  "completed": true
}
```

The service updates lesson progress, course progress, course analytics, and lesson analytics in a transaction.

### Notifications

Learners can list notifications and mark each notification read. Reminder and content-published preferences are stored through the account preference endpoints.

## Payments and POK

POK is the platform’s sole payment provider.

### Order creation

```http
POST /payments/orders
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "courseId": "course-id",
  "paymentMethod": "QR_TRANSFER"
}
```

### Checkout

```http
POST /payments/pok/checkout
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "orderId": "order-id"
}
```

### Webhook

The POK webhook is server-to-server and must not be called by the browser as a substitute for payment confirmation.

```http
POST /payments/webhook/pok
x-pok-signature: <hmac-signature>
Content-Type: application/json
```

The server verifies the raw request body and records the payment notification.

The frontend warns learners about:

- US-issued cards not being accepted
- Mastercard transaction limits above €300
- QR or instant transfer being preferred for high-value purchases

## Video and document protection

### Learner video flow

```text
POST /learning/videos/:videoId/access
  → short-lived access token
GET /learning/videos/:videoId/playback?token=...
  → provider stream URL plus expiry/watermark metadata
```

The learner must be authenticated and enrolled. The token is associated with the learner and video.

### Guest preview flow

Free preview lessons use public catalog routes:

```text
POST /public/:tenantSlug/videos/:videoId/access
GET  /public/:tenantSlug/videos/:videoId/playback?token=...
```

Only assets explicitly marked as previewable should be exposed to guests.

### Documents

```text
POST /learning/documents/:fileId/access
GET  /learning/documents/:fileId/viewer?token=...
```

The viewer response contains view-only metadata and watermark information rather than a permanent download link.

## Theming and white-labeling

Tenant settings are layered over base themes.

Supported tenant overrides include:

- Brand name
- Browser title
- Logo variants
- Favicon
- Hero image
- Primary, secondary, tertiary, and background colors
- Heading and body fonts
- Locale
- Terminology JSON
- Page-section JSON
- Custom CSS
- Base theme ID

Theme changes should follow this lifecycle:

```text
Edit draft settings
  → preview
  → publish
  → create revision
  → optionally rollback
```

The frontend defaults to the Nocturne design language, but tenant configuration is intended to control the final branded output.

## API surface

### Core

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | API identity |
| GET | `/health` | Health check |

### Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create learner account |
| POST | `/auth/login` | Sign in |
| POST | `/auth/register/instructor` | Create creator tenant and account |
| POST | `/auth/bootstrap` | Initialize an empty platform |
| POST | `/auth/password-reset/request` | Request reset |
| POST | `/auth/password-reset/reset` | Complete reset |
| GET | `/auth/me` | Current identity |
| POST | `/auth/logout` | Revoke current session |
| GET | `/auth/sessions` | List sessions |
| DELETE | `/auth/sessions/:sessionId` | Revoke session |
| POST | `/auth/mfa/setup` | Begin MFA setup |
| POST | `/auth/mfa/confirm` | Confirm MFA |
| POST | `/auth/mfa/disable` | Disable MFA |
| POST | `/auth/users` | Admin-created user |

### Instructor

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/instructor/courses` | List courses |
| POST | `/instructor/courses` | Create course |
| PATCH | `/instructor/courses/:courseId` | Update course |
| GET | `/instructor/courses/:courseId/builder` | Builder tree |
| GET | `/instructor/courses/:courseId/preview` | Learner preview |
| POST | `/instructor/courses/:courseId/publish` | Publish |
| POST | `/instructor/courses/:courseId/unpublish` | Unpublish |
| POST | `/instructor/courses/:courseId/archive` | Archive |
| POST | `/instructor/courses/:courseId/duplicate` | Duplicate |
| POST | `/instructor/courses/:courseId/modules` | Add module |
| POST | `/instructor/courses/:courseId/lessons` | Add reusable lesson |
| POST | `/instructor/lessons/:lessonId/videos` | Register video |
| POST | `/instructor/lessons/:lessonId/files` | Register file |
| GET | `/instructor/library` | Search library |
| POST | `/instructor/library` | Create library item |
| PATCH | `/instructor/library/:id` | Update library item |
| POST | `/instructor/timers` | Create timer |
| GET | `/instructor/analytics` | Course and lesson analytics |
| GET | `/instructor/reports/enrollments` | Enrollment export |

### Learner

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/learning/my-courses` | Active programs |
| GET | `/learning/courses/:courseId` | Purchased course tree |
| PATCH | `/learning/lessons/:lessonId/progress` | Save completion/watch state |
| POST | `/learning/lessons/:lessonId/engagement` | Record engagement |
| GET | `/learning/notifications` | List notifications |
| PATCH | `/learning/notifications/:notificationId/read` | Mark read |
| POST | `/learning/reports` | Report content |
| POST | `/learning/videos/:videoId/access` | Create playback access |
| GET | `/learning/videos/:videoId/playback` | Resolve playback |
| POST | `/learning/documents/:fileId/access` | Create viewer access |
| GET | `/learning/documents/:fileId/viewer` | Resolve viewer |

### Tenant and platform

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/tenant/settings` | Tenant settings |
| PATCH | `/tenant/settings` | Update settings |
| POST | `/tenant/settings/publish` | Publish settings |
| GET | `/tenant/themes` | Theme library |
| POST | `/tenant/themes` | Create theme |
| PATCH | `/tenant/themes/:id` | Update theme |
| GET | `/tenant/theme-revisions` | Revision history |
| POST | `/tenant/theme-revisions/:revisionId/rollback` | Rollback |
| GET | `/tenant/domains` | List domains |
| POST | `/tenant/domains` | Add domain |
| PATCH | `/tenant/domains/:id` | Update domain |
| GET | `/admin/tenants` | List tenants |
| PATCH | `/admin/tenants/:tenantId/status` | Suspend/reinstate tenant |
| GET | `/admin/reports` | Moderation reports |
| PATCH | `/admin/reports/:reportId` | Review report |

### Timer sessions

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/timers/:timerId/sessions` | Start session |
| GET | `/timers/sessions/:sessionId` | Read session |
| POST | `/timers/sessions/:sessionId/pause` | Pause |
| POST | `/timers/sessions/:sessionId/resume` | Resume |
| POST | `/timers/sessions/:sessionId/finish` | Finish |
| POST | `/timers/sessions/:sessionId/rounds` | Record round |

## Testing and verification

### API tests

```powershell
npm test
npm test -- --runInBand
npm run test:watch
npm run test:cov
npm run test:e2e
npm run build
npm run lint
```

### Frontend tests/build

```powershell
Push-Location frontend
npm run build
Pop-Location
```

### Docker smoke checks

```powershell
docker compose up -d --build
curl.exe -sS -o NUL -w "%{http_code}\n" http://localhost:8080/
curl.exe -sS -o NUL -w "%{http_code}\n" http://localhost:8080/api/health
docker compose ps
```

### Browser acceptance checklist

#### Guest

- [ ] Public tenant branding loads
- [ ] Header navigation scrolls to programs and approach
- [ ] Program cards open course detail
- [ ] Sign in opens the login page
- [ ] Learner registration submits only learner DTO fields
- [ ] Creator signup submits tenant creation DTO fields
- [ ] Footer links work
- [ ] Mobile public site has no horizontal overflow

#### Learner

- [ ] Registration creates a session
- [ ] Learner overview loads
- [ ] Programs route works
- [ ] Calendar route works
- [ ] Inbox route works
- [ ] Account route works
- [ ] Password and MFA controls call valid DTOs
- [ ] Course purchase starts POK flow
- [ ] Progress updates persist
- [ ] Protected video and document access require authentication

#### Instructor

- [ ] Instructor signup creates a tenant
- [ ] Overview loads real analytics response data
- [ ] Course creation includes slug and pricing
- [ ] Builder adds modules with order indexes
- [ ] Builder adds library lessons with order indexes
- [ ] Preview uses the backend GET preview endpoint
- [ ] Asset pipeline registers valid HLS/DASH URLs
- [ ] Timer configuration uses backend enum fields
- [ ] Analytics displays course-level metrics
- [ ] Enrollment report exports
- [ ] Branding publishes settings
- [ ] Domains and theme revisions are reachable

#### Platform admin

- [ ] Tenant status changes work
- [ ] Moderation report review works
- [ ] Theme creation includes token JSON
- [ ] Theme updates preserve token data

## Troubleshooting

### Login says tenant is unavailable

Check the configured default tenant:

```powershell
docker compose exec db mysql -ucoaching -pcoaching-local-password coaching-platform -Nse "SELECT slug, name, status FROM Tenant;"
```

Set matching values in `.env` or Compose:

```env
DEFAULT_TENANT_SLUG=your-slug
VITE_TENANT_SLUG=your-slug
```

Then rebuild the API and frontend:

```powershell
docker compose up -d --build api frontend
```

### Login rejects `firstName` or `lastName`

Login only accepts email, password, and optional MFA code. Registration accepts first and last name. Clear stale browser assets by rebuilding the frontend container and hard-refreshing the page.

### Analytics shows zeros

The analytics API returns a `courses` array. The frontend derives aggregate values from each course’s `_count` and `analytics` fields. Verify the authenticated response:

```powershell
# Use a valid bearer token in an API client or Swagger.
GET /instructor/analytics
```

If the response contains no courses, publish a course and create an enrollment before expecting learner metrics.

### Public site shows placeholder content

Inspect local data:

```powershell
docker compose exec db mysql -ucoaching -pcoaching-local-password coaching-platform -Nse "SELECT slug, name FROM Tenant; SELECT title, slug, status FROM Course;"
```

Remove intentional seed/test records only after confirming they are not needed.

### Database restart versus reset

Non-destructive restart:

```powershell
docker compose restart db
```

Destructive reset:

```powershell
docker compose down -v
docker compose up -d --build
```

### Video registration fails

The API requires an absolute HLS or DASH URL ending in `.m3u8` or `.mpd`. Raw MP4 download URLs are intentionally rejected.

### POK checkout does not complete

The browser creates an order and starts checkout, but payment completion depends on:

- POK merchant configuration
- Correct POK API URL and credentials
- Valid webhook signing secret
- Reachable webhook endpoint
- Provider callback payload matching the DTO contract

### Protected route redirects to login

Check that:

- `coaching.accessToken` exists in local storage
- The session has not expired or been revoked
- The API and frontend point to the same environment
- The user has the required role for the route

## Security and production readiness

Before production:

- Replace all local passwords and JWT secrets
- Configure HTTPS and secure reverse-proxy headers
- Configure a real email provider
- Configure POK credentials and webhook verification
- Configure a managed video provider/CDN
- Configure DRM if required by the plan
- Use a production database with backups and replication
- Set a meaningful `DEFAULT_TENANT_SLUG` or resolve tenants from hostnames
- Restrict CORS to trusted origins
- Rotate secrets through a secret manager
- Monitor failed authentication, payment webhooks, playback access, and moderation actions
- Review retention and deletion behavior for GDPR obligations
- Validate accessibility with keyboard, screen reader, captions, and contrast checks

The API uses role guards and tenant scoping, but infrastructure-level controls remain necessary. Application authorization is not a substitute for network isolation, secret management, database backups, or provider security.

## Known limitations

### External provider configuration

POK settlement, transactional email delivery, video transcoding, CDN delivery, and DRM require external provider configuration. Local development can exercise deterministic integration boundaries but cannot prove live provider settlement without credentials and callbacks.

### Browser content protection

No web application can completely prevent screenshots, screen recording, or recording with a second device. The platform provides meaningful deterrence and traceability through short-lived URLs, enrollment checks, watermark records, protected viewers, and terms of service.

### Calendar

The current calendar is a learner planning surface. Timer and lesson state are persisted through the backend, but a full scheduled-event/calendar entity is outside the current backend model.

### Native mobile

Responsive mobile web is included. Native iOS and Android apps with OS-level screen-capture controls are future work.

## Development conventions

- Keep backend DTOs and frontend payloads synchronized.
- Do not send registration-only fields to login endpoints.
- Do not invent top-level analytics fields when the API returns nested course analytics.
- Use `PATCH` for updates and `POST` only for action endpoints.
- Treat tenant scope as an authorization boundary.
- Never expose raw provider credentials or permanent media URLs.
- Keep public content generic across verticals; avoid fitness-specific domain assumptions in shared models.
- Prefer reusable library lessons over duplicated course-specific records.
- Preserve Nocturne tokens and component conventions when extending the frontend.
- Add browser acceptance coverage whenever a visible button introduces a new route or mutation.

## License

This repository is private and currently marked `UNLICENSED` in `package.json`.
