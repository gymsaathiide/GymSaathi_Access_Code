import { pgTable, text, uuid, integer, decimal, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const planEnum = pgEnum('plan', ['starter', 'professional', 'enterprise']);
export const statusEnum = pgEnum('status', ['active', 'pending', 'suspended']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'past_due', 'canceled', 'trialing']);
export const billingCycleEnum = pgEnum('billing_cycle', ['monthly', 'yearly']);
export const transactionStatusEnum = pgEnum('transaction_status', ['paid', 'pending', 'partially_paid', 'failed', 'refunded']);
export const severityEnum = pgEnum('severity', ['info', 'warning', 'critical']);
export const actionStatusEnum = pgEnum('action_status', ['success', 'failed']);
export const integrationType = pgEnum('integration_type', ['payment', 'email', 'analytics', 'storage', 'communication']);
export const integrationStatusEnum = pgEnum('integration_status', ['active', 'inactive', 'error']);

// Pricing plan type enum for superadmin billing
export const pricingPlanTypeEnum = pgEnum('pricing_plan_type', ['standard', 'custom']);

// Gyms table
export const gyms = pgTable("gyms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  owner: text("owner").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  plan: planEnum("plan").notNull(),
  status: statusEnum("status").notNull(),
  members: integer("members").default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default('0'),
  address: text("address"),
  logoUrl: text("logo_url"),
  pricingPlanType: pricingPlanTypeEnum("pricing_plan_type").default('standard'),
  ratePerMember: decimal("rate_per_member", { precision: 10, scale: 2 }).default('75'),
  billingCycleStart: integer("billing_cycle_start").default(1),
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGymSchema = createInsertSchema(gyms).omit({ id: true, createdAt: true, members: true, revenue: true });
export type InsertGym = z.infer<typeof insertGymSchema>;
export type Gym = typeof gyms.$inferSelect;

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }),
  gymName: text("gym_name").notNull(),
  plan: planEnum("plan").notNull(),
  status: subscriptionStatusEnum("status").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  billingCycle: billingCycleEnum("billing_cycle").notNull(),
  nextBillingDate: timestamp("next_billing_date").notNull(),
  startDate: timestamp("start_date").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, startDate: true, gymId: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Transactions table
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }),
  gymName: text("gym_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").notNull(),
  date: timestamp("date").defaultNow(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  description: text("description"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, date: true, gymId: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Branding table
export const branding = pgTable("branding", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).unique(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default('#3b82f6'),
  secondaryColor: text("secondary_color").default('#10b981'),
  accentColor: text("accent_color").default('#f59e0b'),
  customDomain: text("custom_domain"),
  companyName: text("company_name").notNull(),
});

export const insertBrandingSchema = createInsertSchema(branding).omit({ id: true, gymId: true });
export type InsertBranding = z.infer<typeof insertBrandingSchema>;
export type Branding = typeof branding.$inferSelect;

// Audit Logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: timestamp("timestamp").defaultNow(),
  userId: uuid("user_id").notNull(),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  severity: severityEnum("severity").notNull(),
  ipAddress: text("ip_address").notNull(),
  details: text("details"),
  status: actionStatusEnum("status").notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Security Audit table - for functional user errors only (auto-expires after 3 days)
export const securityAudit = pgTable("security_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  userName: text("user_name").notNull(),
  role: text("role").notNull(),
  errorMessage: text("error_message").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertSecurityAuditSchema = createInsertSchema(securityAudit).omit({ id: true, createdAt: true });
export type InsertSecurityAudit = z.infer<typeof insertSecurityAuditSchema>;
export type SecurityAudit = typeof securityAudit.$inferSelect;

// Integrations table
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: integrationType("type").notNull(),
  status: integrationStatusEnum("status").notNull(),
  apiKey: text("api_key"),
  lastSync: timestamp("last_sync"),
  description: text("description").notNull(),
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({ id: true, lastSync: true });
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrations.$inferSelect;

// === NEW TABLES FOR COMPLETE GYM ERP ===

// User Roles & Authentication
export const roleEnum = pgEnum('role', ['superadmin', 'admin', 'trainer', 'member']);
export const memberStatusEnum = pgEnum('member_status', ['active', 'expired', 'frozen', 'cancelled']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'interested', 'converted', 'lost']);
export const paymentTypeEnum = pgEnum('payment_type', ['cash', 'upi', 'card', 'bank_transfer', 'razorpay']);
export const paymentSourceEnum = pgEnum('payment_source', ['membership', 'shop', 'other']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'paid', 'refunded']);

