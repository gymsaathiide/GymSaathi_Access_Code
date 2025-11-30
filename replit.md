# Overview

This project is a multi-tenant gym management superadmin dashboard platform. It offers comprehensive gym management functionalities, including billing, white-label branding, analytics, security auditing, and third-party integrations, all built with a modern full-stack TypeScript architecture. The platform aims to provide a robust solution for managing multiple gym facilities efficiently.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built with **React 18 and TypeScript**, utilizing **Vite** for tooling. **Radix UI primitives** and **shadcn/ui** (new-york style) form the UI component system, emphasizing clean data tables and enterprise-grade information density. **TailwindCSS** with CSS variables handles styling, supporting light/dark modes and custom typography (Inter/DM Sans, JetBrains Mono/Fira Code). The layout features a fixed sidebar and a flexible main content area, following modern SaaS patterns. **TanStack Query** manages server state, **Wouter** handles client-side routing, and **Recharts** is used for data visualization.

## Backend Architecture

The backend runs on **Express.js with TypeScript and Node.js**, providing a **RESTful API** under the `/api` prefix. It includes request logging middleware. Storage is abstracted with implementations for in-memory (MemStorage) and **PostgreSQL**. **Drizzle ORM** provides type-safe database operations and integrates with **Zod** for schema validation. **connect-pg-simple** manages PostgreSQL-backed session storage. During development, Vite operates in middleware mode for HMR.

## Data Storage Solutions

The primary database is **Supabase PostgreSQL**, accessed via the `pg` driver and **Drizzle ORM**. The schema features core tables for gyms, subscriptions, transactions, branding, audit logs, and integrations, using UUID primary keys. Drizzle ORM provides type-safe queries and Zod integration for runtime validation.

# Database

## Configuration

- **Provider**: Supabase PostgreSQL
- **Connection**: Uses `DATABASE_URL` environment variable (single source of truth)
- **SSL**: Enabled with `rejectUnauthorized: false` for Supabase certificate compatibility
- **Connection File**: All database connections go through `server/db.ts`

**Required Environment Variable:**
```
DATABASE_URL → Supabase Postgres connection string (with ?sslmode=require)
```

**How to Get the Supabase PostgreSQL Connection String:**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings** → **Database** → **Connection string** (URI)
4. Copy the "Connection string (URI)" - it looks like: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
5. Update the `DATABASE_URL` secret in Replit with this value

**Important:** The pooled connection (port 6543) is recommended for serverless/Replit environments.

**Deprecated (do not use in new code):**
Old Replit Neon PG env vars (PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT) are now deprecated and should not be used.

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:push` | Push schema changes to Supabase |
| `npm run db:check` | Verify DB connectivity and show record counts |
| `curl http://localhost:5000/api/health/db` | Health check endpoint (returns `{ok: true, gymsCount: N}`) |

## Architecture Notes

- `server/db.ts` is the **single point of connection** - all queries (Drizzle or raw SQL) go through the exported `db` instance
- `drizzle.config.ts` uses the same `DATABASE_URL` for CLI operations
- Session store (`connect-pg-simple`) shares the same connection pool

## Authentication & Authorization

**Session-based authentication** is implemented using Express sessions with a PostgreSQL session store. Security features include CORS, raw body capture for webhook verification, and an audit logging system.

**Demo Credentials (for development/testing):**
| Role | Email | Password |
|------|-------|----------|
| Superadmin | superadmin@gym.com | password123 |
| Gym Admin | admin@powerfit.com | password123 |
| Trainer | trainer@powerfit.com | password123 |
| Member | member@powerfit.com | password123 |

**Note:** When DATABASE_URL is unavailable, the system falls back to Supabase REST API for authentication. Full data operations require a valid DATABASE_URL pointing to Supabase's pooled PostgreSQL connection.

# External Dependencies

