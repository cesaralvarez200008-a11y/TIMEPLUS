/**
 * TIMEPLUS — Supabase Client Configuration
 * Conexión a la base de datos de TIMEPLUS en Supabase
 */
const SUPABASE_URL = 'https://bkrmrwbsmntrmxtdhoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1jKVPMpxJ7m5U4VuXFW0wQ_izCTcRlf';

let supabaseClient = null;

if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ TIMEPLUS: Conectado a Supabase correctamente.');
  } catch (err) {
    console.warn('⚠️ Error al inicializar Supabase Client:', err);
  }
} else {
  console.warn('⚠️ SDK de Supabase no encontrado en window.supabase');
}

window.timeplusSupabase = {
  client: supabaseClient,
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  
  // Helpers para sincronización de datos con Supabase Cloud
  async getProfiles() {
    if (!supabaseClient) return [];
    try {
      const { data, error } = await supabaseClient.from('profiles').select('*');
      if (error) {
        console.warn('Info: profiles RLS activo o tabla vacía:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('Error fetching profiles:', e);
      return [];
    }
  },

  async saveProfile(profile) {
    if (!supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient.from('profiles').upsert(profile, { onConflict: 'email' });
      if (error) console.warn('Error saving profile to Supabase:', error.message);
      return data;
    } catch (e) {
      console.warn('Exception saving profile:', e);
      return null;
    }
  },

  async getActivities(userId) {
    if (!supabaseClient) return [];
    try {
      let query = supabaseClient.from('activities').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  },

  async getPlaces(userId) {
    if (!supabaseClient) return [];
    try {
      let query = supabaseClient.from('places').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  },

  async getAdminMetrics() {
    if (!supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient
        .from('admin_metrics_log')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1);
      return data?.[0] || null;
    } catch (e) {
      return null;
    }
  }
};
