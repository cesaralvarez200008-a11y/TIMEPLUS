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
  },

  // Operaciones con la tabla client_requests en Supabase Cloud
  async getClientRequests() {
    if (!supabaseClient) return [];
    try {
      const { data, error } = await supabaseClient
        .from('client_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Info Supabase getClientRequests:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('Exception fetching client_requests from Supabase:', e);
      return [];
    }
  },

  async addClientRequest(req) {
    if (!supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient
        .from('client_requests')
        .upsert({
          name: req.name,
          email: req.email,
          password: req.password,
          provider: req.provider || 'Google Workspace',
          plan: req.plan || 'TIMEPLUS Connect Pro',
          status: 'Pendiente'
        }, { onConflict: 'email' })
        .select();
      if (error) {
        console.warn('Error insertando client_request en Supabase:', error.message);
        return null;
      }
      console.log('✅ Solicitud guardada en Supabase Cloud:', req.email);
      return data?.[0] || null;
    } catch (e) {
      console.warn('Exception insertando client_request en Supabase:', e);
      return null;
    }
  },

  async updateClientRequestStatus(emailOrId, status) {
    if (!supabaseClient) return false;
    try {
      let query = supabaseClient.from('client_requests').update({ status, updated_at: new Date().toISOString() });
      if (emailOrId.includes('@')) {
        query = query.eq('email', emailOrId);
      } else {
        query = query.eq('id', emailOrId);
      }
      const { error } = await query;
      return !error;
    } catch (e) {
      return false;
    }
  },

  // Escuchar cambios en vivo con Supabase Realtime
  subscribeClientRequests(onUpdate) {
    if (!supabaseClient) return null;
    try {
      const channel = supabaseClient
        .channel('public:client_requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'client_requests' }, payload => {
          console.log('⚡ Supabase Realtime: cambio en solicitudes de clientes:', payload);
          if (typeof onUpdate === 'function') onUpdate(payload);
        })
        .subscribe();
      return channel;
    } catch (e) {
      console.warn('Error suscribiendo a Supabase Realtime:', e);
      return null;
    }
  }
};