**UI Component Libraries**: Radix UI, Lucide React, class-variance-authority, tailwind-merge, clsx.
**Data & Forms**: React Hook Form, Zod, date-fns, cmdk.
**Database & Sessions**: Supabase PostgreSQL, pg driver, Drizzle ORM, drizzle-kit.
**Build & Dev Tools**: Vite, TypeScript, PostCSS, Tailwind CSS, Autoprefixer.
**Charting**: Recharts.
**Carousel Components**: Embla Carousel React.
**Notifications**: Resend API (email), WatX API (WhatsApp).
**QR Code**: qrcode.react (generation), html5-qrcode (scanning).

# Recent Changes

## QR Attendance System (November 2025)
- Added QR-based check-in/check-out for gym members
- Admin can generate, toggle, and regenerate gym-specific QR codes
- Members scan QR using camera to check-in/out (requires eligible membership plan)
- Attendance records track source (manual vs QR scan) with IST timezone-aware filtering
- Security: Timing-safe comparison for QR secret validation
- Schema additions: `attendanceQrConfig` table, `source` field in `attendance`, `qrAttendanceEnabled` in `membershipPlans`

## Attendance State Machine (November 2025)
- Strict state machine for attendance sessions with `status` ('in'|'out') and `exitType` ('manual'|'auto') fields
- Sessions auto-close after 3 hours with exitType='auto'
- Database constraint: Unique partial index enforces single active session per member
- Race condition protection: 409 response for concurrent check-in attempts
- Frontend shows dynamic button labels based on member's current gym status
- Setup script: `server/db-setup.sql` must be run after Drizzle schema push for partial unique index

## QR Attendance UX Refinements (November 2025)
- Check-in flow: QR scan only (no toggle) - returns ALREADY_IN_GYM if member has open session
- Check-out flow: Dedicated button on Member Dashboard (POST /api/member/attendance/checkout)
- Admin role: Read-only attendance table, can only do manual check-in (no checkout buttons)
- Real-time updates: 5-10 second polling with refetchInterval and refetchOnWindowFocus
- Error handling: Proper error codes (ALREADY_IN_GYM, NOT_IN_GYM) with user-friendly toast messages

## Public Enquiry Form System (November 2025)
- Public enquiry form accessible via `/enquiry/:gymSlug` (no login required)
- Gym-branded form with logo, colors, and gym contact info
- Lead fields: name, phone, email (optional), goal, preferredChannel, preferredTime, source, message, UTM tracking
- Dual notification system: Welcome to lead (email + WhatsApp) + Alert to gym admin (email + WhatsApp)
- Leads page features: "Copy Enquiry Link" button, auto-refresh (10s), clickable rows for LeadDetailDrawer
- LeadDetailDrawer: One-click call/WhatsApp/email actions, status updates, notes
- Security: Honeypot anti-spam, rate limiting (5 req/min per IP), phone validation aligned frontend/backend
- Schema additions: `gyms.slug` (unique), extended leads table with channel/goal/preferredChannel/preferredTime/utmSource/utmMedium/utmCampaign/whatsappSent/emailSent fields

## Trainer Management System (November 2025)
- Complete trainer CRUD operations for gym admins (add, edit, delete, status toggle)
- Trainers table with denormalized fields (name, email, phone, role, specializations, certifications, experience, bio)
- Trainer roles: 'trainer' and 'head_trainer' with visual badges
- Status management: 'active', 'inactive', 'on_leave' with toggle functionality
- Trainer creation flow: Creates user with role='trainer', links to trainer record via userId+gymId
- Welcome email sent to new trainers with login credentials
- Admin sidebar navigation: Trainers menu item with Dumbbell icon
- Route protection: /admin/trainers accessible only by admin role
- TrainerDashboard with real-time KPIs (API endpoints: /api/trainer/stats, /api/trainer/upcoming-classes, /api/trainer/recent-checkins)
- Dashboard shows: Today's classes, assigned members, check-ins, attendance rate, schedule, recent activity

