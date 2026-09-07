/**
 * TIMEPLUS OS — Supabase Cloud Database Client
 * Realtime Sync & SuperAdmin Authorization
 */

const SUPABASE_URL = window.TIMEPLUS_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.TIMEPLUS_CONFIG.SUPABASE_ANON_KEY;

let _client = null;

if (window.supabase) {
  try {
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ TIMEPLUS: Conectado a Supabase Cloud exitosamente.');
  } catch (err) {
    console.warn('Nota Supabase Client:', err);
  }
}

window.timeplusSupabase = {
  client: _client,

  async getClientRequests() {
    if (!_client) return [];
    try {
      const { data, error } = await _client
        .from('client_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('Error fetching client_requests:', e.message);
      return [];
    }
  },

  async updateRequestStatus(id, newStatus) {
    if (!_client) return false;
    try {
      const { error } = await _client
        .from('client_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Error updating status:', e);
      return false;
    }
  },

  subscribeRealtime(callback) {
    if (!_client) return null;
    try {
      return _client
        .channel('public:client_requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'client_requests' }, payload => {
          console.log('⚡ Supabase Realtime cambio detectado:', payload);
          if (callback) callback(payload);
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
      return null;
    }
  }
};
