import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

describe('Admin Authentication and Login Resolution', () => {
  it('1. Resolves ADMIN001 identifier to administrator email', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: email, error } = await supabase.rpc('get_auth_email_for_login', {
      p_identifier: 'ADMIN001',
    });

    expect(error).toBeNull();
    expect(email).toBe('chandureddy180706@gmail.com');
  });

  it('2. Signs in successfully via resolved Admin ID and credentials', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Resolve email
    const { data: resolvedEmail } = await supabase.rpc('get_auth_email_for_login', {
      p_identifier: 'ADMIN001',
    });
    expect(resolvedEmail).toBe('chandureddy180706@gmail.com');

    // 2. Sign in with password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail!,
      password: 'chandu@18',
    });

    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();

    // 3. Fetch profile and verify role
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('role, is_admin, admin_id')
      .eq('id', authData.user!.id)
      .maybeSingle();

    expect(profError).toBeNull();
    expect(profile?.role).toBe('administrator');
    expect(profile?.is_admin).toBe(true);
    expect(profile?.admin_id).toBe('ADMIN001');
  });

  it('3. Signs in successfully directly using email chandureddy180706@gmail.com', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'chandureddy180706@gmail.com',
      password: 'chandu@18',
    });

    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', authData.user!.id)
      .maybeSingle();

    expect(profile?.role).toBe('administrator');
    expect(profile?.is_admin).toBe(true);
  });
});
