import { db } from '../db';
import { eq } from 'drizzle-orm';
import * as schema from '../../shared/schema';
import { supabaseRepo } from '../supabaseRepository';

export interface UserData {
  id: string;
  email: string;
  role: string;
  name: string;
  phone: string | null;
  profileImageUrl: string | null;
  isActive: number;
  createdAt: string | Date;
  lastLogin: string | Date | null;
  gymId?: string | null;
  gymIds?: string[];
}

function isDbAvailable(): boolean {
  return db !== null;
}

export async function getUserById(userId: string): Promise<UserData | null> {
  try {
    if (isDbAvailable()) {
      const user = await db!.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1).then(rows => rows[0]);
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        isActive: user.isActive ?? 1,
        createdAt: user.createdAt || new Date(),
        lastLogin: user.lastLogin,
      };
    } else {
      const supabaseUser = await supabaseRepo.getUserById(userId);
      if (!supabaseUser) return null;
      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        role: supabaseUser.role,
        name: supabaseUser.name,
        phone: supabaseUser.phone,
        profileImageUrl: supabaseUser.profile_image_url,
        isActive: supabaseUser.is_active,
        createdAt: supabaseUser.created_at,
        lastLogin: supabaseUser.last_login,
      };
    }
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<UserData | null> {
  try {
    if (isDbAvailable()) {
      const user = await db!.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1).then(rows => rows[0]);
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        isActive: user.isActive ?? 1,
        createdAt: user.createdAt || new Date(),
        lastLogin: user.lastLogin,
      };
    } else {
      const supabaseUser = await supabaseRepo.getUserByEmail(email);
      if (!supabaseUser) return null;
      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        role: supabaseUser.role,
        name: supabaseUser.name,
        phone: supabaseUser.phone,
        profileImageUrl: supabaseUser.profile_image_url,
        isActive: supabaseUser.is_active,
        createdAt: supabaseUser.created_at,
        lastLogin: supabaseUser.last_login,
      };
    }
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return null;
  }
}

export async function getUserGyms(userId: string, role: string): Promise<string[]> {
  try {
    if (isDbAvailable()) {
      const { storage } = await import('../storage');
      return await storage.getUserGyms(userId, role);
    } else {
      return await supabaseRepo.getUserGyms(userId, role);
    }
  } catch (error) {
    console.error('Error in getUserGyms:', error);
    return [];
  }
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  try {
    if (isDbAvailable()) {
      await db!.update(schema.users).set({ lastLogin: new Date() }).where(eq(schema.users.id, userId));
    } else {
      await supabaseRepo.updateUserLastLogin(userId);
    }
  } catch (error) {
    console.error('Error in updateUserLastLogin:', error);
  }
}
