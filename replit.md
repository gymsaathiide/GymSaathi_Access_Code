# Overview

This project is a multi-tenant gym management superadmin dashboard platform designed to efficiently manage multiple gym facilities. It offers features such as billing, white-label branding, analytics, security auditing, and third-party integrations, providing a robust solution with significant market potential.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The frontend uses React 18, TypeScript, and Vite. UI components are built with Radix UI primitives and shadcn/ui (new-york style), optimized for enterprise data density. Styling is managed by TailwindCSS (dark mode only) with custom typography. TanStack Query handles server state, Wouter for client-side routing, and Recharts for data visualization.

## Backend
The backend is built with Express.js, Node.js, and TypeScript, exposing a RESTful API at `/api`. It uses PostgreSQL as the primary database, with Drizzle ORM for type-safe operations and Zod for schema validation. Session-based authentication is managed via Express sessions with a PostgreSQL store.

## Data Storage
The primary database is Supabase PostgreSQL, accessed via the `pg` driver and Drizzle ORM. The schema includes tables for gyms, subscriptions, transactions, branding, audit logs, integrations, and extensive diet planner data.

## Authentication & Authorization
The system uses session-based authentication with a PostgreSQL store. Security features include CORS and an audit logging system. A "Forgot Password" flow is implemented. Trainer RBAC (Role-Based Access Control) strictly isolates trainers from order management while allowing personal purchases.

## UI/UX Decisions
The platform features a dark theme only design with navy backgrounds and orange accents. Consistent layout components are used throughout. Comprehensive mobile responsiveness is implemented with defined breakpoints, a mobile bottom navigation, and typography scaling. The Diet Planner system features a redesigned premium UI with a two-zone layout, glass-effect cards, and sticky navigation.

## Key Features
-   **QR Attendance System**: Member check-in/check-out via QR codes.
-   **Public Enquiry Form System**: Gym-branded lead generation forms.
-   **Trainer Management System**: CRUD operations and dedicated dashboard.
-   **Quick Action Dropdown**: Admin access to payment details and helpdesk.
-   **Cart Persistence System**: User-specific cart state persistence.
-   **Order Notification System**: Notifications for members and admins.
-   **Enhanced Toast Notification System**: Improved, customizable toast notifications.
-   **Revenue Graph Real-time Updates**: Automatic updates for the admin dashboard revenue graph.
-   **Shop Orders Revenue Dashboard**: Comprehensive sales analytics for shop orders (Admin only).
-   **Security Audit System**: Super Admin functional error tracking and dashboard.
-   **Superadmin Profile & User Management**: Account and user management for Superadmins.
-   **Diet Planner System**: Comprehensive nutrition and fitness planning for members including:
    -   Dashboard Diet Plan Preview
    -   AI Diet Planner with personalized meal plan generation, body composition analysis, meal database, and plan persistence.
    -   Simplified Meal Plan Generators (Breakfast, Lunch, Dinner, Snacks).
    -   Daily Nutrition Tracking, Workout Planner, and Progress Tracking.
-   **Manage Meals**: Superadmin interface for managing meal database tables.
-   **Permanent Member Deletion**: Admin functionality for complete member data removal with cascading deletions.

# External Dependencies

-   **UI Component Libraries**: Radix UI, Lucide React, class-variance-authority, tailwind-merge, clsx, shadcn/ui.
-   **Data & Forms**: React Hook Form, Zod, date-fns, cmdk.
-   **Database & ORM**: Supabase PostgreSQL, pg driver, Drizzle ORM, drizzle-kit.
-   **Build & Dev Tools**: Vite, TypeScript, PostCSS, Tailwind CSS, Autoprefixer.
-   **Charting**: Recharts.
-   **Carousel Components**: Embla Carousel React.
-   **Notifications**: Resend API (email), UPMtech/WatX API (WhatsApp).
-   **QR Code**: qrcode.react (generation), html5-qrcode (scanning).