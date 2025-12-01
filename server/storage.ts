import { db } from './db';
import { eq, and, desc, asc, sql, gte, lte, or, like, isNull } from 'drizzle-orm';
import * as schema from '@shared/schema';
import bcrypt from 'bcrypt';

function getDb() {
  if (!db) {
    throw new Error('Database connection not available. Please check your DATABASE_URL or Supabase configuration.');
  }
  return db;
}

export function isDbAvailable(): boolean {
  return db !== null;
}

class Storage {
  private initialized = false;

  async createDemoUsers() {
    try {
      console.log('⚙️ Creating demo user accounts...');
      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 10);

      const powerFitGym = await getDb().select().from(schema.gyms).where(eq(schema.gyms.name, 'PowerFit Gym')).limit(1).then(rows => rows[0]);
      const gymId = powerFitGym?.id || null;

      const demoUsers = [
        { email: 'superadmin@gym.com', passwordHash: passwordHash, role: 'superadmin' as const, name: 'Super Admin', phone: '+1-555-0001', isActive: 1 },
        { email: 'admin@powerfit.com', passwordHash: passwordHash, role: 'admin' as const, name: 'Admin User', phone: '+1-555-0002', isActive: 1 },
        { email: 'trainer@powerfit.com', passwordHash: passwordHash, role: 'trainer' as const, name: 'Trainer User', phone: '+1-555-0003', isActive: 1 },
        { email: 'member@powerfit.com', passwordHash: passwordHash, role: 'member' as const, name: 'Member User', phone: '+1-555-0004', isActive: 1 },
      ];

      for (const user of demoUsers) {
        try {
          await getDb().insert(schema.users).values(user);
        } catch (err: any) {
          if (err.code !== '23505') {
            console.error(`Error creating user ${user.email}:`, err);
          }
        }
      }

      console.log('✅ Demo users created successfully');
      console.log('📧 Demo accounts: superadmin@gym.com, admin@powerfit.com, trainer@powerfit.com, member@powerfit.com');
      console.log('🔑 Password for all: password123');
    } catch (error) {
      console.error('❌ Error creating demo users:', error);
    }
  }

  async initializeSampleData() {
    if (this.initialized) return;

    if (!isDbAvailable()) {
      console.log('⚠️ Database not available, skipping sample data initialization');
      console.log('📌 Using Supabase client - please ensure your tables are created via Supabase dashboard');
      this.initialized = true;
      return;
    }

    try {
      const userCount = await getDb().select({ count: sql<number>`count(*)` }).from(schema.users).then(rows => rows[0]?.count || 0);

      if (!userCount || userCount === 0) {
        await this.createDemoUsers();
      }

      const gymCount = await getDb().select({ count: sql<number>`count(*)` }).from(schema.gyms).then(rows => rows[0]?.count || 0);

      if (gymCount && gymCount > 0) {
        this.initialized = true;
        return;
      }

      console.log('⚙️ Creating sample data...');

      const gymsData = [
        { name: 'PowerFit Gym', owner: 'John Smith', email: 'john@powerfit.com', phone: '555-0101', plan: 'enterprise' as const, status: 'active' as const, members: 450, revenue: '2500', address: '123 Main St, New York, NY' },
        { name: 'Iron Paradise', owner: 'Sarah Johnson', email: 'sarah@ironparadise.com', phone: '555-0102', plan: 'professional' as const, status: 'active' as const, members: 320, revenue: '1800', address: '456 Oak Ave, Los Angeles, CA' },
        { name: 'FitZone', owner: 'Mike Davis', email: 'mike@fitzone.com', phone: '555-0103', plan: 'starter' as const, status: 'pending' as const, members: 150, revenue: '800', address: '789 Pine Rd, Chicago, IL' },
        { name: 'Elite Athletics', owner: 'Emma Wilson', email: 'emma@eliteathletics.com', phone: '555-0104', plan: 'professional' as const, status: 'active' as const, members: 280, revenue: '1600', address: '321 Elm St, Houston, TX' },
        { name: 'CrossFit Central', owner: 'David Brown', email: 'david@crossfitcentral.com', phone: '555-0105', plan: 'starter' as const, status: 'suspended' as const, members: 120, revenue: '600', address: '654 Maple Dr, Phoenix, AZ' },
      ];

      for (const gymData of gymsData) {
        const gym = await getDb().insert(schema.gyms).values(gymData).returning().then(rows => rows[0]);

        const subscriptionStatus = gym.status === 'active' ? 'active' : gym.status === 'suspended' ? 'past_due' : 'trialing';
        await getDb().insert(schema.subscriptions).values({
          gymId: gym.id,
          gymName: gym.name,
          plan: gym.plan,
          status: subscriptionStatus as any,
          amount: gym.revenue || '0',
          billingCycle: 'monthly',
          nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        });

        for (let i = 0; i < 3; i++) {
          const transactionStatus = i === 0 ? 'paid' : Math.random() > 0.8 ? 'failed' : 'paid';
          await getDb().insert(schema.transactions).values({
            gymId: gym.id,
            gymName: gym.name,
            amount: gym.revenue || '0',
            status: transactionStatus as any,
            invoiceNumber: `INV-${Date.now()}-${gym.id.substring(0, 8)}-${i}`,
            description: `${gym.plan} plan - Monthly subscription`
          });
        }

        await getDb().insert(schema.branding).values({
          gymId: gym.id,
          primaryColor: '#3b82f6',
          secondaryColor: '#10b981',
          accentColor: '#f59e0b',
          companyName: gym.name,
          customDomain: `${gym.name.toLowerCase().replace(/\s+/g, '')}.gym`
        });
      }

      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 10);

      const powerFitGym = await getDb().select().from(schema.gyms).where(eq(schema.gyms.name, 'PowerFit Gym')).limit(1).then(rows => rows[0]);
      const gymId = powerFitGym?.id;

      const demoUsers = [
        { email: 'superadmin@gym.com', passwordHash: passwordHash, role: 'superadmin' as const, name: 'Super Admin', phone: '+1-555-0001', isActive: 1 },
        { email: 'admin@powerfit.com', passwordHash: passwordHash, role: 'admin' as const, name: 'Admin User', phone: '+1-555-0002', isActive: 1 },
        { email: 'trainer@powerfit.com', passwordHash: passwordHash, role: 'trainer' as const, name: 'Trainer User', phone: '+1-555-0003', isActive: 1 },
        { email: 'member@powerfit.com', passwordHash: passwordHash, role: 'member' as const, name: 'Member User', phone: '+1-555-0004', isActive: 1 },
      ];

      for (const user of demoUsers) {
        try {
          await getDb().insert(schema.users).values(user);
        } catch (err: any) {
          if (err.code !== '23505') {
            console.error(`Error creating user ${user.email}:`, err);
          }
        }
      }

      console.log('✅ Demo users created successfully');
      console.log('📧 Demo accounts: superadmin@gym.com, admin@powerfit.com, trainer@powerfit.com, member@powerfit.com');
      console.log('🔑 Password for all: password123');

      this.initialized = true;
      console.log('✅ Sample data initialized');
    } catch (error) {
      console.error('❌ Error initializing sample data:', error);
      throw error;
    }
  }

  async getAllGyms() {
    const data = await getDb().select().from(schema.gyms).orderBy(desc(schema.gyms.createdAt));
    return data;
  }

  async getRecentGyms(limit = 5) {
    const data = await getDb().select().from(schema.gyms).orderBy(desc(schema.gyms.createdAt)).limit(limit);
    return data;
  }

  async getGym(id: string) {
    const data = await getDb().select().from(schema.gyms).where(eq(schema.gyms.id, id)).limit(1).then(rows => rows[0]);
    return data || null;
  }

  async createGym(data: any) {
    const revenue = data.plan === 'enterprise' ? '2500' : data.plan === 'professional' ? '1500' : '800';
    const result = await getDb().insert(schema.gyms).values({ ...data, revenue }).returning().then(rows => rows[0]);
    return result;
  }

  async updateGym(id: string, data: any) {
    const result = await getDb().update(schema.gyms).set(data).where(eq(schema.gyms.id, id)).returning().then(rows => rows[0]);
    return result || null;
  }

  async deleteGym(id: string) {
    await getDb().delete(schema.gyms).where(eq(schema.gyms.id, id));
    return true;
  }

  async suspendGym(id: string) {
    const gym = await this.getGym(id);
    if (!gym) return null;
    const newStatus = gym.status === 'suspended' ? 'active' : 'suspended';
    const result = await getDb().update(schema.gyms).set({ status: newStatus as any }).where(eq(schema.gyms.id, id)).returning().then(rows => rows[0]);
    return result;
  }

  async getAllSubscriptions() {
    const data = await getDb().select().from(schema.subscriptions).orderBy(asc(schema.subscriptions.nextBillingDate));
    return data.map((row: any) => ({
      id: row.id,
      gymId: row.gymId,
      gymName: row.gymName,
      plan: row.plan,
      status: row.status,
      amount: parseFloat(row.amount),
      billingCycle: row.billingCycle,
      nextBillingDate: row.nextBillingDate,
      startDate: row.startDate,
    }));
  }

  async getAllTransactions() {
    const data = await getDb().select().from(schema.transactions).orderBy(desc(schema.transactions.date));
    return data.map((row: any) => ({
      id: row.id,
      gymId: row.gymId,
      gymName: row.gymName,
      amount: parseFloat(row.amount),
      status: row.status,
      date: row.date,
      invoiceNumber: row.invoiceNumber,
      description: row.description,
    }));
  }

  async getBranding(gymId: string) {
    const data = await getDb().select().from(schema.branding).where(eq(schema.branding.gymId, gymId)).limit(1).then(rows => rows[0]);
    if (!data) return null;
    return {
      id: data.id,
      gymId: data.gymId,
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      customDomain: data.customDomain,
      companyName: data.companyName,
    };
  }

  async saveBranding(gymId: string, data: any) {
    const existing = await this.getBranding(gymId);
    let result;

    if (existing) {
      result = await getDb().update(schema.branding).set(data).where(eq(schema.branding.gymId, gymId)).returning().then(rows => rows[0]);
    } else {
      result = await getDb().insert(schema.branding).values({ ...data, gymId }).returning().then(rows => rows[0]);
    }

    return {
      id: result.id,
      gymId: result.gymId,
      logoUrl: result.logoUrl,
      primaryColor: result.primaryColor,
      secondaryColor: result.secondaryColor,
      accentColor: result.accentColor,
      customDomain: result.customDomain,
      companyName: result.companyName,
    };
  }

  async getAnalytics() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Get all gyms
    const gymRows = await getDb().select().from(schema.gyms);
    const activeGyms = gymRows.filter((g: any) => g.status === 'active').length;
    const totalGyms = gymRows.length;

    // Get total members from members table
    const membersResult = await getDb().select({ count: sql<number>`count(*)` }).from(schema.members);
    const totalUsers = Number(membersResult[0]?.count || 0);

    // Get revenue from paid invoices (this month)
    const thisMonthRevenue = await getDb().select({
      total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
    }).from(schema.gymInvoices).where(and(
      eq(schema.gymInvoices.status, 'paid'),
      eq(schema.gymInvoices.month, currentMonth),
      eq(schema.gymInvoices.year, currentYear)
    ));
    
    // Get total revenue all time from paid invoices
    const allTimeRevenue = await getDb().select({
      total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
    }).from(schema.gymInvoices).where(eq(schema.gymInvoices.status, 'paid'));
    
    const totalRevenue = parseFloat(String(allTimeRevenue[0]?.total || 0));

    // Get last month's revenue for growth calculation
    const lastMonthRevenue = await getDb().select({
      total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
    }).from(schema.gymInvoices).where(and(
      eq(schema.gymInvoices.status, 'paid'),
      eq(schema.gymInvoices.month, lastMonth),
      eq(schema.gymInvoices.year, lastMonthYear)
    ));
    
    const currentMonthRev = parseFloat(String(thisMonthRevenue[0]?.total || 0));
    const prevMonthRev = parseFloat(String(lastMonthRevenue[0]?.total || 0));
    const revenueGrowth = prevMonthRev > 0 
      ? Math.round(((currentMonthRev - prevMonthRev) / prevMonthRev) * 100 * 10) / 10
      : 0;

    // Calculate gym growth (new gyms this month vs last month)
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const startOfLastMonth = new Date(lastMonthYear, lastMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth - 1, 0);
    
    const newGymsThisMonth = gymRows.filter(g => {
      const createdAt = g.createdAt ? new Date(g.createdAt) : null;
      return createdAt && createdAt >= startOfMonth;
    }).length;
    
    const newGymsLastMonth = gymRows.filter(g => {
      const createdAt = g.createdAt ? new Date(g.createdAt) : null;
      return createdAt && createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
    }).length;
    
    const gymGrowth = newGymsLastMonth > 0 
      ? Math.round(((newGymsThisMonth - newGymsLastMonth) / newGymsLastMonth) * 100 * 10) / 10
      : (newGymsThisMonth > 0 ? 100 : 0);

    // Calculate user growth (new members this month vs last month)
    const allMembers = await getDb().select().from(schema.members);
    const newUsersThisMonth = allMembers.filter(m => {
      const createdAt = m.createdAt ? new Date(m.createdAt) : null;
      return createdAt && createdAt >= startOfMonth;
    }).length;
    
    const newUsersLastMonth = allMembers.filter(m => {
      const createdAt = m.createdAt ? new Date(m.createdAt) : null;
      return createdAt && createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
    }).length;
    
    const userGrowth = newUsersLastMonth > 0 
      ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 * 10) / 10
      : (newUsersThisMonth > 0 ? 100 : 0);

    // Generate real revenue chart data (last 6 months)
    const revenueChart = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNum = month.getMonth() + 1;
      const year = month.getFullYear();
      
      const monthRevenue = await getDb().select({
        total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
      }).from(schema.gymInvoices).where(and(
        eq(schema.gymInvoices.month, monthNum),
        eq(schema.gymInvoices.year, year)
      ));
      
      revenueChart.push({
        month: month.toLocaleString('default', { month: 'short' }),
        revenue: parseFloat(String(monthRevenue[0]?.total || 0))
      });
    }

    // Generate real user growth chart (last 6 months - cumulative members created up to that month)
    const userChart = [];
    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const usersAtMonth = allMembers.filter(m => {
        const createdAt = m.createdAt ? new Date(m.createdAt) : null;
        return createdAt && createdAt <= monthEnd;
      }).length;
      
      userChart.push({
        month: monthEnd.toLocaleString('default', { month: 'short' }),
        users: usersAtMonth
      });
    }

    // Plan distribution based on gym pricing type
    const standardGyms = gymRows.filter((g: any) => g.pricingPlanType !== 'custom').length;
    const customGyms = gymRows.filter((g: any) => g.pricingPlanType === 'custom').length;

    return {
      totalRevenue,
      activeGyms,
      totalUsers,
      systemHealth: 100,
      revenueGrowth,
      gymGrowth,
      userGrowth,
      revenueChart,
      userChart,
      planDistribution: [
        { name: 'Standard Plan', value: standardGyms },
        { name: 'Custom Plan', value: customGyms },
        { name: 'Active', value: activeGyms },
        { name: 'Total Gyms', value: totalGyms },
      ],
    };
  }

  async getStats() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const startOfLastMonth = new Date(lastMonthYear, lastMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth - 1, 0);

    const gymRows = await getDb().select().from(schema.gyms);
    const activeGyms = gymRows.filter((g: any) => g.status === 'active').length;
    
    // Get total revenue from paid invoices
    const allTimeRevenue = await getDb().select({
      total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
    }).from(schema.gymInvoices).where(eq(schema.gymInvoices.status, 'paid'));
    const totalRevenue = parseFloat(String(allTimeRevenue[0]?.total || 0));
    
    // Get total members
    const membersResult = await getDb().select({ count: sql<number>`count(*)` }).from(schema.members);
    const totalMembers = Number(membersResult[0]?.count || 0);
    
    // Calculate revenue change
    const thisMonthRevenue = await getDb().select({
      total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
    }).from(schema.gymInvoices).where(and(
      eq(schema.gymInvoices.status, 'paid'),
      eq(schema.gymInvoices.month, currentMonth),
      eq(schema.gymInvoices.year, currentYear)
    ));
    const lastMonthRevenue = await getDb().select({
      total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
    }).from(schema.gymInvoices).where(and(
      eq(schema.gymInvoices.status, 'paid'),
      eq(schema.gymInvoices.month, lastMonth),
      eq(schema.gymInvoices.year, lastMonthYear)
    ));
    const currentRev = parseFloat(String(thisMonthRevenue[0]?.total || 0));
    const prevRev = parseFloat(String(lastMonthRevenue[0]?.total || 0));
    const revenueChange = prevRev > 0 
      ? Math.round(((currentRev - prevRev) / prevRev) * 100 * 10) / 10 
      : 0;
    
    // Calculate gyms change
    const newGymsThisMonth = gymRows.filter(g => {
      const createdAt = g.createdAt ? new Date(g.createdAt) : null;
      return createdAt && createdAt >= startOfMonth;
    }).length;
    const newGymsLastMonth = gymRows.filter(g => {
      const createdAt = g.createdAt ? new Date(g.createdAt) : null;
      return createdAt && createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
    }).length;
    const gymsChange = newGymsLastMonth > 0 
      ? Math.round(((newGymsThisMonth - newGymsLastMonth) / newGymsLastMonth) * 100 * 10) / 10
      : (newGymsThisMonth > 0 ? 100 : 0);
    
    // Calculate members change
    const allMembers = await getDb().select().from(schema.members);
    const newMembersThisMonth = allMembers.filter(m => {
      const createdAt = m.createdAt ? new Date(m.createdAt) : null;
      return createdAt && createdAt >= startOfMonth;
    }).length;
    const newMembersLastMonth = allMembers.filter(m => {
      const createdAt = m.createdAt ? new Date(m.createdAt) : null;
      return createdAt && createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
    }).length;
    const membersChange = newMembersLastMonth > 0 
      ? Math.round(((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100 * 10) / 10
      : (newMembersThisMonth > 0 ? 100 : 0);

    return {
      totalRevenue,
      activeGyms,
      totalMembers,
      systemHealth: 100,
      revenueChange,
      gymsChange,
      membersChange,
      healthChange: 0,
    };
  }

  async getAllAuditLogs() {
    const data = await getDb().select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.timestamp));
    return data.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.userId,
      userName: row.userName,
      action: row.action,
      resource: row.resource,
      severity: row.severity,
      ipAddress: row.ipAddress,
      details: row.details,
      status: row.status,
    }));
  }

  async getAllIntegrations() {
    const data = await getDb().select().from(schema.integrations);
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      apiKey: row.apiKey,
      lastSync: row.lastSync,
      description: row.description,
    }));
  }

  async createIntegration(data: any) {
    const result = await getDb().insert(schema.integrations).values({ ...data, status: 'inactive' as any, apiKey: '*********************' }).returning().then(rows => rows[0]);
    return {
      id: result.id,
      name: result.name,
      type: result.type,
      status: result.status,
      apiKey: result.apiKey,
      lastSync: result.lastSync,
      description: result.description,
    };
  }

  async deleteIntegration(id: string) {
    await getDb().delete(schema.integrations).where(eq(schema.integrations.id, id));
    return true;
  }

  async toggleIntegration(id: string) {
    const current = await getDb().select().from(schema.integrations).where(eq(schema.integrations.id, id)).limit(1).then(rows => rows[0]);
    if (!current) return null;

    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    const lastSync = newStatus === 'active' ? new Date() : current.lastSync;

    const result = await getDb().update(schema.integrations).set({ status: newStatus as any, lastSync }).where(eq(schema.integrations.id, id)).returning().then(rows => rows[0]);

    return {
      id: result.id,
      name: result.name,
      type: result.type,
      status: result.status,
      apiKey: result.apiKey,
      lastSync: result.lastSync,
      description: result.description,
    };
  }

  async getUserByEmail(email: string) {
    const data = await getDb().select().from(schema.users).where(eq(schema.users.email, email)).limit(1).then(rows => rows[0]);
    return data || null;
  }

  async getUserById(userId: string) {
    if (!isDbAvailable()) {
      const { supabaseRepo } = await import('./supabaseRepository');
      const supabaseUser = await supabaseRepo.getUserById(userId);
      if (!supabaseUser) return null;
      
      const gymId = await supabaseRepo.getGymIdForUser(userId, supabaseUser.role);
      
      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.name,
        role: supabaseUser.role,
        phone: supabaseUser.phone,
        isActive: supabaseUser.is_active,
        createdAt: new Date(supabaseUser.created_at),
        lastLogin: supabaseUser.last_login ? new Date(supabaseUser.last_login) : null,
        gymId: gymId,
      };
    }
    
    const user = await getDb().select().from(schema.users).where(eq(schema.users.id, userId)).limit(1).then(rows => rows[0]);

    if (!user) {
      console.error('Error fetching user: not found');
      return null;
    }

    let gymId: string | null = null;

    if (user.role === 'admin') {
      const gymAdmin = await getDb().select().from(schema.gymAdmins).where(eq(schema.gymAdmins.userId, userId)).limit(1).then(rows => rows[0]);
      if (gymAdmin) {
        gymId = gymAdmin.gymId;
      }
    }

    if (!gymId && user.role === 'trainer') {
      const trainer = await getDb().select().from(schema.trainers).where(eq(schema.trainers.userId, userId)).limit(1).then(rows => rows[0]);
      if (trainer) {
        gymId = trainer.gymId;
      }
    }

    if (!gymId && user.role === 'member') {
      const member = await getDb().select().from(schema.members).where(eq(schema.members.userId, userId)).limit(1).then(rows => rows[0]);
      if (member) {
        gymId = member.gymId;
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      gymId: gymId,
    };
  }

  async getUserGyms(userId: string, role: string) {
    if (role === 'superadmin') {
      const data = await getDb().select({ id: schema.gyms.id }).from(schema.gyms);
      return data.map(g => g.id);
    }

    if (role === 'admin') {
      const data = await getDb().select({ gymId: schema.gymAdmins.gymId }).from(schema.gymAdmins).where(eq(schema.gymAdmins.userId, userId));
      return data.map(g => g.gymId);
    }

    if (role === 'trainer') {
      const data = await getDb().select({ gymId: schema.trainers.gymId }).from(schema.trainers).where(eq(schema.trainers.userId, userId));
      return data.map(g => g.gymId);
    }

    if (role === 'member') {
      const data = await getDb().select({ gymId: schema.members.gymId }).from(schema.members).where(eq(schema.members.userId, userId));
      return data.map(g => g.gymId);
    }

    return [];
  }

  async getUserPrimaryGym(userId: string, role: string) {
    const gyms = await this.getUserGyms(userId, role);
    return gyms.length > 0 ? gyms[0] : null;
  }

  async createUser(data: { email: string; passwordHash: string; role: string; gymId?: string; name: string; phone?: string }) {
    const result = await getDb().insert(schema.users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role as any,
      name: data.name,
      phone: data.phone,
      isActive: 1
    }).returning().then(rows => rows[0]);
    return {
      id: result.id,
      email: result.email,
      passwordHash: result.passwordHash,
      role: result.role,
      name: result.name,
      phone: result.phone,
      isActive: result.isActive,
      createdAt: result.createdAt,
      lastLogin: result.lastLogin,
    };
  }

  async updateUserLastLogin(userId: string) {
    const result = await getDb().update(schema.users).set({ lastLogin: new Date() }).where(eq(schema.users.id, userId)).returning().then(rows => rows[0]);
    if (!result) return null;
    return {
      id: result.id,
      email: result.email,
      passwordHash: result.passwordHash,
      role: result.role,
      name: result.name,
      phone: result.phone,
      isActive: result.isActive,
      createdAt: result.createdAt,
      lastLogin: result.lastLogin,
    };
  }

  async listMembers(gymId: string, filters?: { status?: string; search?: string }) {
    let conditions = [eq(schema.members.gymId, gymId)];
    if (filters?.status) {
      conditions.push(eq(schema.members.status, filters.status as any));
    }

    let data = await getDb().select().from(schema.members).where(and(...conditions)).orderBy(desc(schema.members.createdAt));

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      data = data.filter((row: any) =>
        row.name.toLowerCase().includes(search) ||
        row.email.toLowerCase().includes(search) ||
        row.phone.toLowerCase().includes(search)
      );
    }

    return data.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      gymId: row.gymId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      photoUrl: row.photoUrl,
      address: row.address,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      emergencyContactName: row.emergencyContactName,
      emergencyContactPhone: row.emergencyContactPhone,
      medicalInfo: row.medicalInfo,
      status: row.status,
      joinDate: row.joinDate,
      createdAt: row.createdAt,
    }));
  }

  async getMemberById(memberId: string) {
    const data = await getDb().select().from(schema.members).where(eq(schema.members.id, memberId)).limit(1).then(rows => rows[0]);
    if (!data) return null;
    return {
      id: data.id,
      userId: data.userId,
      gymId: data.gymId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      photoUrl: data.photoUrl,
      address: data.address,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      medicalInfo: data.medicalInfo,
      status: data.status,
      joinDate: data.joinDate,
      createdAt: data.createdAt,
    };
  }

  async getMemberByUserId(userId: string) {
    const data = await getDb().select().from(schema.members).where(eq(schema.members.userId, userId)).limit(1).then(rows => rows[0]);
    if (!data) return null;
    return {
      id: data.id,
      userId: data.userId,
      gymId: data.gymId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      photoUrl: data.photoUrl,
      address: data.address,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      medicalInfo: data.medicalInfo,
      status: data.status,
      joinDate: data.joinDate,
      createdAt: data.createdAt,
    };
  }

  async createMember(data: any) {
    const result = await getDb().insert(schema.members).values(data).returning().then(rows => rows[0]);
    return {
      id: result.id,
      userId: result.userId,
      gymId: result.gymId,
      name: result.name,
      email: result.email,
      phone: result.phone,
      photoUrl: result.photoUrl,
      address: result.address,
      dateOfBirth: result.dateOfBirth,
      gender: result.gender,
      emergencyContactName: result.emergencyContactName,
      emergencyContactPhone: result.emergencyContactPhone,
      medicalInfo: result.medicalInfo,
      status: result.status,
      joinDate: result.joinDate,
      createdAt: result.createdAt,
    };
  }

  async updateMember(memberId: string, data: any) {
    const result = await getDb().update(schema.members).set(data).where(eq(schema.members.id, memberId)).returning().then(rows => rows[0]);
    if (!result) return null;
    return {
      id: result.id,
      userId: result.userId,
      gymId: result.gymId,
      name: result.name,
      email: result.email,
      phone: result.phone,
      photoUrl: result.photoUrl,
      address: result.address,
      dateOfBirth: result.dateOfBirth,
      gender: result.gender,
      emergencyContactName: result.emergencyContactName,
      emergencyContactPhone: result.emergencyContactPhone,
      medicalInfo: result.medicalInfo,
      status: result.status,
      joinDate: result.joinDate,
      createdAt: result.createdAt,
    };
  }

  async deleteMember(memberId: string) {
    await getDb().delete(schema.members).where(eq(schema.members.id, memberId));
    return true;
  }

  async listMembershipPlans(gymId: string) {
    const data = await getDb().select().from(schema.membershipPlans).where(and(eq(schema.membershipPlans.gymId, gymId), eq(schema.membershipPlans.isActive, 1))).orderBy(asc(schema.membershipPlans.name));
    return data.map((row: any) => ({
      id: row.id,
      gymId: row.gymId,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      duration: row.duration,
      features: row.features,
      isActive: row.isActive === 1,
      createdAt: row.createdAt,
    }));
  }

  async createMembershipPlan(data: any) {
    const result = await getDb().insert(schema.membershipPlans).values({ ...data, isActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1 }).returning().then(rows => rows[0]);
    return {
      id: result.id,
      gymId: result.gymId,
      name: result.name,
      description: result.description,
      price: parseFloat(result.price),
      duration: result.duration,
      features: result.features,
      isActive: result.isActive === 1,
      createdAt: result.createdAt,
    };
  }

  async listMemberships(memberId: string) {
    const data = await getDb().select().from(schema.memberships).where(eq(schema.memberships.memberId, memberId)).orderBy(desc(schema.memberships.createdAt));
    return data.map((row: any) => ({
      id: row.id,
      memberId: row.memberId,
      planId: row.planId,
      gymId: row.gymId,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      autoRenew: row.autoRenew === 1,
      createdAt: row.createdAt,
    }));
  }

  async createMembership(data: any) {
    const result = await getDb().insert(schema.memberships).values({ ...data, autoRenew: data.autoRenew ? 1 : 0 }).returning().then(rows => rows[0]);
    return {
      id: result.id,
      memberId: result.memberId,
      planId: result.planId,
      gymId: result.gymId,
      startDate: result.startDate,
      endDate: result.endDate,
      status: result.status,
      autoRenew: result.autoRenew === 1,
      createdAt: result.createdAt,
    };
  }

  async listPayments(gymId: string, filters?: { memberId?: string; status?: string; paymentType?: string; dateFrom?: string; dateTo?: string }) {
    let conditions = [eq(schema.payments.gymId, gymId)];
    if (filters?.memberId) conditions.push(eq(schema.payments.memberId, filters.memberId));
    if (filters?.status) conditions.push(eq(schema.payments.status, filters.status as any));
    if (filters?.paymentType) conditions.push(eq(schema.payments.paymentType, filters.paymentType as any));
    if (filters?.dateFrom) conditions.push(gte(schema.payments.paymentDate, new Date(filters.dateFrom)));
    if (filters?.dateTo) conditions.push(lte(schema.payments.paymentDate, new Date(filters.dateTo)));

    const data = await getDb().select({
      id: schema.payments.id,
      gymId: schema.payments.gymId,
      memberId: schema.payments.memberId,
      membershipId: schema.payments.membershipId,
      orderId: schema.payments.orderId,
      invoiceId: schema.payments.invoiceId,
      amount: schema.payments.amount,
      totalAmount: schema.payments.totalAmount,
      amountDue: schema.payments.amountDue,
      paymentType: schema.payments.paymentType,
      paymentSource: schema.payments.paymentSource,
      paymentProof: schema.payments.paymentProof,
      transactionRef: schema.payments.transactionRef,
      status: schema.payments.status,
      notes: schema.payments.notes,
      paymentDate: schema.payments.paymentDate,
      createdAt: schema.payments.createdAt,
      memberName: schema.members.name,
      memberEmail: schema.members.email,
      memberPhone: schema.members.phone,
    })
    .from(schema.payments)
    .leftJoin(schema.members, eq(schema.payments.memberId, schema.members.id))
    .where(and(...conditions))
    .orderBy(desc(schema.payments.paymentDate));
    
    return data.map((row: any) => ({
      id: row.id,
      gymId: row.gymId,
      memberId: row.memberId,
      membershipId: row.membershipId,
      orderId: row.orderId,
      invoiceId: row.invoiceId,
      amount: parseFloat(row.amount || '0'),
      totalAmount: parseFloat(row.totalAmount || row.amount || '0'),
      amountDue: parseFloat(row.amountDue || '0'),
      paymentType: row.paymentType,
      paymentSource: row.paymentSource,
      paymentProof: row.paymentProof,
      transactionRef: row.transactionRef,
      status: row.status,
      notes: row.notes,
      paymentDate: row.paymentDate,
      createdAt: row.createdAt,
      memberName: row.memberName || 'Unknown',
      memberEmail: row.memberEmail,
      memberPhone: row.memberPhone,
    }));
  }

  async createPayment(data: any) {
    const result = await getDb().insert(schema.payments).values(data).returning().then(rows => rows[0]);
    return {
      id: result.id,
      gymId: result.gymId,
      memberId: result.memberId,
      membershipId: result.membershipId,
      orderId: result.orderId,
      amount: parseFloat(result.amount),
      paymentType: result.paymentType,
      paymentProof: result.paymentProof,
      transactionRef: result.transactionRef,
      status: result.status,
      notes: result.notes,
      paymentDate: result.paymentDate,
      createdAt: result.createdAt,
    };
  }

  async getPaymentById(paymentId: string) {
    const row = await getDb().select().from(schema.payments).where(eq(schema.payments.id, paymentId)).limit(1).then(rows => rows[0]);
    if (!row) return null;
    return {
      id: row.id,
      gymId: row.gymId,
      memberId: row.memberId,
      membershipId: row.membershipId,
      orderId: row.orderId,
      amount: parseFloat(row.amount),
      paymentType: row.paymentType,
      paymentProof: row.paymentProof,
      transactionRef: row.transactionRef,
      status: row.status,
      notes: row.notes,
      paymentDate: row.paymentDate,
      createdAt: row.createdAt,
    };
  }

  async updatePayment(paymentId: string, data: any) {
    const result = await getDb().update(schema.payments).set(data).where(eq(schema.payments.id, paymentId)).returning().then(rows => rows[0]);
    if (!result) return null;
    return {
      id: result.id,
      gymId: result.gymId,
      memberId: result.memberId,
      membershipId: result.membershipId,
      orderId: result.orderId,
      amount: parseFloat(result.amount),
      paymentType: result.paymentType,
      paymentProof: result.paymentProof,
      transactionRef: result.transactionRef,
      status: result.status,
      notes: result.notes,
      paymentDate: result.paymentDate,
      createdAt: result.createdAt,
    };
  }

  async deletePayment(paymentId: string) {
    await getDb().delete(schema.payments).where(eq(schema.payments.id, paymentId));
    return true;
  }

  async getPaymentsByMember(memberId: string) {
    const data = await getDb().select().from(schema.payments).where(eq(schema.payments.memberId, memberId)).orderBy(desc(schema.payments.paymentDate));
    return data.map((row: any) => ({
      id: row.id,
      gymId: row.gymId,
      memberId: row.memberId,
      membershipId: row.membershipId,
      orderId: row.orderId,
      amount: parseFloat(row.amount),
      paymentType: row.paymentType,
      paymentProof: row.paymentProof,
      transactionRef: row.transactionRef,
      status: row.status,
      notes: row.notes,
      paymentDate: row.paymentDate,
      createdAt: row.createdAt,
    }));
  }

  async listInvoices(gymId: string, filters?: { memberId?: string; status?: string; dateFrom?: string; dateTo?: string }) {
    let conditions = [eq(schema.invoices.gymId, gymId)];
    if (filters?.memberId) conditions.push(eq(schema.invoices.memberId, filters.memberId));
    if (filters?.status) conditions.push(eq(schema.invoices.status, filters.status as any));
    if (filters?.dateFrom) conditions.push(gte(schema.invoices.dueDate, new Date(filters.dateFrom)));
    if (filters?.dateTo) conditions.push(lte(schema.invoices.dueDate, new Date(filters.dateTo)));

    const data = await getDb().select().from(schema.invoices).where(and(...conditions)).orderBy(desc(schema.invoices.createdAt));

    return data.map((row: any) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      gymId: row.gymId,
      memberId: row.memberId,
      membershipId: row.membershipId,
      orderId: row.orderId,
      amount: parseFloat(row.amount),
      dueDate: row.dueDate,
      paidDate: row.paidDate,
      status: row.status,
      createdAt: row.createdAt,
    }));
  }

  async createInvoice(data: any) {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const result = await getDb().insert(schema.invoices).values({
      ...data,
      invoiceNumber,
      status: data.status || 'pending',
    }).returning().then(rows => rows[0]);

    return {
      id: result.id,
      invoiceNumber: result.invoiceNumber,
      gymId: result.gymId,
      memberId: result.memberId,
      membershipId: result.membershipId,
      orderId: result.orderId,
      amount: parseFloat(result.amount),
      dueDate: result.dueDate,
      paidDate: result.paidDate,
      status: result.status,
      createdAt: result.createdAt,
    };
  }

  async getInvoiceById(invoiceId: string) {
    const row = await getDb().select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId)).limit(1).then(rows => rows[0]);
    if (!row) return null;
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      gymId: row.gymId,
      memberId: row.memberId,
      membershipId: row.membershipId,
      orderId: row.orderId,
      amount: parseFloat(row.amount),
      dueDate: row.dueDate,
      paidDate: row.paidDate,
      status: row.status,
      createdAt: row.createdAt,
    };
  }

  async updateInvoice(invoiceId: string, data: any) {
    const result = await getDb().update(schema.invoices).set(data).where(eq(schema.invoices.id, invoiceId)).returning().then(rows => rows[0]);
    if (!result) return null;
    return {
      id: result.id,
      invoiceNumber: result.invoiceNumber,
      gymId: result.gymId,
      memberId: result.memberId,
      membershipId: result.membershipId,
      orderId: result.orderId,
      amount: parseFloat(result.amount),
      dueDate: result.dueDate,
      paidDate: result.paidDate,
      status: result.status,
      createdAt: result.createdAt,
    };
  }

  async listLeads(gymId: string, filters?: { status?: string; source?: string; search?: string }) {
    let conditions = [eq(schema.leads.gymId, gymId)];
    if (filters?.status) conditions.push(eq(schema.leads.status, filters.status as any));
    if (filters?.source) conditions.push(eq(schema.leads.source, filters.source));

    let data = await getDb().select().from(schema.leads).where(and(...conditions)).orderBy(desc(schema.leads.createdAt));

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      data = data.filter((row: any) =>
        row.name.toLowerCase().includes(search) ||
        row.email.toLowerCase().includes(search) ||
        row.phone.toLowerCase().includes(search)
      );
    }

    return data.map((row: any) => ({
      id: row.id,
      gymId: row.gymId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      interestedPlan: row.interestedPlan,
      message: row.message,
      source: row.source,
      status: row.status,
      assignedTo: row.assignedTo,
      addedBy: row.addedBy,
      notes: row.notes,
      followUpDate: row.followUpDate,
      convertedToMemberId: row.convertedToMemberId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async getLeadById(leadId: string) {
    const row = await getDb().select().from(schema.leads).where(eq(schema.leads.id, leadId)).limit(1).then(rows => rows[0]);
    if (!row) return null;
    return {
      id: row.id,
      gymId: row.gymId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      interestedPlan: row.interestedPlan,
      message: row.message,
      source: row.source,
      status: row.status,
      assignedTo: row.assignedTo,
      notes: row.notes,
      followUpDate: row.followUpDate,
      convertedToMemberId: row.convertedToMemberId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createLead(data: any) {
    const result = await getDb().insert(schema.leads).values({
      ...data,
      status: data.status || 'new',
    }).returning().then(rows => rows[0]);

    return {
      id: result.id,
      gymId: result.gymId,
      name: result.name,
      email: result.email,
      phone: result.phone,
      interestedPlan: result.interestedPlan,
      message: result.message,
      source: result.source,
      status: result.status,
      assignedTo: result.assignedTo,
      notes: result.notes,
      followUpDate: result.followUpDate,
      convertedToMemberId: result.convertedToMemberId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async updateLead(leadId: string, data: any) {
    const result = await getDb().update(schema.leads).set({ ...data, updatedAt: new Date() }).where(eq(schema.leads.id, leadId)).returning().then(rows => rows[0]);
    if (!result) return null;
    return {
      id: result.id,
      gymId: result.gymId,
      name: result.name,
      email: result.email,
      phone: result.phone,
      interestedPlan: result.interestedPlan,
      message: result.message,
      source: result.source,
      status: result.status,
      assignedTo: result.assignedTo,
      notes: result.notes,
      followUpDate: result.followUpDate,
      convertedToMemberId: result.convertedToMemberId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async deleteLead(leadId: string) {
    await getDb().delete(schema.leads).where(eq(schema.leads.id, leadId));
    return true;
  }

  async convertLeadToMember(
    leadId: string, 
    memberData: any, 
    invoiceData?: { finalAmount: number; paidAmount: number; paymentMethod: string; transactionDate: Date },
    userData?: { email: string; passwordHash: string; name: string; phone?: string | null }
  ) {
    const lead = await this.getLeadById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    const { planId, userId: existingUserId, ...otherData } = memberData;

    // Use a transaction for atomicity - includes user creation
    return await getDb().transaction(async (tx) => {
      // Create user account first if userData is provided
      let userId = existingUserId || null;
      let createdUser = null;
      if (userData) {
        // Check if a user already exists with this email (could be from previous partial conversion)
        const existingUser = await tx.select().from(schema.users)
          .where(eq(schema.users.email, userData.email))
          .limit(1).then(rows => rows[0]);
        
        if (existingUser && existingUser.role === 'member') {
          // Only reuse existing member-role accounts (from partial conversions)
          // This prevents overwriting admin/trainer credentials
          await tx.update(schema.users).set({
            passwordHash: userData.passwordHash,
            name: userData.name,
            phone: userData.phone || existingUser.phone,
            isActive: 1
          }).where(eq(schema.users.id, existingUser.id));
          userId = existingUser.id;
        } else if (existingUser) {
          // User exists with different role (admin, trainer, etc.)
          // Cannot convert lead - would conflict with existing account
          throw new Error('A user with this email already exists with a different role');
        } else {
          // Create new user account
          createdUser = await tx.insert(schema.users).values({
            email: userData.email,
            passwordHash: userData.passwordHash,
            role: 'member',
            name: userData.name,
            phone: userData.phone || null,
            isActive: 1
          }).returning().then(rows => rows[0]);
          userId = createdUser.id;
        }
      }

      // Create member record
      const member = await tx.insert(schema.members).values({
        gymId: lead.gymId,
        userId: userId,
        name: otherData.name || lead.name,
        email: otherData.email || lead.email,
        phone: otherData.phone || lead.phone,
        address: otherData.address || null,
        dateOfBirth: otherData.dateOfBirth ? new Date(otherData.dateOfBirth) : null,
        gender: otherData.gender || null,
        dateOfJoining: otherData.dateOfJoining ? new Date(otherData.dateOfJoining) : null,
        paymentFinalAmount: otherData.paymentFinalAmount ? String(otherData.paymentFinalAmount) : null,
        paymentPaidAmount: otherData.paymentPaidAmount ? String(otherData.paymentPaidAmount) : null,
        paymentMethod: otherData.paymentMethod || null,
        transactionDate: otherData.transactionDate ? new Date(otherData.transactionDate) : null,
        status: 'active',
      }).returning().then(rows => rows[0]);

      // Update lead status
      await tx.update(schema.leads).set({ status: 'converted', convertedToMemberId: member.id, updatedAt: new Date() }).where(eq(schema.leads.id, leadId));

      // Create membership if plan specified
      let membership = null;
      if (planId && planId !== 'no-plan') {
        const plan = await tx.select().from(schema.membershipPlans)
          .where(and(
            eq(schema.membershipPlans.id, planId),
            eq(schema.membershipPlans.gymId, lead.gymId),
            eq(schema.membershipPlans.isActive, 1)
          ))
          .limit(1).then(rows => rows[0]);
        
        if (plan) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + plan.duration);
          
          membership = await tx.insert(schema.memberships).values({
            memberId: member.id,
            planId: plan.id,
            gymId: lead.gymId,
            startDate,
            endDate,
            status: 'active',
            autoRenew: 0,
          }).returning().then(rows => rows[0]);
        }
      }

      // Create invoice and payment if payment data provided
      let invoice = null;
      let payment = null;
      if (invoiceData && invoiceData.finalAmount > 0) {
        let invoiceStatus: 'paid' | 'pending' | 'partially_paid' = 'pending';
        if (invoiceData.paidAmount >= invoiceData.finalAmount) {
          invoiceStatus = 'paid';
        } else if (invoiceData.paidAmount > 0) {
          invoiceStatus = 'partially_paid';
        }
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        invoice = await tx.insert(schema.invoices).values({
          gymId: lead.gymId,
          memberId: member.id,
          membershipId: membership?.id || null,
          invoiceNumber,
          amount: String(invoiceData.finalAmount),
          dueDate: invoiceData.transactionDate,
          paidDate: invoiceData.paidAmount > 0 ? invoiceData.transactionDate : null,
          status: invoiceStatus,
        }).returning().then(rows => rows[0]);

        // Create payment record with partial payment support
        const amountDue = invoiceData.finalAmount - invoiceData.paidAmount;
        let paymentStatus: 'paid' | 'pending' | 'partially_paid' = 'pending';
        if (invoiceData.paidAmount >= invoiceData.finalAmount) {
          paymentStatus = 'paid';
        } else if (invoiceData.paidAmount > 0) {
          paymentStatus = 'partially_paid';
        }

        // Map UI payment method labels to valid database enum values
        const paymentMethodMap: Record<string, 'cash' | 'upi' | 'card' | 'bank_transfer' | 'razorpay'> = {
          'cash': 'cash',
          'upi': 'upi',
          'card': 'card',
          'debit/credit': 'card',
          'bank transfer': 'bank_transfer',
          'bank_transfer': 'bank_transfer',
          'razorpay': 'razorpay',
        };
        const inputMethod = (invoiceData.paymentMethod || 'cash').toLowerCase().trim();
        const normalizedPaymentMethod = paymentMethodMap[inputMethod] || 'cash';
        
        payment = await tx.insert(schema.payments).values({
          invoiceId: invoice.id,
          memberId: member.id,
          gymId: lead.gymId,
          totalAmount: String(invoiceData.finalAmount),
          amount: String(invoiceData.paidAmount > 0 ? invoiceData.paidAmount : 0),
          amountDue: String(amountDue > 0 ? amountDue : 0),
          paymentType: normalizedPaymentMethod,
          paymentSource: 'membership',
          status: paymentStatus,
          paymentDate: invoiceData.transactionDate,
          notes: amountDue > 0 ? `Partial payment - ₹${amountDue.toLocaleString('en-IN')} due` : 'Full payment received during lead conversion',
        }).returning().then(rows => rows[0]);
      }

      return {
        id: member.id,
        userId: member.userId,
        gymId: member.gymId,
        name: member.name,
        email: member.email,
        phone: member.phone,
        photoUrl: member.photoUrl,
        address: member.address,
        dateOfBirth: member.dateOfBirth,
        gender: member.gender,
        dateOfJoining: member.dateOfJoining,
        paymentFinalAmount: member.paymentFinalAmount,
        paymentPaidAmount: member.paymentPaidAmount,
        paymentMethod: member.paymentMethod,
        transactionDate: member.transactionDate,
        status: member.status,
        joinDate: member.joinDate,
        createdAt: member.createdAt,
        membership,
        invoice: invoice ? {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: parseFloat(invoice.amount),
          status: invoice.status,
        } : null,
      };
    });
  }

  async listProducts(gymId: string, filters?: { category?: string; search?: string; isActive?: boolean }) {
    let conditions = [eq(schema.products.gymId, gymId)];
    if (filters?.category) conditions.push(eq(schema.products.categoryId, filters.category));
    if (filters?.isActive !== undefined) conditions.push(eq(schema.products.isActive, filters.isActive ? 1 : 0));

    let data = await getDb().select().from(schema.products).where(and(...conditions)).orderBy(desc(schema.products.createdAt));

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      data = data.filter((row: any) =>
        row.name.toLowerCase().includes(search) ||
        (row.description && row.description.toLowerCase().includes(search))
      );
    }

    return data.map((row: any) => {
      // Parse images JSON and get first image as imageUrl
      let imageUrl = null;
      if (row.images) {
        try {
          const imagesArray = JSON.parse(row.images);
          if (Array.isArray(imagesArray) && imagesArray.length > 0) {
            imageUrl = imagesArray[0];
          }
        } catch (e) {
          // If not JSON, use as direct URL
          imageUrl = row.images;
        }
      }
      return {
      id: row.id,
      gymId: row.gymId,
      categoryId: row.categoryId,
      name: row.name,
      description: row.description,
      sku: row.sku,
      price: parseFloat(row.price),
      mrp: row.mrp ? parseFloat(row.mrp) : null,
      discountPrice: row.discountPrice ? parseFloat(row.discountPrice) : null,
      taxPercent: row.taxPercent ? parseFloat(row.taxPercent) : 0,
      stock: row.stock,
      lowStockAlert: row.lowStockAlert,
      images: row.images,
      imageUrl: imageUrl,
      variants: row.variants,
      isFeatured: row.isFeatured === 1,
      isActive: row.isActive === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    });
  }

  async getProductById(productId: string) {
    const row = await getDb().select().from(schema.products).where(eq(schema.products.id, productId)).limit(1).then(rows => rows[0]);
    if (!row) return null;
    
    // Parse images JSON and get first image as imageUrl
    let imageUrl = null;
    if (row.images) {
      try {
        const imagesArray = JSON.parse(row.images);
        if (Array.isArray(imagesArray) && imagesArray.length > 0) {
          imageUrl = imagesArray[0];
        }
      } catch (e) {
        // If not JSON, use as direct URL
        imageUrl = row.images;
      }
    }
    
    return {
      id: row.id,
      gymId: row.gymId,
      categoryId: row.categoryId,
      name: row.name,
      description: row.description,
      sku: row.sku,
      price: parseFloat(row.price),
      mrp: row.mrp ? parseFloat(row.mrp) : null,
      discountPrice: row.discountPrice ? parseFloat(row.discountPrice) : null,
      taxPercent: row.taxPercent ? parseFloat(row.taxPercent) : 0,
      stock: row.stock,
      lowStockAlert: row.lowStockAlert,
      images: row.images,
      imageUrl: imageUrl,
      variants: row.variants,
      isFeatured: row.isFeatured === 1,
      isActive: row.isActive === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createProduct(data: any) {
    const result = await getDb().insert(schema.products).values({
      ...data,
      stock: data.stock || 0,
      lowStockAlert: data.lowStockAlert || 10,
      isFeatured: data.isFeatured ? 1 : 0,
      isActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
    }).returning().then(rows => rows[0]);

    return {
      id: result.id,
      gymId: result.gymId,
      categoryId: result.categoryId,
      name: result.name,
      description: result.description,
      sku: result.sku,
      price: parseFloat(result.price),
      mrp: result.mrp ? parseFloat(result.mrp) : null,
      discountPrice: result.discountPrice ? parseFloat(result.discountPrice) : null,
      taxPercent: result.taxPercent ? parseFloat(result.taxPercent) : 0,
      stock: result.stock,
      lowStockAlert: result.lowStockAlert,
      images: result.images,
      variants: result.variants,
      isFeatured: result.isFeatured === 1,
      isActive: result.isActive === 1,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async updateProduct(productId: string, data: any) {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured ? 1 : 0;
    if (data.isActive !== undefined) updateData.isActive = data.isActive ? 1 : 0;

    const result = await getDb().update(schema.products).set(updateData).where(eq(schema.products.id, productId)).returning().then(rows => rows[0]);
    if (!result) return null;

    return {
      id: result.id,
      gymId: result.gymId,
      categoryId: result.categoryId,
      name: result.name,
      description: result.description,
      sku: result.sku,
      price: parseFloat(result.price),
      mrp: result.mrp ? parseFloat(result.mrp) : null,
      discountPrice: result.discountPrice ? parseFloat(result.discountPrice) : null,
      taxPercent: result.taxPercent ? parseFloat(result.taxPercent) : 0,
      stock: result.stock,
      lowStockAlert: result.lowStockAlert,
      images: result.images,
      variants: result.variants,
      isFeatured: result.isFeatured === 1,
      isActive: result.isActive === 1,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async deleteProduct(productId: string) {
    await getDb().delete(schema.products).where(eq(schema.products.id, productId));
    return true;
  }

  async listOrders(gymId: string, filters?: { status?: string; memberId?: string; paymentStatus?: string }) {
    let conditions = [eq(schema.orders.gymId, gymId)];
    if (filters?.status) conditions.push(eq(schema.orders.status, filters.status as any));
    if (filters?.memberId) conditions.push(eq(schema.orders.memberId, filters.memberId));
    if (filters?.paymentStatus) conditions.push(eq(schema.orders.paymentStatus, filters.paymentStatus as any));

    const data = await getDb().select().from(schema.orders).where(and(...conditions)).orderBy(desc(schema.orders.orderDate));

    return data.map((row: any) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      gymId: row.gymId,
      memberId: row.memberId,
      subtotal: parseFloat(row.subtotal),
      taxAmount: parseFloat(row.taxAmount || '0'),
      totalAmount: parseFloat(row.totalAmount),
      status: row.status,
      paymentStatus: row.paymentStatus,
      paymentType: row.paymentType,
      paymentProof: row.paymentProof,
      transactionRef: row.transactionRef,
      shippingAddress: row.shippingAddress,
      notes: row.notes,
      orderDate: row.orderDate,
      deliveryDate: row.deliveryDate,
      createdAt: row.createdAt,
    }));
  }

  async getOrderById(orderId: string) {
    const orderData = await getDb().select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1).then(rows => rows[0]);
    if (!orderData) return null;

    const items = await getDb().select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));

    return {
      id: orderData.id,
      orderNumber: orderData.orderNumber,
      gymId: orderData.gymId,
      memberId: orderData.memberId,
      subtotal: parseFloat(orderData.subtotal),
      taxAmount: parseFloat(orderData.taxAmount || '0'),
      totalAmount: parseFloat(orderData.totalAmount),
      status: orderData.status,
      paymentStatus: orderData.paymentStatus,
      paymentType: orderData.paymentType,
      paymentProof: orderData.paymentProof,
      transactionRef: orderData.transactionRef,
      shippingAddress: orderData.shippingAddress,
      notes: orderData.notes,
      orderDate: orderData.orderDate,
      deliveryDate: orderData.deliveryDate,
      createdAt: orderData.createdAt,
      items: items.map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: parseFloat(item.price),
        variant: item.variant,
      })),
    };
  }

  async createOrder(data: any) {
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const productData = await getDb().select().from(schema.products).where(eq(schema.products.id, item.productId)).limit(1).then(rows => rows[0]);
        if (!productData) throw new Error(`Product ${item.productId} not found`);
        if ((productData.stock || 0) < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}. Available: ${productData.stock}, Requested: ${item.quantity}`);
        }
      }
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const order = await getDb().insert(schema.orders).values({
      gymId: data.gymId,
      memberId: data.memberId,
      subtotal: (data.subtotal || data.totalAmount).toString(),
      taxAmount: (data.taxAmount || 0).toString(),
      totalAmount: data.totalAmount.toString(),
      orderNumber,
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'unpaid',
      paymentType: data.paymentType || null,
      paymentProof: data.paymentProof || null,
      transactionRef: data.transactionRef || null,
      shippingAddress: data.shippingAddress || null,
      notes: data.notes || null,
      deliveryDate: data.deliveryDate || null,
    }).returning().then(rows => rows[0]);

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        await getDb().insert(schema.orderItems).values({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price.toString(),
          variant: item.variant || null,
        });

        const productData = await getDb().select().from(schema.products).where(eq(schema.products.id, item.productId)).limit(1).then(rows => rows[0]);
        if (productData) {
          await getDb().update(schema.products).set({ stock: (productData.stock || 0) - item.quantity }).where(eq(schema.products.id, item.productId));
        }
      }
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      gymId: order.gymId,
      memberId: order.memberId,
      subtotal: parseFloat(order.subtotal),
      taxAmount: parseFloat(order.taxAmount || '0'),
      totalAmount: parseFloat(order.totalAmount),
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentType: order.paymentType,
      paymentProof: order.paymentProof,
      transactionRef: order.transactionRef,
      shippingAddress: order.shippingAddress,
      notes: order.notes,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      createdAt: order.createdAt,
    };
  }

  async updateOrderStatus(orderId: string, status: string) {
    const result = await getDb().update(schema.orders).set({
      status: status as any,
      deliveryDate: status === 'delivered' ? new Date() : null
    }).where(eq(schema.orders.id, orderId)).returning().then(rows => rows[0]);

    if (!result) return null;
    return {
      id: result.id,
      orderNumber: result.orderNumber,
      gymId: result.gymId,
      memberId: result.memberId,
      subtotal: parseFloat(result.subtotal),
      taxAmount: parseFloat(result.taxAmount || '0'),
      totalAmount: parseFloat(result.totalAmount),
      status: result.status,
      paymentStatus: result.paymentStatus,
      paymentType: result.paymentType,
      paymentProof: result.paymentProof,
      transactionRef: result.transactionRef,
      shippingAddress: result.shippingAddress,
      notes: result.notes,
      orderDate: result.orderDate,
      deliveryDate: result.deliveryDate,
      createdAt: result.createdAt,
    };
  }

  async updateOrderPaymentStatus(orderId: string, paymentStatus: string, paymentType?: string) {
    const result = await getDb().update(schema.orders).set({
      paymentStatus: paymentStatus as any,
      paymentType: paymentType as any || undefined,
    }).where(eq(schema.orders.id, orderId)).returning().then(rows => rows[0]);

    if (!result) return null;
    return {
      id: result.id,
      orderNumber: result.orderNumber,
      gymId: result.gymId,
      memberId: result.memberId,
      subtotal: parseFloat(result.subtotal),
      taxAmount: parseFloat(result.taxAmount || '0'),
      totalAmount: parseFloat(result.totalAmount),
      status: result.status,
      paymentStatus: result.paymentStatus,
      paymentType: result.paymentType,
      paymentProof: result.paymentProof,
      transactionRef: result.transactionRef,
      shippingAddress: result.shippingAddress,
      notes: result.notes,
      orderDate: result.orderDate,
      deliveryDate: result.deliveryDate,
      createdAt: result.createdAt,
    };
  }

  async getOrdersByMember(memberId: string) {
    const data = await getDb().select().from(schema.orders).where(eq(schema.orders.memberId, memberId)).orderBy(desc(schema.orders.orderDate));
    return data.map((row: any) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      gymId: row.gymId,
      memberId: row.memberId,
      subtotal: parseFloat(row.subtotal),
      taxAmount: parseFloat(row.taxAmount || '0'),
      totalAmount: parseFloat(row.totalAmount),
      status: row.status,
      paymentStatus: row.paymentStatus,
      paymentType: row.paymentType,
      paymentProof: row.paymentProof,
      transactionRef: row.transactionRef,
      shippingAddress: row.shippingAddress,
      notes: row.notes,
      orderDate: row.orderDate,
      deliveryDate: row.deliveryDate,
      createdAt: row.createdAt,
    }));
  }

  async listClassTypes(gymId: string) {
    const data = await getDb().select().from(schema.classTypes).where(and(eq(schema.classTypes.gymId, gymId), eq(schema.classTypes.isActive, 1))).orderBy(asc(schema.classTypes.name));
    return data.map((row: any) => ({
      id: row.id,
      gymId: row.gymId,
      name: row.name,
      description: row.description,
      duration: row.duration,
      color: row.color,
      isActive: row.isActive === 1,
      createdAt: row.createdAt,
    }));
  }

  async createClassType(data: any) {
    const result = await getDb().insert(schema.classTypes).values({ ...data, isActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1 }).returning().then(rows => rows[0]);
    return {
      id: result.id,
      gymId: result.gymId,
      name: result.name,
      description: result.description,
      duration: result.duration,
      color: result.color,
      isActive: result.isActive === 1,
      createdAt: result.createdAt,
    };
  }

  async listClasses(gymId: string, filters?: { classTypeId?: string; trainerId?: string; status?: string; startDate?: Date; endDate?: Date }) {
    let conditions = [eq(schema.classes.gymId, gymId)];
    if (filters?.classTypeId) conditions.push(eq(schema.classes.classTypeId, filters.classTypeId));
    if (filters?.trainerId) conditions.push(eq(schema.classes.trainerId, filters.trainerId));
    if (filters?.status) conditions.push(eq(schema.classes.status, filters.status as any));
    if (filters?.startDate) conditions.push(gte(schema.classes.startTime, filters.startDate));
    if (filters?.endDate) conditions.push(lte(schema.classes.endTime, filters.endDate));

    const data = await getDb().select().from(schema.classes).where(and(...conditions)).orderBy(asc(schema.classes.startTime));

    return data.map((row: any) => ({
      id: row.id,
      gymId: row.gymId,
      classTypeId: row.classTypeId,
      trainerId: row.trainerId,
      name: row.name,
      description: row.description,
      startTime: row.startTime,
      endTime: row.endTime,
      capacity: row.capacity,
      bookedCount: row.bookedCount,
      status: row.status,
      location: row.location,
      createdAt: row.createdAt,
    }));
  }

  async getClassById(classId: string) {
    const row = await getDb().select().from(schema.classes).where(eq(schema.classes.id, classId)).limit(1).then(rows => rows[0]);
    if (!row) return null;
    return {
      id: row.id,
      gymId: row.gymId,
      classTypeId: row.classTypeId,
      trainerId: row.trainerId,
      name: row.name,
      description: row.description,
      startTime: row.startTime,
      endTime: row.endTime,
      capacity: row.capacity,
      bookedCount: row.bookedCount,
      status: row.status,
      location: row.location,
      createdAt: row.createdAt,
    };
  }

  async createClass(data: any) {
    const result = await getDb().insert(schema.classes).values({ ...data, bookedCount: 0 }).returning().then(rows => rows[0]);
    return {
      id: result.id,
      gymId: result.gymId,
      classTypeId: result.classTypeId,
      trainerId: result.trainerId,
      name: result.name,
      description: result.description,
      startTime: result.startTime,
      endTime: result.endTime,
      capacity: result.capacity,
      bookedCount: result.bookedCount,
      status: result.status,
      location: result.location,
      createdAt: result.createdAt,
    };
  }

  async updateClass(classId: string, data: any) {
    const result = await getDb().update(schema.classes).set(data).where(eq(schema.classes.id, classId)).returning().then(rows => rows[0]);
    if (!result) return null;
    return {
      id: result.id,
      gymId: result.gymId,
      classTypeId: result.classTypeId,
      trainerId: result.trainerId,
      name: result.name,
      description: result.description,
      startTime: result.startTime,
      endTime: result.endTime,
      capacity: result.capacity,
      bookedCount: result.bookedCount,
      status: result.status,
      location: result.location,
      createdAt: result.createdAt,
    };
  }

  async deleteClass(classId: string) {
    await getDb().delete(schema.classes).where(eq(schema.classes.id, classId));
    return true;
  }

  async bookClass(classId: string, memberId: string) {
    const classData = await this.getClassById(classId);
    if (!classData) throw new Error('Class not found');
    if ((classData.bookedCount || 0) >= (classData.capacity || 0)) throw new Error('Class is fully booked');

    const existingBooking = await getDb().select().from(schema.classBookings).where(and(eq(schema.classBookings.classId, classId), eq(schema.classBookings.memberId, memberId))).limit(1).then(rows => rows[0]);
    if (existingBooking) throw new Error('Already booked for this class');

    const booking = await getDb().insert(schema.classBookings).values({
      classId,
      memberId,
      status: 'confirmed',
    }).returning().then(rows => rows[0]);

    await getDb().update(schema.classes).set({ bookedCount: (classData.bookedCount || 0) + 1 }).where(eq(schema.classes.id, classId));

    return {
      id: booking.id,
      classId: booking.classId,
      memberId: booking.memberId,
      status: booking.status,
      bookedAt: booking.bookedAt,
    };
  }

  async cancelClassBooking(classId: string, memberId: string) {
    const classData = await this.getClassById(classId);
    if (!classData) throw new Error('Class not found');

    const booking = await getDb().select().from(schema.classBookings).where(and(eq(schema.classBookings.classId, classId), eq(schema.classBookings.memberId, memberId))).limit(1).then(rows => rows[0]);
    if (!booking) throw new Error('No booking found');

    await getDb().delete(schema.classBookings).where(eq(schema.classBookings.id, booking.id));

    if ((classData.bookedCount || 0) > 0) {
      await getDb().update(schema.classes).set({ bookedCount: (classData.bookedCount || 0) - 1 }).where(eq(schema.classes.id, classId));
    }

    return true;
  }

  async listClassBookings(classId: string) {
    const data = await getDb().select().from(schema.classBookings).where(eq(schema.classBookings.classId, classId)).orderBy(desc(schema.classBookings.bookedAt));
    return data.map((row: any) => ({
      id: row.id,
      classId: row.classId,
      memberId: row.memberId,
      status: row.status,
      bookedAt: row.bookedAt,
    }));
  }

  async getMemberBookings(memberId: string) {
    const data = await getDb().select().from(schema.classBookings).where(and(eq(schema.classBookings.memberId, memberId), eq(schema.classBookings.status, 'confirmed'))).orderBy(desc(schema.classBookings.bookedAt));
    return data.map((row: any) => ({
      id: row.id,
      classId: row.classId,
      memberId: row.memberId,
      status: row.status,
      bookedAt: row.bookedAt,
    }));
  }

  async getTrainersByGym(gymId: string) {
    const data = await getDb().select().from(schema.trainers).where(eq(schema.trainers.gymId, gymId)).orderBy(asc(schema.trainers.name));
    return data.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      gymId: row.gymId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      specializations: row.specializations,
      certifications: row.certifications,
      experience: row.experience,
      rating: row.rating,
      bio: row.bio,
      photoUrl: row.photoUrl,
      status: row.status,
      isActive: row.isActive === 1,
      createdAt: row.createdAt,
    }));
  }

  async getTrainerById(id: string) {
    const data = await getDb().select().from(schema.trainers).where(eq(schema.trainers.id, id)).limit(1).then(rows => rows[0]);
    if (!data) return null;
    return {
      id: data.id,
      userId: data.userId,
      gymId: data.gymId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      specializations: data.specializations,
      certifications: data.certifications,
      experience: data.experience,
      rating: data.rating,
      bio: data.bio,
      photoUrl: data.photoUrl,
      status: data.status,
      isActive: data.isActive === 1,
      createdAt: data.createdAt,
    };
  }

  async createTrainer(data: { userId: string; gymId: string; name: string; email: string; phone?: string; role?: string; specializations?: string; certifications?: string; experience?: number; bio?: string; photoUrl?: string }) {
    const result = await getDb().insert(schema.trainers).values({
      userId: data.userId,
      gymId: data.gymId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role || 'trainer',
      specializations: data.specializations,
      certifications: data.certifications,
      experience: data.experience,
      bio: data.bio,
      photoUrl: data.photoUrl,
      status: 'active',
      isActive: 1,
    }).returning().then(rows => rows[0]);
    return {
      id: result.id,
      userId: result.userId,
      gymId: result.gymId,
      name: result.name,
      email: result.email,
      phone: result.phone,
      role: result.role,
      specializations: result.specializations,
      certifications: result.certifications,
      experience: result.experience,
      rating: result.rating,
      bio: result.bio,
      photoUrl: result.photoUrl,
      status: result.status,
      isActive: result.isActive === 1,
      createdAt: result.createdAt,
    };
  }

  async updateTrainer(id: string, data: { name?: string; email?: string; phone?: string; role?: string; specializations?: string; certifications?: string; experience?: number; bio?: string; photoUrl?: string; status?: string; isActive?: number }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.specializations !== undefined) updateData.specializations = data.specializations;
    if (data.certifications !== undefined) updateData.certifications = data.certifications;
    if (data.experience !== undefined) updateData.experience = data.experience;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const result = await getDb().update(schema.trainers).set(updateData).where(eq(schema.trainers.id, id)).returning().then(rows => rows[0]);
    if (!result) return null;
    return {
      id: result.id,
      userId: result.userId,
      gymId: result.gymId,
      name: result.name,
      email: result.email,
      phone: result.phone,
      role: result.role,
      specializations: result.specializations,
      certifications: result.certifications,
      experience: result.experience,
      rating: result.rating,
      bio: result.bio,
      photoUrl: result.photoUrl,
      status: result.status,
      isActive: result.isActive === 1,
      createdAt: result.createdAt,
    };
  }

  async deleteTrainer(id: string) {
    await getDb().delete(schema.trainers).where(eq(schema.trainers.id, id));
    return true;
  }

  async markClassAttendance(classId: string, memberId: string, status: string) {
    const existing = await getDb().select().from(schema.classAttendance).where(and(eq(schema.classAttendance.classId, classId), eq(schema.classAttendance.memberId, memberId))).limit(1).then(rows => rows[0]);

    let result;
    if (existing) {
      result = await getDb().update(schema.classAttendance).set({ status: status as any, markedAt: new Date() }).where(and(eq(schema.classAttendance.classId, classId), eq(schema.classAttendance.memberId, memberId))).returning().then(rows => rows[0]);
    } else {
      result = await getDb().insert(schema.classAttendance).values({ classId, memberId, status: status as any }).returning().then(rows => rows[0]);
    }

    if (status === 'present') {
      await getDb().update(schema.classBookings).set({ status: 'attended' }).where(and(eq(schema.classBookings.classId, classId), eq(schema.classBookings.memberId, memberId)));
    }

    return {
      id: result.id,
      classId: result.classId,
      memberId: result.memberId,
      status: result.status,
      markedAt: result.markedAt,
    };
  }

  async listClassAttendance(classId: string) {
    const data = await getDb().select().from(schema.classAttendance).where(eq(schema.classAttendance.classId, classId)).orderBy(desc(schema.classAttendance.markedAt));
    return data.map((row: any) => ({
      id: row.id,
      classId: row.classId,
      memberId: row.memberId,
      status: row.status,
      markedAt: row.markedAt,
    }));
  }

  async markGymAttendance(gymId: string, memberId: string, action: 'checkIn' | 'checkOut', source: string = 'manual') {
    if (action === 'checkIn') {
      const existing = await getDb().select().from(schema.attendance).where(and(eq(schema.attendance.memberId, memberId), eq(schema.attendance.status, 'in'), isNull(schema.attendance.checkOutTime))).orderBy(desc(schema.attendance.checkInTime)).limit(1).then(rows => rows[0]);

      if (existing) {
        throw new Error('Member is already checked in');
      }

      const result = await getDb().insert(schema.attendance).values({ gymId, memberId, source, status: 'in', exitType: null }).returning().then(rows => rows[0]);
      return {
        id: result.id,
        gymId: result.gymId,
        memberId: result.memberId,
        checkInTime: result.checkInTime,
        checkOutTime: result.checkOutTime,
        status: result.status,
        exitType: result.exitType,
        source: result.source,
        createdAt: result.createdAt,
      };
    } else {
      const result = await getDb().update(schema.attendance).set({ checkOutTime: new Date(), status: 'out', exitType: 'manual' }).where(and(eq(schema.attendance.memberId, memberId), eq(schema.attendance.status, 'in'), isNull(schema.attendance.checkOutTime))).returning().then(rows => rows[0]);

      if (!result) {
        throw new Error('No active check-in found');
      }
      return {
        id: result.id,
        gymId: result.gymId,
        memberId: result.memberId,
        checkInTime: result.checkInTime,
        checkOutTime: result.checkOutTime,
        status: result.status,
        exitType: result.exitType,
        source: result.source,
        createdAt: result.createdAt,
      };
    }
  }

  async listGymAttendance(gymId: string, filters?: { memberId?: string; dateFrom?: string; dateTo?: string }) {
    let conditions = [eq(schema.attendance.gymId, gymId)];
    if (filters?.memberId) conditions.push(eq(schema.attendance.memberId, filters.memberId));
    if (filters?.dateFrom) conditions.push(gte(schema.attendance.checkInTime, new Date(filters.dateFrom)));
    if (filters?.dateTo) conditions.push(lte(schema.attendance.checkInTime, new Date(filters.dateTo)));

    const data = await getDb().select().from(schema.attendance).where(and(...conditions)).orderBy(desc(schema.attendance.checkInTime));

    return data.map((row: any) => ({
      id: row.id,
      gymId: row.gymId,
      memberId: row.memberId,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      createdAt: row.createdAt,
    }));
  }

  async getMemberAttendanceHistory(memberId: string) {
    const classAttendanceData = await getDb().select().from(schema.classAttendance).where(eq(schema.classAttendance.memberId, memberId)).orderBy(desc(schema.classAttendance.markedAt)).limit(50);
    const gymAttendanceData = await getDb().select().from(schema.attendance).where(eq(schema.attendance.memberId, memberId)).orderBy(desc(schema.attendance.checkInTime)).limit(50);

    return {
      classAttendance: classAttendanceData.map((row: any) => ({
        id: row.id,
        classId: row.classId,
        memberId: row.memberId,
        status: row.status,
        markedAt: row.markedAt,
      })),
      gymAttendance: gymAttendanceData.map((row: any) => ({
        id: row.id,
        gymId: row.gymId,
        memberId: row.memberId,
        checkInTime: row.checkInTime,
        checkOutTime: row.checkOutTime,
        createdAt: row.createdAt,
      })),
    };
  }

  async getAttendanceStats(gymId: string, period: 'today' | 'week' | 'month') {
    let dateFilter: Date;
    if (period === 'today') {
      dateFilter = new Date(new Date().toISOString().split('T')[0]);
    } else if (period === 'week') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const attendanceData = await getDb().select().from(schema.attendance).where(and(eq(schema.attendance.gymId, gymId), gte(schema.attendance.checkInTime, dateFilter)));

    const totalCheckIns = attendanceData.length;
    const uniqueMembers = new Set(attendanceData.map(a => a.memberId)).size;
    const currentlyInGym = attendanceData.filter(a => a.checkOutTime === null).length;

    return {
      totalCheckIns,
      uniqueMembers,
      currentlyInGym,
    };
  }

  async getTodayGymAttendance(gymId: string) {
    // Use IST timezone (UTC+5:30) for accurate "today" filtering
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in ms
    const istNow = new Date(now.getTime() + istOffset);
    const istToday = new Date(istNow.toISOString().split('T')[0]);
    // Convert back to UTC for query
    const todayStartUtc = new Date(istToday.getTime() - istOffset);

    const data = await getDb().select({
      attendance: schema.attendance,
      member: schema.members
    })
      .from(schema.attendance)
      .leftJoin(schema.members, eq(schema.attendance.memberId, schema.members.id))
      .where(and(eq(schema.attendance.gymId, gymId), gte(schema.attendance.checkInTime, todayStartUtc)))
      .orderBy(desc(schema.attendance.checkInTime));

    return data.map((row: any) => ({
      id: row.attendance.id,
      gymId: row.attendance.gymId,
      memberId: row.attendance.memberId,
      memberName: row.member?.name || 'Unknown Member',
      checkInTime: row.attendance.checkInTime,
      checkOutTime: row.attendance.checkOutTime,
      status: row.attendance.status,
      exitType: row.attendance.exitType,
      source: row.attendance.source,
      createdAt: row.attendance.createdAt,
    }));
  }

  async getMemberActiveCheckIn(memberId: string) {
    const row = await getDb().select().from(schema.attendance).where(and(eq(schema.attendance.memberId, memberId), isNull(schema.attendance.checkOutTime))).orderBy(desc(schema.attendance.checkInTime)).limit(1).then(rows => rows[0]);

    if (!row) return null;
    return {
      id: row.id,
      gymId: row.gymId,
      memberId: row.memberId,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      source: row.source,
      createdAt: row.createdAt,
    };
  }

  // QR Config Methods
  async getAttendanceQrConfig(gymId: string) {
    const row = await getDb().select().from(schema.attendanceQrConfig).where(eq(schema.attendanceQrConfig.gymId, gymId)).limit(1).then(rows => rows[0]);
    if (!row) return null;
    return {
      id: row.id,
      gymId: row.gymId,
      secret: row.secret,
      isEnabled: row.isEnabled === 1,
      lastRotatedAt: row.lastRotatedAt,
      createdAt: row.createdAt,
    };
  }

  async createAttendanceQrConfig(gymId: string) {
    const secret = this.generateQrSecret();
    const result = await getDb().insert(schema.attendanceQrConfig).values({
      gymId,
      secret,
      isEnabled: 1,
    }).returning().then(rows => rows[0]);

    return {
      id: result.id,
      gymId: result.gymId,
      secret: result.secret,
      isEnabled: result.isEnabled === 1,
      lastRotatedAt: result.lastRotatedAt,
      createdAt: result.createdAt,
    };
  }

  async regenerateQrSecret(gymId: string) {
    const secret = this.generateQrSecret();
    const result = await getDb().update(schema.attendanceQrConfig)
      .set({ secret, lastRotatedAt: new Date(), isEnabled: 1 })
      .where(eq(schema.attendanceQrConfig.gymId, gymId))
      .returning()
      .then(rows => rows[0]);

    if (!result) {
      return this.createAttendanceQrConfig(gymId);
    }

    return {
      id: result.id,
      gymId: result.gymId,
      secret: result.secret,
      isEnabled: result.isEnabled === 1,
      lastRotatedAt: result.lastRotatedAt,
      createdAt: result.createdAt,
    };
  }

  async toggleQrAttendance(gymId: string, isEnabled: boolean) {
    const result = await getDb().update(schema.attendanceQrConfig)
      .set({ isEnabled: isEnabled ? 1 : 0 })
      .where(eq(schema.attendanceQrConfig.gymId, gymId))
      .returning()
      .then(rows => rows[0]);

    if (!result) {
      throw new Error('QR config not found');
    }

    return {
      id: result.id,
      gymId: result.gymId,
      secret: result.secret,
      isEnabled: result.isEnabled === 1,
      lastRotatedAt: result.lastRotatedAt,
      createdAt: result.createdAt,
    };
  }

  private generateQrSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  // QR-based attendance check-in/out
  // Helper to get IST day start in UTC
  private getIstDayBoundaries(now: Date = new Date()) {
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in ms
    const istNow = new Date(now.getTime() + istOffset);
    const istTodayStr = istNow.toISOString().split('T')[0];
    const istTodayStart = new Date(istTodayStr + 'T00:00:00.000Z');
    const todayStartUtc = new Date(istTodayStart.getTime() - istOffset);
    const todayEndUtc = new Date(todayStartUtc.getTime() + 24 * 60 * 60 * 1000);
    return { todayStartUtc, todayEndUtc, istTodayStr };
  }

  // Get open attendance session with auto-close logic (>3 hours)
  async getOpenAttendanceSession(gymId: string, memberId: string, now: Date = new Date()): Promise<any | null> {
    const { todayStartUtc } = this.getIstDayBoundaries(now);
    
    // Find latest open session (status = 'in' and no checkOutTime)
    const openSession = await getDb().select()
      .from(schema.attendance)
      .where(and(
        eq(schema.attendance.gymId, gymId),
        eq(schema.attendance.memberId, memberId),
        eq(schema.attendance.status, 'in'),
        isNull(schema.attendance.checkOutTime),
        gte(schema.attendance.checkInTime, todayStartUtc)
      ))
      .orderBy(desc(schema.attendance.checkInTime))
      .limit(1)
      .then(rows => rows[0]);

    if (!openSession) return null;

    // Check auto-checkout rule: >3 hours since check-in
    const checkInTime = new Date(openSession.checkInTime);
    const diffHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    if (diffHours > 3) {
      // Auto-close the session
      const autoCheckOutTime = new Date(checkInTime.getTime() + 3 * 60 * 60 * 1000);
      await getDb().update(schema.attendance)
        .set({ 
          checkOutTime: autoCheckOutTime, 
          status: 'out', 
          exitType: 'auto' 
        })
        .where(eq(schema.attendance.id, openSession.id));
      
      return null; // No open session anymore
    }

    return openSession;
  }

  // Create a new check-in record (with race condition protection via DB constraint)
  async createCheckIn(gymId: string, memberId: string, source: string = 'qr_scan'): Promise<any> {
    try {
      // Insert directly - rely on unique partial index to prevent duplicates
      // The index attendance_unique_open_session on (gym_id, member_id) WHERE status='in' AND check_out_time IS NULL
      // ensures only one active session per member per gym
      const result = await getDb().insert(schema.attendance).values({
        gymId,
        memberId,
        source,
        status: 'in',
        exitType: null,
      }).returning().then(rows => rows[0]);

      return {
        id: result.id,
        gymId: result.gymId,
        memberId: result.memberId,
        checkInTime: result.checkInTime,
        checkOutTime: result.checkOutTime,
        status: result.status,
        exitType: result.exitType,
        source: result.source,
        createdAt: result.createdAt,
      };
    } catch (err: any) {
      // Handle unique constraint violation (code 23505 - duplicate key)
      if (err.code === '23505' && err.constraint === 'attendance_unique_open_session') {
        throw new Error('Already checked in. Please check out first.');
      }
      throw err;
    }
  }

  // Close a check-in manually
  async closeCheckInManually(recordId: string, now: Date = new Date()): Promise<any> {
    const result = await getDb().update(schema.attendance)
      .set({ 
        checkOutTime: now, 
        status: 'out', 
        exitType: 'manual' 
      })
      .where(eq(schema.attendance.id, recordId))
      .returning()
      .then(rows => rows[0]);

    return {
      id: result.id,
      gymId: result.gymId,
      memberId: result.memberId,
      checkInTime: result.checkInTime,
      checkOutTime: result.checkOutTime,
      status: result.status,
      exitType: result.exitType,
      source: result.source,
      createdAt: result.createdAt,
    };
  }

  // Get member's attendance status for today
  async getMemberAttendanceToday(gymId: string, memberId: string): Promise<{ inGym: boolean; lastRecord: any | null }> {
    const now = new Date();
    const openSession = await this.getOpenAttendanceSession(gymId, memberId, now);
    
    if (openSession) {
      return {
        inGym: true,
        lastRecord: {
          id: openSession.id,
          gymId: openSession.gymId,
          memberId: openSession.memberId,
          checkInTime: openSession.checkInTime,
          checkOutTime: openSession.checkOutTime,
          status: openSession.status,
          exitType: openSession.exitType,
          source: openSession.source,
          createdAt: openSession.createdAt,
        }
      };
    }

    // Get the last record for today (if any)
    const { todayStartUtc } = this.getIstDayBoundaries(now);
    const lastRecord = await getDb().select()
      .from(schema.attendance)
      .where(and(
        eq(schema.attendance.gymId, gymId),
        eq(schema.attendance.memberId, memberId),
        gte(schema.attendance.checkInTime, todayStartUtc)
      ))
      .orderBy(desc(schema.attendance.checkInTime))
      .limit(1)
      .then(rows => rows[0]);

    if (lastRecord) {
      return {
        inGym: false,
        lastRecord: {
          id: lastRecord.id,
          gymId: lastRecord.gymId,
          memberId: lastRecord.memberId,
          checkInTime: lastRecord.checkInTime,
          checkOutTime: lastRecord.checkOutTime,
          status: lastRecord.status,
          exitType: lastRecord.exitType,
          source: lastRecord.source,
          createdAt: lastRecord.createdAt,
        }
      };
    }

    return { inGym: false, lastRecord: null };
  }

  async markAttendanceViaQr(gymId: string, memberId: string): Promise<{ action: 'checked_in' | 'checked_out'; record: any }> {
    const now = new Date();
    
    // Get open session (auto-closes expired sessions)
    const openSession = await this.getOpenAttendanceSession(gymId, memberId, now);

    if (openSession) {
      // Check out - close the open session
      const record = await this.closeCheckInManually(openSession.id, now);
      return { action: 'checked_out', record };
    } else {
      // Check in - create new session
      const record = await this.createCheckIn(gymId, memberId, 'qr_scan');
      return { action: 'checked_in', record };
    }
  }

  // Check member eligibility for QR attendance
  async checkMemberQrEligibility(memberId: string, gymId: string): Promise<{ eligible: boolean; reason?: string }> {
    // Get member
    const member = await getDb().select().from(schema.members).where(eq(schema.members.id, memberId)).limit(1).then(rows => rows[0]);
    
    if (!member) {
      return { eligible: false, reason: 'Member not found' };
    }

    if (member.gymId !== gymId) {
      return { eligible: false, reason: 'This QR code belongs to another gym' };
    }

    if (member.status !== 'active') {
      return { eligible: false, reason: 'Your membership is not active' };
    }

    // Check for active membership
    const today = new Date();
    const activeMembership = await getDb().select({
      membership: schema.memberships,
      plan: schema.membershipPlans
    })
      .from(schema.memberships)
      .leftJoin(schema.membershipPlans, eq(schema.memberships.planId, schema.membershipPlans.id))
      .where(and(
        eq(schema.memberships.memberId, memberId),
        eq(schema.memberships.status, 'active'),
        lte(schema.memberships.startDate, today),
        gte(schema.memberships.endDate, today)
      ))
      .limit(1)
      .then(rows => rows[0]);

    if (!activeMembership) {
      return { eligible: false, reason: 'Your membership has expired or is not active' };
    }

    // Check if plan allows QR attendance
    if (activeMembership.plan && activeMembership.plan.qrAttendanceEnabled === 0) {
      return { eligible: false, reason: 'Your membership plan does not allow QR attendance. Please contact the gym.' };
    }

    return { eligible: true };
  }

  // Get member by user ID and gym ID
  async getMemberByUserIdAndGym(userId: string, gymId: string) {
    const row = await getDb().select().from(schema.members).where(and(
      eq(schema.members.userId, userId),
      eq(schema.members.gymId, gymId)
    )).limit(1).then(rows => rows[0]);

    if (!row) return null;
    return row;
  }
}

export const storage = new Storage();
export type IStorage = Storage;