## Modern Dark Theme UI Redesign (November 2025)
- Complete FitFlow-inspired dark theme implementation for admin panel
- Layout Components:
  - `ModernLayout`: Wrapper with forced dark theme via `admin-theme` class
  - `ModernSidebar`: Navy sidebar with logo, navigation icons, orange accent for active items
  - `ModernHeader`: Top header with search bar, notifications, user profile dropdown
  - `MobileBottomNav`: Bottom navigation for mobile devices
- Reusable Components:
  - `PageHeader`: Consistent page titles with description and action buttons
  - `PageCard`: Dark-themed content cards with white/5 backgrounds
- Dashboard Visualizations:
  - `WelcomeBanner`: Personalized greeting with gradient background
  - `MemberActivityChart`: 7-day check-in trends with Recharts
  - `MembershipPieChart`: Membership status distribution
  - `TargetGauge`: Monthly target progress visualization
- Theme Colors:
  - Background: Navy (#0f172a / bg-main-dark)
  - Cards: White 5% opacity (bg-card-dark / bg-white/5)
  - Primary text: white, Secondary: white/80, Muted: white/50
  - Accent: Orange-500 (#f97316) for interactive elements
  - Status badges: Transparent backgrounds with accent colors (green/red/blue/yellow-500/20)
- Updated Pages: Members, Leads, Attendance, Trainers with consistent dark theme styling

## Bug Fixes (November 2025)
- Fixed TypeScript type errors in routes.ts (60+ errors resolved)
- Corrected Zod schema definitions using .pick() approach
- Fixed rate limiting iterator compatibility issue
- Added null safety for optional lead email and product lowStockAlert fields
- Fixed audit service status enum mismatch ('failure' → 'failed')
- Added invoice download URL to email/WhatsApp notifications during lead conversion
- Corrected gym status enum comparisons ('trial'/'inactive' → 'pending')
- Fixed logGymSuspended function argument count mismatch

## Database Migration to Supabase (November 2025)
- Migrated from Replit PostgreSQL to Supabase PostgreSQL
- Connection now uses `DATABASE_URL` environment variable exclusively
- Removed dependency on individual PG* environment variables (PGHOST, PGPORT, etc.)
- SSL configured with `rejectUnauthorized: false` for Supabase certificate compatibility
- Added `/api/health/db` endpoint for database connection verification
- drizzle.config.ts and server/db.ts updated to handle Supabase SSL requirements
- Fixed trainer creation bug: corrected column name from 'password' to 'passwordHash'

## Enhanced Trainer Onboarding (November 2025)
- Trainer creation form now includes optional password field (min 6 characters)
- If no password provided, system auto-generates a secure temporary password
- Phone number stored in user record for WhatsApp notifications
- Dual notification: Welcome email AND WhatsApp message sent to new trainers
- Trainer sidebar includes Shop access at /trainer/shop

## Lead Tracking by Creator (November 2025)
- Leads table has `addedBy` column to track which user/trainer added each lead
- POST /api/leads automatically sets addedBy to creating user's ID
- GET /api/leads filters by addedBy for trainers (trainers see only leads they added or are assigned to)
- Admins continue to see all leads in their gym

## Password Reset Functionality (November 2025)
- Complete "Forgot Password" flow for all user types (superadmin, admin, trainer, member)
- Schema: `password_reset_tokens` table with fields (id, userId, token, expiresAt, used, createdAt)
- Backend API endpoints:
  - POST /api/auth/forgot-password: Sends reset email with secure token
  - POST /api/auth/reset-password: Validates token and updates password
  - GET /api/auth/validate-reset-token: Checks token validity before showing form
- Email: Password reset template using Resend API with styled HTML email
- Security features:
  - Token generated using crypto.randomBytes(32)
  - 30-minute token expiry
  - One-time use tokens (marked as used after successful reset)
  - No user enumeration (same response for existing/non-existing emails)
  - Password hashing with bcrypt (10 rounds)
- Frontend pages:
  - ForgotPassword.tsx: Email input form with success state
  - ResetPassword.tsx: Password/confirm form with token validation
- Login page now includes "Forgot password?" link to /forgot-password route
- Dark theme styling consistent with rest of application