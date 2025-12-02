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

## Analytics Dashboard Enhancements (December 2025)
- Added Monthly Revenue Chart to AdminAnalyticsDashboard showing last 6 months
- Chart displays both collected (green) and pending (orange) amounts as area charts
- Shows total collected, total pending, and average monthly revenue

## Feature Removals (December 2025)
- Removed "Create New Branch" feature from admin dashboard branch dropdown

## Mobile Responsiveness Enhancements (December 2025)
- **Shop.tsx (Admin)**: Mobile-responsive product grid, compact stats cards, full-width filters on mobile, card-based order display for mobile with table fallback for desktop
- **MemberStore.tsx**: Responsive product grid (1 col mobile, 2 cols tablet, 3 cols desktop), Sheet-based mobile cart, touch-optimized controls
- **Members.tsx**: Mobile card layout with avatar, contact info, status badge, and action buttons; table layout for desktop
- **Leads.tsx**: Compact stats grid (2 cols mobile, 3 cols tablet, 5 cols desktop), stacked filters on mobile, card-based lead list with desktop table fallback
- **Mobile Design Pattern**: Uses `sm:hidden` for mobile-only views, `hidden sm:block` for desktop-only views, consistent with Tailwind responsive utilities

## Shop Mobile Store View (December 2025)
- **Mobile-First Shopping Experience**: Shop page now shows a customer-facing store view on mobile by default
- **Features**: 2-column product grid, cart with Sheet component, product detail dialog, search & category filters
- **Admin Toggle**: Admins can switch between "Store" and "Admin" views using toggle buttons
- **Cart Functionality**: Add to cart, quantity adjustment, checkout with payment method selection
- **Order Creation**: Places orders directly from cart with selected payment method

## Product Image Display Fix (December 2025)
- **Backend Fix**: Added `imageUrl` property to product API responses in `storage.ts`
- **Database**: Products store images in `images` column as JSON array of URLs
- **Transformation**: Backend now parses JSON array and extracts first image as `imageUrl`
- **Frontend**: Shop.tsx and MemberStore.tsx now use `product.imageUrl` for consistent image display
- **Fallback**: Shows placeholder icon when no image is available

## Admin Dashboard Mobile Responsiveness Audit (December 2025)
Comprehensive mobile responsiveness overhaul for AdminDashboard.tsx:
- **KPI Cards Grid**: Changed to 2-col mobile (grid-cols-2), 3-col tablet (md:grid-cols-3), 5-col desktop (lg:grid-cols-5). Compact padding (p-3 sm:p-4), smaller fonts (text-xs sm:text-sm), truncate overflow text
- **Quick Actions**: Touch-friendly buttons (min-h-[44px]), horizontal scroll with snap-x on mobile, wrap on sm+ screens
- **Today at a Glance + Chart**: Stacked on mobile, responsive chart heights (h-[120px] sm:h-[150px]), smaller axis labels with tick fontSize adjustments
- **Renewals & Leads Cards**: Full-width TabsList, compact list items (p-2 sm:p-3), touch-sized action buttons (h-7 w-7), truncated names/status
- **Billing & Classes Cards**: Responsive headers with stacked layout on mobile, shortened labels ("Remind" vs "Send Reminder")
- **Shop & Alerts Cards**: Shop grid stacks on mobile (grid-cols-1 sm:grid-cols-2), alerts with proper touch targets (min-h-[48px])
- **Dialogs**: Near full-width on mobile (w-[95vw]), reduced max-height for virtual keyboards (max-h-[85vh])
- **Typography Scale**: Uses text-[10px] for ultra-compact mobile, text-xs/sm for regular, text-base for desktop
- **Touch Targets**: All interactive elements minimum 44x44px on mobile per accessibility guidelines
- **Responsive Breakpoints**: Uses sm:640px, md:768px, lg:1024px consistent with Tailwind defaults

## Schema-Storage Sync Audit (December 2025)
Fixed 23 TypeScript errors in `server/storage.ts` caused by references to non-existent schema columns:
- **Members table**: Removed `emergencyContactName`, `emergencyContactPhone`, `medicalInfo` (not in schema)
- **ClassTypes table**: Changed `color` to `capacity` (schema has capacity, not color)
- **Classes table**: Removed `name`, `description`, `location`; added `notes` (matches actual schema)
- **Null date handling**: Added null check for `checkInTime` in attendance auto-checkout logic (line 2369)
- **Safe migration strategy**: Fixed by removing phantom column references in storage.ts rather than adding schema columns, avoiding database migrations

## Order Placement Fix (December 2025)
Fixed validation error when placing orders:
- **Shop.tsx**: Fixed `handleCheckout` to include all required fields: `memberId`, `subtotal`, `totalAmount`, and proper item format with `productName` and `price` (was using `unitPrice`)
- **MemberStore.tsx**: Enhanced checkout to validate member ID and convert all numeric fields to `Number()` type
- **OrderForm.tsx**: Added `subtotal` and `paymentStatus` to payload, ensured items have proper format
- **Error**: Was sending `unitPrice` instead of `price`, missing `productName`, `memberId`, `subtotal`, `totalAmount`

## Trainer RBAC - Order Creation (December 2025)
Restricted trainers from creating orders:
- **Backend**: Added role check in `POST /api/orders` endpoint - returns 403 error for trainers
- **Frontend Shop.tsx**: Hidden "Create Order" button for trainers, disabled checkout button with clear message
- **Frontend Shop.tsx**: Added trainer check in `handleCheckout` with user-friendly toast message
- **Policy**: Trainers can view orders and products but cannot place orders - must contact admin

## Analytics Dashboard Mobile Fix (December 2025)
Fixed mobile rendering for AdminAnalyticsDashboard:
- **MonthlyRevenueChart**: Changed `col-span-2` to `md:col-span-2` so it displays correctly on mobile (single column)
- **Header layout**: Added `flex-col sm:flex-row` for stacked layout on mobile
- **Title truncation**: Added `truncate` class for long titles on small screens