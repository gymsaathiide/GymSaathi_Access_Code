# Overview

This project is a multi-tenant gym management superadmin dashboard platform offering billing, white-label branding, analytics, security auditing, and third-party integrations. Built with a modern full-stack TypeScript architecture, it aims to efficiently manage multiple gym facilities, providing a robust solution with significant market potential.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend

The frontend uses **React 18**, **TypeScript**, and **Vite**. UI components are built with **Radix UI primitives** and **shadcn/ui** (new-york style), optimized for enterprise data density. Styling is managed by **TailwindCSS** with CSS variables (dark mode only) and custom typography. **TanStack Query** handles server state, **Wouter** for client-side routing, and **Recharts** for data visualization. The layout features a fixed sidebar and flexible main content area.

## Backend

The backend is built with **Express.js**, **Node.js**, and **TypeScript**, exposing a **RESTful API** at `/api`. It includes request logging middleware and uses **PostgreSQL** as the primary database. **Drizzle ORM** provides type-safe database operations and integrates with **Zod** for schema validation. **connect-pg-simple** manages PostgreSQL-backed session storage for authentication.

## Data Storage

The primary database is **Supabase PostgreSQL**, accessed via the `pg` driver and **Drizzle ORM**. The schema includes tables for gyms, subscriptions, transactions, branding, audit logs, and integrations, using UUID primary keys.

## Authentication & Authorization

**Session-based authentication** uses Express sessions with a PostgreSQL store. Security features include CORS, raw body capture for webhook verification, and an audit logging system. A "Forgot Password" flow with secure, time-limited tokens and bcrypt hashing is implemented. Trainer RBAC restricts order creation for trainers.

## UI/UX Decisions

The platform uses a **dark theme only** design with navy backgrounds (hsl(220,26%,10%)), white/5% opacity cards, and orange accents. No light theme or theme toggle is available. Consistent layout components like `ModernLayout`, `ModernSidebar`, and `ModernHeader` are used. Dashboard visualizations include `MemberActivityChart`, `MembershipPieChart`, and `TargetGauge`. The system includes comprehensive mobile responsiveness across various dashboards and transactional flows, utilizing Tailwind's responsive utilities and touch-friendly designs.

## Key Features

-   **QR Attendance System**: Member check-in/check-out via QR codes with admin controls.
-   **Public Enquiry Form System**: Gym-branded forms for lead generation with email/WhatsApp notifications and anti-spam.
-   **Trainer Management System**: CRUD operations for trainers, role management, and a dedicated dashboard.
-   **Quick Action Dropdown**: Provides quick access for admins to manage payment details (UPI QR, bank details) and access a 24/7 helpdesk.
-   **Cart Persistence System**: Cart state persists across page refreshes using local storage, user-specific, and clears on logout.
-   **Order Notification System**: Comprehensive notifications for members (WhatsApp, Email, In-App) and admins (In-App) upon order creation.
-   **Enhanced Toast Notification System**: Improved toast notifications with auto-dismissal, duration control, multiple simultaneous toasts, and enhanced UI with smart icons and variants.
-   **Revenue Graph Real-time Updates**: Admin dashboard revenue graph updates automatically after orders and refreshes periodically.
-   **Shop Orders Revenue Dashboard**: Comprehensive dashboard for shop sales analytics with:
    -   Responsive stats cards (Today's Revenue, Monthly Revenue, Total Orders, Avg Order Value)
    -   Date filter tabs (Today, 7 Days, 30 Days, This Month, This Year)
    -   Interactive revenue trend graph with tooltips (Recharts)
    -   Recent orders table with status badges
    -   60-second auto-refresh for real-time updates
    -   Full mobile responsiveness with touch-friendly design
    -   Routes: `/admin/shop-revenue` and `/trainer/shop-revenue`
-   **Security Audit System**: Super Admin functional error tracking with:
    -   Tracks only user-facing errors (orders, payments, notifications)
    -   Converts technical errors to human-readable messages
    -   3-day auto-expiry for all logged errors
    -   Dashboard with stats cards (Total Issues, Member/Admin/Trainer breakdown)
    -   Role filtering and search functionality
    -   Mobile-responsive table UI
    -   Route: `/audit` (Super Admin only)

# External Dependencies

-   **UI Component Libraries**: Radix UI, Lucide React, class-variance-authority, tailwind-merge, clsx, shadcn/ui.
-   **Data & Forms**: React Hook Form, Zod, date-fns, cmdk.
-   **Database & ORM**: Supabase PostgreSQL, pg driver, Drizzle ORM, drizzle-kit.
-   **Build & Dev Tools**: Vite, TypeScript, PostCSS, Tailwind CSS, Autoprefixer.
-   **Charting**: Recharts.
-   **Carousel Components**: Embla Carousel React.
-   **Notifications**: Resend API (email), UPMtech/WatX API (WhatsApp).
-   **QR Code**: qrcode.react (generation), html5-qrcode (scanning).