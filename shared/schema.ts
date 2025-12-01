import { pgTable, text, uuid, integer, decimal, timestamp, pgEnum } from "drizzle-orm/pg-core";
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
  parentGymId: uuid("parent_gym_id"),
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
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLogin: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
