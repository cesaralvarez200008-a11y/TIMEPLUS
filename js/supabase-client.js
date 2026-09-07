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

  async checkClientApproval(email) {
    if (!_client || !email) return { allowed: false, reason: 'Servicio de base de datos no disponible.' };
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await _client
        .from('client_requests')
        .select('*');
      if (error) throw error;

      const req = (data || []).find(r => (r.email || '').trim().toLowerCase() === cleanEmail);
      if (!req) {
        return {
          allowed: false,
          status: 'no_registrado',
          reason: 'Este correo no está registrado. Puedes enviar una solicitud de registro para que el SuperAdmin te apruebe.'
        };
      }

      const statusClean = (req.status || '').trim().toLowerCase();
      if (statusClean === 'aprobado') {
        return {
          allowed: true,
          status: 'aprobado',
          data: req
        };
      } else {
        return {
          allowed: false,
          status: statusClean || 'pendiente',
          data: req,
          reason: `Tu cuenta está en estado "${req.status || 'Pendiente'}". El SuperAdmin aún no ha aprobado tu acceso.`
        };
      }
    } catch (e) {
      console.warn('Error verificando aprobación en Supabase:', e);
      return { allowed: false, reason: 'Error conectando con la nube de autorización.' };
    }
  },

  async registerClientRequest(name, email, plan = 'TIMEPLUS Connect Pro') {
    if (!_client || !email) return { ok: false, error: 'Datos incompletos.' };
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data: existing } = await _client
        .from('client_requests')
        .select('*');

      const found = (existing || []).find(r => (r.email || '').trim().toLowerCase() === cleanEmail);
      if (found) {
        const isApp = (found.status || '').trim().toLowerCase() === 'aprobado';
        return {
          ok: true,
          alreadyExists: true,
          status: found.status,
          isApproved: isApp,
          message: isApp ? 'Tu cuenta ya está aprobada. Puedes iniciar sesión.' : 'Tu solicitud ya está registrada y pendiente de aprobación.'
        };
      }

      const { data, error } = await _client
        .from('client_requests')
        .insert([{
          name: name.trim() || 'Nuevo Cliente',
          email: cleanEmail,
          plan: plan,
          status: 'pendiente',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      return { ok: true, alreadyExists: false, message: '¡Solicitud enviada! Espera a que el SuperAdmin apruebe tu cuenta.' };
    } catch (e) {
      console.error('Error registrando solicitud en Supabase:', e);
      return { ok: false, error: e.message };
    }
  },

  async updateRequestStatus(id, newStatus) {
    if (!_client) return false;
    try {
      const { error } = await _client
        .from('client_requests')
        .update({ status: newStatus.trim().toLowerCase(), updated_at: new Date().toISOString() })
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
