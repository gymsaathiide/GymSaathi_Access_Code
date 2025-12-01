# Overview

This project is a multi-tenant gym management superadmin dashboard platform providing comprehensive functionalities like billing, white-label branding, analytics, security auditing, and third-party integrations. Built with a modern full-stack TypeScript architecture, it aims to efficiently manage multiple gym facilities, offering a robust solution with significant market potential.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses **React 18** with **TypeScript** and **Vite**. **Radix UI primitives** and **shadcn/ui** (new-york style) form the UI component system, optimized for data tables and enterprise-grade information density. Styling is handled by **TailwindCSS** with CSS variables, supporting light/dark modes and custom typography. **TanStack Query** manages server state, **Wouter** handles client-side routing, and **Recharts** is used for data visualization. A modern SaaS layout with a fixed sidebar and flexible main content area is implemented.

## Backend Architecture

The backend is built with **Express.js**, **Node.js**, and **TypeScript**, exposing a **RESTful API** at `/api`. It includes request logging middleware. Storage is abstracted, with **PostgreSQL** as the primary persistent option. **Drizzle ORM** provides type-safe database operations and integrates with **Zod** for schema validation. **connect-pg-simple** manages PostgreSQL-backed session storage.

## Data Storage Solutions

The primary database is **Supabase PostgreSQL**, accessed via the `pg` driver and **Drizzle ORM**. The schema includes core tables for gyms, subscriptions, transactions, branding, audit logs, and integrations, using UUID primary keys. Drizzle ORM ensures type-safe queries and integrates with Zod for runtime validation.

## Authentication & Authorization

**Session-based authentication** is implemented using Express sessions with a PostgreSQL session store. Security features include CORS, raw body capture for webhook verification, and an audit logging system. A "Forgot Password" flow is implemented with secure, time-limited, one-time use tokens and bcrypt hashing.

## UI/UX Decisions

The platform features a modern dark theme inspired by FitFlow for the admin panel, utilizing navy backgrounds, white/5% opacity cards, and orange accents. Consistent layout components like `ModernLayout`, `ModernSidebar`, and `ModernHeader` are used. Dashboard visualizations include `MemberActivityChart`, `MembershipPieChart`, and `TargetGauge`.

## Key Features

- **QR Attendance System**: Allows members to check-in/check-out via QR codes, with admin controls and attendance state management.
- **Public Enquiry Form System**: Gym-branded public forms for lead generation with dual notification systems (email/WhatsApp) for leads and admins, and anti-spam measures.
- **Trainer Management System**: CRUD operations for trainers, role management, welcome notifications, and a dedicated trainer dashboard with KPIs.
- **Branch Management System**: Allows admins to create and manage multiple gym branches linked to a parent gym, with notifications for superadmins upon branch creation.
- **Quick Action Dropdown**: Provides quick access for admins to manage payment details (UPI QR, bank details) and send them to members, and access to a 24/7 helpdesk.

# External Dependencies

- **UI Component Libraries**: Radix UI, Lucide React, class-variance-authority, tailwind-merge, clsx.
- **Data & Forms**: React Hook Form, Zod, date-fns, cmdk.
- **Database & Sessions**: Supabase PostgreSQL, pg driver, Drizzle ORM, drizzle-kit.
- **Build & Dev Tools**: Vite, TypeScript, PostCSS, Tailwind CSS, Autoprefixer.
- **Charting**: Recharts.
- **Carousel Components**: Embla Carousel React.
- **Notifications**: Resend API (email), UPMtech/WatX API (WhatsApp with image+text support).
- **QR Code**: qrcode.react (generation), html5-qrcode (scanning).

# Recent Changes

## WhatsApp QR Code + UPI Details Feature (December 2025)
- Updated `sendPaymentDetailsWhatsApp` to send QR code image with UPI/bank details as caption
- Uses UPMtech API's media message capability (`type=media`, `media_type=image`)
- When admin sends payment details via WhatsApp and QR URL exists, recipient receives:
  - QR code image displayed in WhatsApp
  - Caption with UPI ID, account holder, bank account number, IFSC code
- Falls back to text-only message if no QR code is uploaded or if QR is base64-only
- API field fix: Uses `message` field for caption per UPMtech API documentation

## QR Code Storage & Delivery Fixes (December 2025)
- QR codes now upload to **Supabase Storage** (`payment-qr-codes` bucket) instead of storing base64 in database
- Uses **SUPABASE_SERVICE_ROLE_KEY** for server-side storage uploads (anon key doesn't have sufficient permissions)
- This provides a **public HTTPS URL** that works with WhatsApp media API
- Email inline attachments fixed: Uses Resend's `cid` property for proper image embedding
- WhatsApp validates URL type: Only sends media if qrUrl starts with `http`, falls back to text if base64
- Bucket auto-creates if not found, with public access enabled
- Supabase admin client (`supabaseAdmin`) added in `server/db.ts` for storage operations

## Feature Removals (December 2025)
- Removed "Create New Branch" feature from admin dashboard branch dropdown