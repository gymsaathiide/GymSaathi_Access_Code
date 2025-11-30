import { supabase } from './supabase';

export interface SupabaseUser {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  name: string;
  phone: string | null;
  profile_image_url: string | null;
  is_active: number;
  created_at: string;
  last_login: string | null;
}

export interface SupabaseGym {
  id: string;
  name: string;
  slug: string | null;
  owner: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  members: number;
  revenue: string;
  address: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface SupabaseMember {
  id: string;
  gym_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  status: string;
}

export interface SupabaseGymUser {
  id: string;
  gym_id: string;
  user_id: string;
  role: string;
  is_primary: number;
}

export interface SupabasePasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: number;
  created_at: string;
}

export const supabaseRepo = {
  async getUserByEmail(email: string): Promise<SupabaseUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Supabase getUserByEmail error:', error);
      return null;
    }
    return data as SupabaseUser;
  },

  async getUserById(userId: string): Promise<SupabaseUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Supabase getUserById error:', error);
      return null;
    }
    return data as SupabaseUser;
  },

  async updateUserLastLogin(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) {
      console.error('Supabase updateUserLastLogin error:', error);
    }
  },

  async getUserGyms(userId: string, role: string): Promise<string[]> {
    try {
      if (role === 'superadmin') {
        const { data, error } = await supabase
          .from('gyms')
          .select('id')
          .limit(100);
        
        if (error) {
          if (!error.message.includes('does not exist')) {
            console.error('Supabase getUserGyms error:', error.message);
          }
          return [];
        }
        return (data || []).map(g => g.id);
      }

      if (role === 'admin') {
        const { data, error } = await supabase
          .from('gym_admins')
          .select('gym_id')
          .eq('user_id', userId);
        
        if (error) {
          if (!error.message.includes('does not exist')) {
            console.error('Supabase getUserGyms (gym_admins) error:', error.message);
          }
          return [];
        }
        return (data || []).map(ga => ga.gym_id);
      }

      if (role === 'trainer') {
        const { data, error } = await supabase
          .from('trainers')
          .select('gym_id')
          .eq('user_id', userId);
        
        if (error) {
          if (!error.message.includes('does not exist')) {
            console.error('Supabase getUserGyms (trainers) error:', error.message);
          }
          return [];
        }
        return (data || []).map(t => t.gym_id);
      }

      if (role === 'member') {
        const { data, error } = await supabase
          .from('members')
          .select('gym_id')
          .eq('user_id', userId);
        
        if (error) {
          if (!error.message.includes('does not exist')) {
            console.error('Supabase getUserGyms (members) error:', error.message);
          }
          return [];
        }
        return (data || []).map(m => m.gym_id);
      }

      return [];
    } catch (e) {
      console.error('Supabase getUserGyms unexpected error:', e);
      return [];
    }
  },

  async getGymIdForUser(userId: string, role: string): Promise<string | null> {
    try {
      if (role === 'admin') {
        const { data, error } = await supabase
          .from('gym_admins')
          .select('gym_id')
          .eq('user_id', userId)
          .limit(1)
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Supabase getGymIdForUser (admin) error:', error);
          }
          return null;
        }
        return data?.gym_id || null;
      }

      if (role === 'trainer') {
        const { data, error } = await supabase
          .from('trainers')
          .select('gym_id')
          .eq('user_id', userId)
          .limit(1)
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Supabase getGymIdForUser (trainer) error:', error);
          }
          return null;
        }
        return data?.gym_id || null;
      }

      if (role === 'member') {
        const { data, error } = await supabase
          .from('members')
          .select('gym_id')
          .eq('user_id', userId)
          .limit(1)
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Supabase getGymIdForUser (member) error:', error);
          }
          return null;
        }
        return data?.gym_id || null;
      }

      return null;
    } catch (e) {
      console.error('Supabase getGymIdForUser unexpected error:', e);
      return null;
    }
  },

  async getGymById(gymId: string): Promise<SupabaseGym | null> {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', gymId)
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Supabase getGymById error:', error);
      return null;
    }
    return data as SupabaseGym;
  },

  async getAllGyms(): Promise<SupabaseGym[]> {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase getAllGyms error:', error);
      return [];
    }
    return (data || []) as SupabaseGym[];
  },

  async createUser(userData: Partial<SupabaseUser>): Promise<SupabaseUser | null> {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase createUser error:', error);
      return null;
    }
    return data as SupabaseUser;
  },

  async logAuditEvent(auditData: {
    user_id: string;
    user_name: string;
    action: string;
    resource: string;
    severity: string;
    ip_address: string;
    details?: string;
    status: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        ...auditData,
        timestamp: new Date().toISOString()
      }]);
    
    if (error) {
      console.error('Supabase logAuditEvent error:', error);
    }
  },

  async deletePasswordResetTokensForUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('Supabase deletePasswordResetTokensForUser error:', error);
    }
  },

  async createPasswordResetToken(tokenData: {
    user_id: string;
    token: string;
    expires_at: string;
    used: number;
  }): Promise<SupabasePasswordResetToken | null> {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .insert([tokenData])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase createPasswordResetToken error:', error);
      return null;
    }
    return data as SupabasePasswordResetToken;
  },

  async getPasswordResetToken(token: string): Promise<SupabasePasswordResetToken | null> {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Supabase getPasswordResetToken error:', error);
      return null;
    }
    return data as SupabasePasswordResetToken;
  },

  async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    const { error } = await supabase
      .from('password_reset_tokens')
      .update({ used: 1 })
      .eq('id', tokenId);
    
    if (error) {
      console.error('Supabase markPasswordResetTokenUsed error:', error);
    }
  },

  async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);
    
    if (error) {
      console.error('Supabase updateUserPassword error:', error);
      return false;
    }
    return true;
  },

  async createGym(gymData: {
    name: string;
    owner: string;
    email: string;
    phone: string;
    plan: string;
    status: string;
    members?: number;
    revenue?: string;
    address?: string | null;
    logo_url?: string | null;
  }): Promise<SupabaseGym | null> {
    const { data, error } = await supabase
      .from('gyms')
      .insert([{
        ...gymData,
        members: gymData.members || 0,
        revenue: gymData.revenue || '0',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase createGym error:', error);
      return null;
    }
    return data as SupabaseGym;
  },

  async createGymAdmin(gymId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('gym_admins')
      .insert([{
        gym_id: gymId,
        user_id: userId,
        is_primary: 1
      }]);
    
    if (error) {
      console.error('Supabase createGymAdmin error:', error);
      return false;
    }
    return true;
  },

  async updateGym(gymId: string, updateData: Partial<SupabaseGym>): Promise<SupabaseGym | null> {
    const { data, error } = await supabase
      .from('gyms')
      .update(updateData)
      .eq('id', gymId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase updateGym error:', error);
      return null;
    }
    return data as SupabaseGym;
  },

  async deleteGym(gymId: string): Promise<boolean> {
    const { error } = await supabase
      .from('gyms')
      .delete()
      .eq('id', gymId);
    
    if (error) {
      console.error('Supabase deleteGym error:', error);
      return false;
    }
    return true;
  }
};
