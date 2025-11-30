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
  }
};