// Users table (for authentication)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  // Removed gymId - users can now be members at multiple gyms
  // Each gym relationship is tracked via the members table
  name: text("name").notNull(),
  phone: text("phone"),
  profileImageUrl: text("profile_image_url"),
  isActive: integer("is_active").default(1), // 1 = active, 0 = inactive
  isOtpVerified: integer("is_otp_verified").default(0), // 0 = not verified, 1 = verified (first-time login OTP)
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLogin: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// OTP Verifications table (for first-time login and secure operations)
export const otpVerifications = pgTable("otp_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  otpHash: text("otp_hash").notNull(), // Hashed OTP for security
  purpose: text("purpose").notNull().default('first_login'), // first_login, email_change, etc.
  expiresAt: timestamp("expires_at").notNull(),
  used: integer("used").default(0), // 0 = not used, 1 = used
  attempts: integer("attempts").default(0), // Track failed attempts for rate limiting
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtpVerificationSchema = createInsertSchema(otpVerifications).omit({ id: true, createdAt: true });
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;
export type OtpVerification = typeof otpVerifications.$inferSelect;

// Password Reset Tokens table (for forgot password functionality)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: integer("used").default(0), // 0 = not used, 1 = used
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Gym Admins - links users with admin role to gyms
export const gymAdmins = pgTable("gym_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGymAdminSchema = createInsertSchema(gymAdmins).omit({ id: true, createdAt: true });
export type InsertGymAdmin = z.infer<typeof insertGymAdminSchema>;
export type GymAdmin = typeof gymAdmins.$inferSelect;

// Admin Payment Details - stores admin's UPI/bank details for receiving payments
export const adminPaymentDetails = pgTable("admin_payment_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  qrUrl: text("qr_url"),
  upiId: text("upi_id"),
  bankAccountNumber: text("bank_account_number"),
  ifscCode: text("ifsc_code"),
  holderName: text("holder_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAdminPaymentDetailsSchema = createInsertSchema(adminPaymentDetails).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAdminPaymentDetails = z.infer<typeof insertAdminPaymentDetailsSchema>;
export type AdminPaymentDetails = typeof adminPaymentDetails.$inferSelect;

// Membership Plans
export const membershipPlans = pgTable("membership_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // in days
  features: text("features"), // JSON string
  isActive: integer("is_active").default(1),
  qrAttendanceEnabled: integer("qr_attendance_enabled").default(1), // Allow QR attendance for this plan
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMembershipPlanSchema = createInsertSchema(membershipPlans).omit({ id: true, createdAt: true, gymId: true });
export type InsertMembershipPlan = z.infer<typeof insertMembershipPlanSchema>;
export type MembershipPlan = typeof membershipPlans.$inferSelect;

// Members
export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  photoUrl: text("photo_url"),
  address: text("address"),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"),
  dateOfJoining: timestamp("date_of_joining"),
  paymentFinalAmount: decimal("payment_final_amount", { precision: 10, scale: 2 }),
  paymentPaidAmount: decimal("payment_paid_amount", { precision: 10, scale: 2 }),
  paymentMethod: text("payment_method"), // Cash, UPI, Debit/Credit
  transactionDate: timestamp("transaction_date"),
  status: memberStatusEnum("status").default('active').notNull(),
  joinDate: timestamp("join_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemberSchema = createInsertSchema(members).omit({ id: true, createdAt: true, joinDate: true, gymId: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

// Memberships (active subscriptions)
export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  planId: uuid("plan_id").references(() => membershipPlans.id).notNull(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: memberStatusEnum("status").default('active').notNull(),
  autoRenew: integer("auto_renew").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMembershipSchema = createInsertSchema(memberships).omit({ id: true, createdAt: true, gymId: true });
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Membership = typeof memberships.$inferSelect;

// Leads/Visitors
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  interestedPlan: text("interested_plan"),
  goal: text("goal"),
  message: text("message"),
  source: text("source"),
  channel: text("channel"),
  preferredChannel: text("preferred_channel"),
  preferredTime: text("preferred_time"),
  status: leadStatusEnum("status").default('new').notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  addedBy: uuid("added_by").references(() => users.id),
  notes: text("notes"),
  followUpDate: timestamp("follow_up_date"),
  convertedToMemberId: uuid("converted_to_member_id").references(() => members.id),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  whatsappSent: integer("whatsapp_sent").default(0),
  emailSent: integer("email_sent").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true, gymId: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Product Categories
export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({ id: true, createdAt: true, gymId: true });
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;

// Products
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  categoryId: uuid("category_id").references(() => productCategories.id),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  discountPrice: decimal("discount_price", { precision: 10, scale: 2 }),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).default('0'),
  stock: integer("stock").default(0).notNull(),
  lowStockAlert: integer("low_stock_alert").default(10),
  images: text("images"), // JSON array of image URLs
  variants: text("variants"), // JSON for size/color options
  isFeatured: integer("is_featured").default(0),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true, gymId: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default('pending').notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default('unpaid').notNull(),
  paymentType: paymentTypeEnum("payment_type"),
  paymentProof: text("payment_proof"), // URL to UPI screenshot
  transactionRef: text("transaction_ref"),
  shippingAddress: text("shipping_address"),
  notes: text("notes"),
  orderDate: timestamp("order_date").defaultNow(),
  deliveryDate: timestamp("delivery_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, orderDate: true, gymId: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order Items
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  variant: text("variant"), // size/color selected
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Payments
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  membershipId: uuid("membership_id").references(() => memberships.id),
  orderId: uuid("order_id").references(() => orders.id),
  invoiceId: uuid("invoice_id"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }).default('0'),
  paymentType: paymentTypeEnum("payment_type").notNull(),
  paymentSource: paymentSourceEnum("payment_source").default('membership'),
  paymentProof: text("payment_proof"),
  transactionRef: text("transaction_ref"),
  status: transactionStatusEnum("status").default('paid').notNull(),
  notes: text("notes"),
  paymentDate: timestamp("payment_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, paymentDate: true, gymId: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Invoices
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  membershipId: uuid("membership_id").references(() => memberships.id),
  orderId: uuid("order_id").references(() => orders.id),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default('0'),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default('0'),
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).default('0'),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0'),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default('0'),
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  status: transactionStatusEnum("status").default('pending').notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, gymId: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Class Types
export const classTypes = pgTable("class_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  capacity: integer("capacity").notNull(),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClassTypeSchema = createInsertSchema(classTypes).omit({ id: true, createdAt: true, gymId: true });
export type InsertClassType = z.infer<typeof insertClassTypeSchema>;
export type ClassType = typeof classTypes.$inferSelect;

// Classes/Schedules
export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  classTypeId: uuid("class_type_id").references(() => classTypes.id).notNull(),
  trainerId: uuid("trainer_id").references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  capacity: integer("capacity").notNull(),
  bookedCount: integer("booked_count").default(0),
  status: text("status").default('scheduled'), // scheduled, ongoing, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClassSchema = createInsertSchema(classes).omit({ id: true, createdAt: true, bookedCount: true, gymId: true });
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;

// Class Bookings
export const classBookings = pgTable("class_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }).notNull(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  status: text("status").default('confirmed'), // confirmed, cancelled, waitlist
  bookedAt: timestamp("booked_at").defaultNow(),
});

export const insertClassBookingSchema = createInsertSchema(classBookings).omit({ id: true, bookedAt: true });
export type InsertClassBooking = z.infer<typeof insertClassBookingSchema>;
export type ClassBooking = typeof classBookings.$inferSelect;

// Attendance
// Attendance status: "in" = currently in gym, "out" = finished
export const attendanceStatusEnum = pgEnum("attendance_status", ["in", "out"]);
// Exit type: how the session ended
export const exitTypeEnum = pgEnum("exit_type", ["manual", "auto"]);

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  checkInTime: timestamp("check_in_time").defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  status: attendanceStatusEnum("status").default('in').notNull(), // "in" or "out"
  exitType: exitTypeEnum("exit_type"), // "manual" or "auto" (null while checked in)
  source: text("source").default('manual'), // manual, qr_scan, class
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true, checkInTime: true, gymId: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

// Attendance QR Config (per gym)
export const attendanceQrConfig = pgTable("attendance_qr_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull().unique(),
  secret: text("secret").notNull(), // Random secret for QR validation
  isEnabled: integer("is_enabled").default(1),
  lastRotatedAt: timestamp("last_rotated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAttendanceQrConfigSchema = createInsertSchema(attendanceQrConfig).omit({ id: true, createdAt: true, lastRotatedAt: true });
export type InsertAttendanceQrConfig = z.infer<typeof insertAttendanceQrConfigSchema>;
export type AttendanceQrConfig = typeof attendanceQrConfig.$inferSelect;

// Class Attendance
export const classAttendance = pgTable("class_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }).notNull(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  status: text("status").default('present'), // present, absent
  markedAt: timestamp("marked_at").defaultNow(),
});

export const insertClassAttendanceSchema = createInsertSchema(classAttendance).omit({ id: true, markedAt: true });
export type InsertClassAttendance = z.infer<typeof insertClassAttendanceSchema>;
export type ClassAttendance = typeof classAttendance.$inferSelect;

// Trainer Attendance (separate from member attendance)
export const trainerAttendance = pgTable("trainer_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  trainerId: uuid("trainer_id").notNull(), // Reference to trainers.id (forward reference handled separately)
  checkInTime: timestamp("check_in_time").defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  status: attendanceStatusEnum("status").default('in').notNull(),
  exitType: exitTypeEnum("exit_type"),
  source: text("source").default('manual'), // manual, qr_scan
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrainerAttendanceSchema = createInsertSchema(trainerAttendance).omit({ id: true, createdAt: true, checkInTime: true, gymId: true });
export type InsertTrainerAttendance = z.infer<typeof insertTrainerAttendanceSchema>;
export type TrainerAttendance = typeof trainerAttendance.$inferSelect;

// Trainers
export const trainers = pgTable("trainers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").default('trainer'), // 'trainer' or 'head_trainer'
  specializations: text("specializations"), // JSON array of specializations
  certifications: text("certifications"), // JSON array
  experience: integer("experience"), // years
  rating: decimal("rating", { precision: 3, scale: 2 }),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  status: text("status").default('active'), // 'active', 'inactive', 'on_leave'
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrainerSchema = createInsertSchema(trainers).omit({ id: true, createdAt: true, gymId: true });
export type InsertTrainer = z.infer<typeof insertTrainerSchema>;
export type Trainer = typeof trainers.$inferSelect;

// Equipment
export const equipment = pgTable("equipment", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  category: text("category"),
  quantity: integer("quantity").default(1),
  purchaseDate: timestamp("purchase_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  lastMaintenance: timestamp("last_maintenance"),
  nextMaintenance: timestamp("next_maintenance"),
  status: text("status").default('operational'), // operational, maintenance, broken
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({ id: true, createdAt: true, gymId: true });
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default('info'), // info, success, warning, error
  isRead: integer("is_read").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// WhatsApp Messages Log
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  recipient: text("recipient").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // payment_reminder, class_reminder, lead_followup, etc.
  status: text("status").default('pending'), // pending, sent, failed
  watxMessageId: text("watx_message_id"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, createdAt: true, sentAt: true, gymId: true });
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

// Announcements
export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  targetRole: text("target_role"), // all, member, trainer, null = superadmin to all gyms
  isActive: integer("is_active").default(1),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true, gymId: true });
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// Store Settings
export const storeSettings = pgTable("store_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull().unique(),
  storeEnabled: integer("store_enabled").default(1),
  showOutOfStock: integer("show_out_of_stock").default(0),
  defaultTaxPercent: decimal("default_tax_percent", { precision: 5, scale: 2 }).default('0'),
  allowCashPayment: integer("allow_cash_payment").default(1),
  allowUpiPayment: integer("allow_upi_payment").default(1),
  allowOnlinePayment: integer("allow_online_payment").default(0),
  razorpayKeyId: text("razorpay_key_id"),
  razorpayKeySecret: text("razorpay_key_secret"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStoreSettingsSchema = createInsertSchema(storeSettings).omit({ id: true, createdAt: true, updatedAt: true, gymId: true });
export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;
export type StoreSettings = typeof storeSettings.$inferSelect;

// Gym Invoice Status Enum
export const gymInvoiceStatusEnum = pgEnum('gym_invoice_status', ['pending', 'paid', 'overdue', 'cancelled']);

// Gym Invoices (Superadmin billing to gyms)
export const gymInvoices = pgTable("gym_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  activeMembers: integer("active_members").notNull(),
  ratePerMember: decimal("rate_per_member", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default('0'),
  status: gymInvoiceStatusEnum("status").default('pending').notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  paymentMethod: text("payment_method"),
  paymentRef: text("payment_ref"),
  notes: text("notes"),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGymInvoiceSchema = createInsertSchema(gymInvoices).omit({ id: true, createdAt: true, generatedAt: true });
export type InsertGymInvoice = z.infer<typeof insertGymInvoiceSchema>;
export type GymInvoice = typeof gymInvoices.$inferSelect;

// Revenue Snapshots (for historical tracking)
export const revenueSnapshots = pgTable("revenue_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalGyms: integer("total_gyms").notNull(),
  activeGyms: integer("active_gyms").notNull(),
  totalMembers: integer("total_members").notNull(),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).notNull(),
  standardPlanRevenue: decimal("standard_plan_revenue", { precision: 12, scale: 2 }).default('0'),
  customPlanRevenue: decimal("custom_plan_revenue", { precision: 12, scale: 2 }).default('0'),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default('0'),
  pendingAmount: decimal("pending_amount", { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRevenueSnapshotSchema = createInsertSchema(revenueSnapshots).omit({ id: true, createdAt: true });
export type InsertRevenueSnapshot = z.infer<typeof insertRevenueSnapshotSchema>;
export type RevenueSnapshot = typeof revenueSnapshots.$inferSelect;

// Admin Dashboard Types
export interface MemberRenewalRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  planName: string;
  expiryDate: string;
  daysLeft: number;
  dueAmount?: number;
}

export interface LeadFollowupRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  lastContact: string | null;
  nextFollowUp: string | null;
  status: string;
}

export interface MemberDueRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  dueAmount: number;
  lastPaymentDate: string | null;
}

export interface ClassRow {
  id: string;
  name: string;
  trainerName: string;
  startTime: string;
  endTime: string;
  booked: number;
  capacity: number;
  status: string;
}

export interface ShopOrderRow {
  id: string;
  orderNumber: string;
  memberName: string;
  itemsCount: number;
  amount: number;
  status: string;
  orderDate: string;
}

export interface LowStockRow {
  id: string;
  name: string;
  stock: number;
  lowStockAlert: number;
}

export interface AlertRow {
  id: string;
  type: 'expiring_membership' | 'high_dues' | 'missed_followup' | 'out_of_stock' | 'low_stock';
  title: string;
  description: string;
  count: number;
  link: string;
}

export interface AdminDashboardResponse {
  kpis: {
    activeMembers: number;
    newMembersThisMonth: number;
    revenueThisMonth: number;
    revenueChangePercent: number;
    pendingDuesAmount: number;
    pendingDuesMembers: number;
    leadsInPipeline: number;
    followupsToday: number;
    todaysCheckins: number;
    yesterdaysCheckins: number;
  };
  today: {
    classesSummary: {
      total: number;
      upcoming: number;
      ongoing: number;
      completed: number;
    };
    attendanceToday: {
      checkins: number;
      diffFromYesterday: number;
    };
    collectionsToday: {
      total: number;
      byMethod: {
        cash: number;
        upi: number;
        card: number;
        razorpay: number;
        bank_transfer: number;
      };
    };
  };
  renewals: {
    expiringSoon: MemberRenewalRow[];
    overdue: MemberRenewalRow[];
  };
  leads: {
    newThisMonth: number;
    conversionRate: number;
    followupsToday: LeadFollowupRow[];
  };
  billing: {
    revenueThisMonth: number;
    paidInvoices: number;
    pendingInvoices: number;
    dues: MemberDueRow[];
  };
  classes: {
    todaysClasses: ClassRow[];
    attendanceLast7Days: { date: string; checkins: number }[];
  };
  shop: {
    revenueThisMonth: number;
    ordersToday: number;
    pendingOrders: number;
    recentOrders: ShopOrderRow[];
    lowStockProducts: LowStockRow[];
  };
  alerts: AlertRow[];
}

// === DIET PLANNER - DATABASE-DRIVEN MEALS ===

// Health Goals Rules - maps body composition metrics to health goals
export const healthGoalEnum = pgEnum('health_goal', ['fat_loss', 'muscle_gain', 'weight_loss', 'maintenance']);
export const mealCategoryEnum = pgEnum('meal_category', ['veg', 'non-veg']);
export const mealTypeEnum = pgEnum('meal_type', ['breakfast', 'lunch', 'snack', 'dinner']);

// Health Goals Rules Table
export const healthGoalsRules = pgTable("health_goals_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  bmiMin: decimal("bmi_min", { precision: 5, scale: 2 }),
  bmiMax: decimal("bmi_max", { precision: 5, scale: 2 }),
  bodyFatMin: decimal("body_fat_min", { precision: 5, scale: 2 }),
  bodyFatMax: decimal("body_fat_max", { precision: 5, scale: 2 }),
  visceralFatMin: decimal("visceral_fat_min", { precision: 5, scale: 2 }),
  visceralFatMax: decimal("visceral_fat_max", { precision: 5, scale: 2 }),
  muscleMassMin: decimal("muscle_mass_min", { precision: 5, scale: 2 }),
  muscleMassMax: decimal("muscle_mass_max", { precision: 5, scale: 2 }),
  goal: healthGoalEnum("goal").notNull(),
  explanation: text("explanation").notNull(),
  priority: integer("priority").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHealthGoalsRulesSchema = createInsertSchema(healthGoalsRules).omit({ id: true, createdAt: true });
export type InsertHealthGoalsRules = z.infer<typeof insertHealthGoalsRulesSchema>;
export type HealthGoalsRules = typeof healthGoalsRules.$inferSelect;

// Meal Database Table - stores all recommended meals
export const mealDatabase = pgTable("meal_database", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  type: mealTypeEnum("type").notNull(),
  category: mealCategoryEnum("category").notNull(),
  calories: integer("calories").notNull(),
  protein: decimal("protein", { precision: 6, scale: 2 }).notNull(),
  carbs: decimal("carbs", { precision: 6, scale: 2 }).notNull(),
  fat: decimal("fat", { precision: 6, scale: 2 }).notNull(),
  healthGoal: healthGoalEnum("health_goal").notNull(),
  description: text("description"),
  ingredients: text("ingredients"), // JSON array
  recipeInstructions: text("recipe_instructions"), // JSON array
  prepTimeMinutes: integer("prep_time_minutes"),
  cookTimeMinutes: integer("cook_time_minutes"),
  portionSize: text("portion_size"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMealDatabaseSchema = createInsertSchema(mealDatabase).omit({ id: true, createdAt: true });
export type InsertMealDatabase = z.infer<typeof insertMealDatabaseSchema>;
export type MealDatabase = typeof mealDatabase.$inferSelect;

// === BREAKFAST MEALS DATABASE ===

// Breakfast category enum (veg, eggetarian, non-veg)
export const breakfastCategoryEnum = pgEnum('breakfast_category', ['veg', 'eggetarian', 'non-veg']);

// Breakfast Meals Table - imported from Excel
export const mealsBreakfast = pgTable("meals_breakfast", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ingredients: text("ingredients"),
  protein: decimal("protein", { precision: 6, scale: 2 }).notNull(),
  carbs: decimal("carbs", { precision: 6, scale: 2 }).notNull(),
  fats: decimal("fats", { precision: 6, scale: 2 }).notNull(),
  calories: decimal("calories", { precision: 6, scale: 2 }).notNull(),
  category: breakfastCategoryEnum("category").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMealsBreakfastSchema = createInsertSchema(mealsBreakfast).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMealsBreakfast = z.infer<typeof insertMealsBreakfastSchema>;
export type MealsBreakfast = typeof mealsBreakfast.$inferSelect;

// === LUNCH MEALS DATABASE ===

// Lunch category enum (veg, eggetarian, non-veg)
export const lunchCategoryEnum = pgEnum('lunch_category', ['veg', 'eggetarian', 'non-veg']);

// Lunch Meals Table
export const mealsLunch = pgTable("meals_lunch", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ingredients: text("ingredients"),
  protein: decimal("protein", { precision: 6, scale: 2 }).notNull(),
  carbs: decimal("carbs", { precision: 6, scale: 2 }).notNull(),
  fats: decimal("fats", { precision: 6, scale: 2 }).notNull(),
  calories: decimal("calories", { precision: 6, scale: 2 }).notNull(),
  category: lunchCategoryEnum("category").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMealsLunchSchema = createInsertSchema(mealsLunch).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMealsLunch = z.infer<typeof insertMealsLunchSchema>;
export type MealsLunch = typeof mealsLunch.$inferSelect;

// === DINNER MEALS DATABASE ===

// Dinner category enum (veg, eggetarian, non-veg)
export const dinnerCategoryEnum = pgEnum('dinner_category', ['veg', 'eggetarian', 'non-veg']);

// Dinner Meals Table
export const mealsDinner = pgTable("meals_dinner", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ingredients: text("ingredients"),
  protein: decimal("protein", { precision: 6, scale: 2 }).notNull(),
  carbs: decimal("carbs", { precision: 6, scale: 2 }).notNull(),
  fats: decimal("fats", { precision: 6, scale: 2 }).notNull(),
  calories: decimal("calories", { precision: 6, scale: 2 }).notNull(),
  category: dinnerCategoryEnum("category").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMealsDinnerSchema = createInsertSchema(mealsDinner).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMealsDinner = z.infer<typeof insertMealsDinnerSchema>;
export type MealsDinner = typeof mealsDinner.$inferSelect;

// === SNACKS MEALS DATABASE ===

// Snacks category enum (veg, eggetarian, non-veg)
export const snacksCategoryEnum = pgEnum('snacks_category', ['veg', 'eggetarian', 'non-veg']);

// Snacks Meals Table
export const mealsSnacks = pgTable("meals_snacks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ingredients: text("ingredients"),
  protein: decimal("protein", { precision: 6, scale: 2 }).notNull(),
  carbs: decimal("carbs", { precision: 6, scale: 2 }).notNull(),
  fats: decimal("fats", { precision: 6, scale: 2 }).notNull(),
  calories: decimal("calories", { precision: 6, scale: 2 }).notNull(),
  category: snacksCategoryEnum("category").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMealsSnacksSchema = createInsertSchema(mealsSnacks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMealsSnacks = z.infer<typeof insertMealsSnacksSchema>;
export type MealsSnacks = typeof mealsSnacks.$inferSelect;

// === AI DIET PLANNER - FULL SYSTEM ===

// Festival mode enum for dietary restrictions during festivals
export const festivalModeEnum = pgEnum('festival_mode', ['none', 'navratri', 'ekadashi', 'fasting']);

// Diet goal enum for plan generation
export const dietGoalEnum = pgEnum('diet_goal', ['fat_loss', 'muscle_gain', 'trim_tone']);

// Lifestyle multiplier enum for TDEE calculation
export const lifestyleEnum = pgEnum('lifestyle', ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']);

// Body Composition Reports - stores body analysis data with BMR for TDEE calculation
export const bodyCompositionReports = pgTable("body_composition_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  reportDate: timestamp("report_date").defaultNow(),
  weight: decimal("weight", { precision: 6, scale: 2 }),
  bmi: decimal("bmi", { precision: 5, scale: 2 }),
  bodyFatPercentage: decimal("body_fat_percentage", { precision: 5, scale: 2 }),
  fatMass: decimal("fat_mass", { precision: 6, scale: 2 }),
  fatFreeBodyWeight: decimal("fat_free_body_weight", { precision: 6, scale: 2 }),
  muscleMass: decimal("muscle_mass", { precision: 6, scale: 2 }),
  muscleRate: decimal("muscle_rate", { precision: 5, scale: 2 }),
  skeletalMuscle: decimal("skeletal_muscle", { precision: 6, scale: 2 }),
  boneMass: decimal("bone_mass", { precision: 5, scale: 2 }),
  proteinMass: decimal("protein_mass", { precision: 6, scale: 2 }),
  protein: decimal("protein", { precision: 5, scale: 2 }),
  waterWeight: decimal("water_weight", { precision: 6, scale: 2 }),
  bodyWater: decimal("body_water", { precision: 5, scale: 2 }),
  subcutaneousFat: decimal("subcutaneous_fat", { precision: 5, scale: 2 }),
  visceralFat: decimal("visceral_fat", { precision: 5, scale: 2 }),
  bmr: integer("bmr"),
  bodyAge: integer("body_age"),
  idealBodyWeight: decimal("ideal_body_weight", { precision: 6, scale: 2 }),
  weightStatus: text("weight_status"),
  bmiStatus: text("bmi_status"),
  bodyFatStatus: text("body_fat_status"),
  fatMassStatus: text("fat_mass_status"),
  fatFreeBodyWeightStatus: text("fat_free_body_weight_status"),
  muscleMassStatus: text("muscle_mass_status"),
  muscleRateStatus: text("muscle_rate_status"),
  skeletalMuscleStatus: text("skeletal_muscle_status"),
  boneMassStatus: text("bone_mass_status"),
  proteinMassStatus: text("protein_mass_status"),
  proteinStatus: text("protein_status"),
  waterWeightStatus: text("water_weight_status"),
  bodyWaterStatus: text("body_water_status"),
  subcutaneousFatStatus: text("subcutaneous_fat_status"),
  visceralFatStatus: text("visceral_fat_status"),
  bmrStatus: text("bmr_status"),
  bodyAgeStatus: text("body_age_status"),
  idealBodyWeightStatus: text("ideal_body_weight_status"),
  userName: text("user_name"),
  rawText: text("raw_text"),
  fileName: text("file_name"),
  lifestyle: text("lifestyle"),
  goal: text("goal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBodyCompositionReportsSchema = createInsertSchema(bodyCompositionReports).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBodyCompositionReports = z.infer<typeof insertBodyCompositionReportsSchema>;
export type BodyCompositionReports = typeof bodyCompositionReports.$inferSelect;

// AI Diet Plans - stores generated meal plans (renamed to avoid conflict with existing diet_plans)
export const aiDietPlans = pgTable("ai_diet_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  gymId: uuid("gym_id"),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  durationDays: integer("duration_days").notNull(),
  targetCalories: integer("target_calories").notNull(),
  tdee: integer("tdee"),
  dietaryPreference: text("dietary_preference").notNull(),
  festivalMode: text("festival_mode").default('none'),
  macroProtein: integer("macro_protein"),
  macroCarbs: integer("macro_carbs"),
  macroFat: integer("macro_fat"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertAiDietPlans = typeof aiDietPlans.$inferInsert;
export type AiDietPlans = typeof aiDietPlans.$inferSelect;

// AI Diet Plan Items - individual meals in a plan
export const aiDietPlanItems = pgTable("ai_diet_plan_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => aiDietPlans.id, { onDelete: 'cascade' }),
  dayNumber: integer("day_number").notNull(),
  mealType: text("meal_type").notNull(),
  mealId: uuid("meal_id"),
  mealName: text("meal_name").notNull(),
  calories: integer("calories").notNull(),
  protein: decimal("protein", { precision: 6, scale: 2 }).notNull(),
  carbs: decimal("carbs", { precision: 6, scale: 2 }).notNull(),
  fat: decimal("fat", { precision: 6, scale: 2 }).notNull(),
  category: text("category").notNull(),
  isFavorite: boolean("is_favorite").default(false),
  isExcluded: boolean("is_excluded").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertAiDietPlanItems = typeof aiDietPlanItems.$inferInsert;
export type AiDietPlanItems = typeof aiDietPlanItems.$inferSelect;

// Member Diet Preferences - stores user dietary preferences
export const memberDietPreferences = pgTable("member_diet_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  dietaryPreference: text("dietary_preference").default('non-veg'), // veg, eggetarian, non-veg
  festivalMode: text("festival_mode").default('none'),
  excludedIngredients: text("excluded_ingredients"), // JSON array
  preferredCuisine: text("preferred_cuisine").default('indian'),
  allergies: text("allergies"), // JSON array
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMemberDietPreferencesSchema = createInsertSchema(memberDietPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMemberDietPreferences = z.infer<typeof insertMemberDietPreferencesSchema>;
export type MemberDietPreferences = typeof memberDietPreferences.$inferSelect;

// Meal Favorites - tracks user favorite meals
export const mealFavorites = pgTable("meal_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  mealId: uuid("meal_id").notNull(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, snack, dinner
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMealFavoritesSchema = createInsertSchema(mealFavorites).omit({ id: true, createdAt: true });
export type InsertMealFavorites = z.infer<typeof insertMealFavoritesSchema>;
export type MealFavorites = typeof mealFavorites.$inferSelect;

// Meal Exclusions - tracks meals user wants to exclude
export const mealExclusions = pgTable("meal_exclusions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  mealId: uuid("meal_id").notNull(),
  mealType: text("meal_type").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMealExclusionsSchema = createInsertSchema(mealExclusions).omit({ id: true, createdAt: true });
export type InsertMealExclusions = z.infer<typeof insertMealExclusionsSchema>;
export type MealExclusions = typeof mealExclusions.$inferSelect;

// ============================================================
// WORKOUT PLANNER MODULE
// ============================================================

// Workout Planner Enums
export const fitnessGoalEnum = pgEnum('fitness_goal', ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'general_fitness', 'sports_performance']);
export const experienceLevelEnum = pgEnum('experience_level', ['beginner', 'intermediate', 'advanced']);
export const muscleGroupEnum = pgEnum('muscle_group', ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body', 'cardio']);
export const equipmentTypeEnum = pgEnum('equipment_type', ['none', 'dumbbells', 'barbell', 'cables', 'machines', 'kettlebell', 'resistance_bands', 'bodyweight', 'cardio_machine']);
export const workoutSplitEnum = pgEnum('workout_split', ['full_body', 'upper_lower', 'push_pull_legs', 'body_part_split', 'custom']);
export const workoutPlanStatusEnum = pgEnum('workout_plan_status', ['active', 'completed', 'paused', 'archived']);
export const exerciseStatusEnum = pgEnum('exercise_status', ['pending', 'completed', 'skipped', 'partial']);

// Exercise Library - master list of exercises
export const exerciseLibrary = pgTable("exercise_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  muscleGroup: muscleGroupEnum("muscle_group").notNull(),
  secondaryMuscles: text("secondary_muscles"), // JSON array of muscle groups
  equipmentType: equipmentTypeEnum("equipment_type").notNull(),
  difficulty: experienceLevelEnum("difficulty").notNull(),
  instructions: text("instructions"), // Step-by-step instructions
  tips: text("tips"), // Form tips
  videoUrl: text("video_url"), // Supabase storage URL
  thumbnailUrl: text("thumbnail_url"),
  defaultSets: integer("default_sets").default(3),
  defaultReps: text("default_reps").default('10-12'), // Can be range like "8-12" or time like "30s"
  defaultRestSeconds: integer("default_rest_seconds").default(60),
  isActive: boolean("is_active").default(true),
  gymId: uuid("gym_id"), // null = global exercise, set = gym-specific
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExerciseLibrarySchema = createInsertSchema(exerciseLibrary).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExerciseLibrary = z.infer<typeof insertExerciseLibrarySchema>;
export type ExerciseLibrary = typeof exerciseLibrary.$inferSelect;

// Workout Templates - reusable workout plan templates
export const workoutTemplates = pgTable("workout_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id"), // null = system template
  name: text("name").notNull(),
  description: text("description"),
  goal: fitnessGoalEnum("goal").notNull(),
  difficulty: experienceLevelEnum("difficulty").notNull(),
  split: workoutSplitEnum("split").notNull(),
  daysPerWeek: integer("days_per_week").notNull(),
  durationWeeks: integer("duration_weeks").default(4),
  isPublic: boolean("is_public").default(false),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkoutTemplateSchema = createInsertSchema(workoutTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkoutTemplate = z.infer<typeof insertWorkoutTemplateSchema>;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;

// Workout Plans - assigned to members
export const workoutPlans = pgTable("workout_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull(),
  memberId: uuid("member_id").notNull(),
  trainerId: uuid("trainer_id"), // null = auto-generated
  templateId: uuid("template_id"), // reference to template if used
  name: text("name").notNull(),
  description: text("description"),
  goal: fitnessGoalEnum("goal").notNull(),
  difficulty: experienceLevelEnum("difficulty").notNull(),
  split: workoutSplitEnum("split").notNull(),
  daysPerWeek: integer("days_per_week").notNull(),
  durationWeeks: integer("duration_weeks").default(4),
  currentWeek: integer("current_week").default(1),
  status: workoutPlanStatusEnum("status").default('active'),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;

// Workout Plan Days - days within a plan
export const workoutPlanDays = pgTable("workout_plan_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => workoutPlans.id, { onDelete: 'cascade' }),
  dayNumber: integer("day_number").notNull(), // 1-7
  name: text("name").notNull(), // e.g., "Push Day", "Leg Day", "Rest Day"
  description: text("description"),
  isRestDay: boolean("is_rest_day").default(false),
  targetMuscles: text("target_muscles"), // JSON array of muscle groups
  estimatedDuration: integer("estimated_duration"), // in minutes
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkoutPlanDaySchema = createInsertSchema(workoutPlanDays).omit({ id: true, createdAt: true });
export type InsertWorkoutPlanDay = z.infer<typeof insertWorkoutPlanDaySchema>;
export type WorkoutPlanDay = typeof workoutPlanDays.$inferSelect;

// Workout Plan Exercises - exercises in each day
export const workoutPlanExercises = pgTable("workout_plan_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  dayId: uuid("day_id").notNull().references(() => workoutPlanDays.id, { onDelete: 'cascade' }),
  exerciseId: uuid("exercise_id").notNull().references(() => exerciseLibrary.id),
  order: integer("order").notNull(),
  sets: integer("sets").notNull(),
  reps: text("reps").notNull(), // "10-12", "15", "30s", etc.
  weight: text("weight"), // "bodyweight", "50kg", "progressive"
  restSeconds: integer("rest_seconds").default(60),
  notes: text("notes"),
  supersetWith: uuid("superset_with"), // link to another exercise for supersets
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkoutPlanExerciseSchema = createInsertSchema(workoutPlanExercises).omit({ id: true, createdAt: true });
export type InsertWorkoutPlanExercise = z.infer<typeof insertWorkoutPlanExerciseSchema>;
export type WorkoutPlanExercise = typeof workoutPlanExercises.$inferSelect;

// Workout Logs - member workout tracking
export const workoutLogs = pgTable("workout_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull(),
  memberId: uuid("member_id").notNull(),
  planId: uuid("plan_id").references(() => workoutPlans.id),
  dayId: uuid("day_id").references(() => workoutPlanDays.id),
  workoutDate: timestamp("workout_date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  totalDuration: integer("total_duration"), // in minutes
  caloriesBurned: integer("calories_burned"),
  overallRating: integer("overall_rating"), // 1-5
  notes: text("notes"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type WorkoutLog = typeof workoutLogs.$inferSelect;

// Workout Exercise Logs - individual exercise tracking within a workout
export const workoutExerciseLogs = pgTable("workout_exercise_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutLogId: uuid("workout_log_id").notNull().references(() => workoutLogs.id, { onDelete: 'cascade' }),
  exerciseId: uuid("exercise_id").notNull().references(() => exerciseLibrary.id),
  planExerciseId: uuid("plan_exercise_id").references(() => workoutPlanExercises.id),
  status: exerciseStatusEnum("status").default('pending'),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  setsCompleted: integer("sets_completed").default(0),
  repsPerSet: text("reps_per_set"), // JSON array of reps per set
  weightPerSet: text("weight_per_set"), // JSON array of weights per set
  restTaken: text("rest_taken"), // JSON array of rest times
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkoutExerciseLogSchema = createInsertSchema(workoutExerciseLogs).omit({ id: true, createdAt: true });
export type InsertWorkoutExerciseLog = z.infer<typeof insertWorkoutExerciseLogSchema>;
export type WorkoutExerciseLog = typeof workoutExerciseLogs.$inferSelect;

// Profile status enum
export const profileStatusEnum = pgEnum('profile_status', ['incomplete', 'basic', 'complete']);

// Member Workout Preferences - workout preferences for auto-generation
export const memberWorkoutPreferences = pgTable("member_workout_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().unique(),
  gymId: uuid("gym_id").notNull(),
  fitnessGoal: fitnessGoalEnum("fitness_goal"),
  experienceLevel: experienceLevelEnum("experience_level"),
  preferredDaysPerWeek: integer("preferred_days_per_week").default(3),
  sessionDurationMinutes: integer("session_duration_minutes").default(60),
  preferredEquipment: text("preferred_equipment"), // JSON array
  preferredSplit: workoutSplitEnum("preferred_split"),
  injuries: text("injuries"), // Text description of injuries/medical conditions
  preferHomeWorkout: boolean("prefer_home_workout").default(false),
  profileStatus: profileStatusEnum("profile_status").default('incomplete'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMemberWorkoutPreferencesSchema = createInsertSchema(memberWorkoutPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMemberWorkoutPreferences = z.infer<typeof insertMemberWorkoutPreferencesSchema>;
export type MemberWorkoutPreferences = typeof memberWorkoutPreferences.$inferSelect;

// Trainer Workout Assignments - track trainer-member workout assignments
export const trainerWorkoutAssignments = pgTable("trainer_workout_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  gymId: uuid("gym_id").notNull(),
  trainerId: uuid("trainer_id").notNull(),
  memberId: uuid("member_id").notNull(),
  planId: uuid("plan_id").notNull().references(() => workoutPlans.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").defaultNow(),
  notes: text("notes"),
});
