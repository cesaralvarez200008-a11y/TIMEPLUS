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

  async registerClientRequest(clientDataOrName, emailParam, planParam = 'TIMEPLUS Connect Pro') {
    if (!_client) return { ok: false, error: 'Base de datos no conectada.' };

    let data = {};
    if (typeof clientDataOrName === 'object') {
      data = clientDataOrName;
    } else {
      data = {
        name: clientDataOrName,
        email: emailParam,
        plan: planParam
      };
    }

    const cleanEmail = (data.email || '').trim().toLowerCase();
    if (!cleanEmail) return { ok: false, error: 'El correo electrónico es obligatorio.' };

    try {
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
          client: found,
          message: isApp ? 'Esta cuenta ya está aprobada. Puedes iniciar sesión directamente.' : 'Esta solicitud ya está registrada y en espera de aprobación por el SuperAdmin.'
        };
      }

      const notesObj = {
        phone: data.phone || '',
        birthDate: data.birthDate || '',
        city: data.city || '',
        userType: data.userType || 'Estudiante',
        personType: data.personType || 'Natural',
        firstName: data.firstName || '',
        secondName: data.secondName || '',
        lastName: data.lastName || data.lastName1 || '',
        lastName1: data.lastName1 || data.lastName || '',
        lastName2: data.lastName2 || '',
        docType: data.docType || 'CC',
        docNumber: data.docNumber || '',
        gender: data.gender || '',
        country: data.country || 'Colombia',
        academicLevel: data.academicLevel || '',
        institution: data.institution || '',
        program: data.program || '',
        semester: data.semester || '',
        interests: data.interests || '',
        learningGoal: data.learningGoal || '',
        addrHome: data.addrHome || '',
        workStatus: data.workStatus || 'Presencial',
        addrWork: data.addrWork || '',
        familyKinship: data.familyKinship || 'Mamá',
        addrFamily: data.addrFamily || '',
        gymStatus: data.gymStatus || 'si',
        addrGym: data.addrGym || '',
        availability: data.availability || '',
        notifyPref: data.notifyPref || 'WhatsApp',
        timezone: data.timezone || 'America/Bogota',
        registeredAt: new Date().toISOString()
      };

      const fullName = (data.name || [data.firstName, data.secondName, data.lastName1 || data.lastName, data.lastName2].filter(Boolean).join(' ') || 'Nuevo Cliente').trim();

      const payload = {
        name: fullName,
        email: cleanEmail,
        plan: data.plan || 'TIMEPLUS Connect Pro',
        status: 'pendiente',
        notes: JSON.stringify(notesObj),
        created_at: new Date().toISOString()
      };

      let insertRes = await _client.from('client_requests').insert([payload]).select();
      if (insertRes.error) {
        delete payload.notes;
        insertRes = await _client.from('client_requests').insert([payload]).select();
        if (insertRes.error) throw insertRes.error;
      }

      const created = (insertRes.data && insertRes.data[0]) ? insertRes.data[0] : payload;

      return {
        ok: true,
        alreadyExists: false,
        client: { ...created, ...notesObj },
        message: '¡Solicitud registrada con éxito! El SuperAdmin revisará tus datos.'
      };
    } catch (e) {
      console.error('Error registrando solicitud en Supabase:', e);
      return { ok: false, error: e.message };
    }
  },

  async updateClientProfile(idOrEmail, updatedData) {
    if (!_client) return { ok: false, error: 'Supabase no conectado' };
    try {
      const { data: list, error: errSel } = await _client.from('client_requests').select('*');
      if (errSel) throw errSel;
      const cleanTarget = (idOrEmail || '').trim().toLowerCase();
      const existing = (list || []).find(r => r.id === idOrEmail || (r.email || '').toLowerCase() === cleanTarget);
      if (!existing) return { ok: false, error: 'Cliente no encontrado en Supabase' };

      let currentNotes = {};
      if (existing.notes) {
        try { currentNotes = JSON.parse(existing.notes); } catch(e) {}
      }

      const mergedNotes = {
        ...currentNotes,
        ...updatedData,
        updatedAt: new Date().toISOString()
      };

      const updatePayload = {
        notes: JSON.stringify(mergedNotes),
        name: (updatedData.name || existing.name || '').trim()
      };

      const { error: errUpd } = await _client
        .from('client_requests')
        .update(updatePayload)
        .eq('id', existing.id);

      if (errUpd) throw errUpd;

      return { ok: true, data: { ...existing, ...mergedNotes, name: updatePayload.name } };
    } catch(e) {
      console.error('Error actualizando perfil en Supabase:', e);
      return { ok: false, error: e.message };
    }
  },

  /* ── MÓDULO SALUD & MEDICAMENTOS (SUPABASE CLOUD) ── */
  async getMedicationsFromCloud(userEmail) {
    if (!_client || !userEmail) return [];
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      const { data, error } = await _client
        .from('medications')
        .select('*')
        .eq('user_email', cleanEmail)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(m => ({
        id: m.id,
        userEmail: m.user_email,
        userName: m.user_name,
        name: m.name,
        dosePerTake: Number(m.dose_per_take) || 1,
        unit: m.unit || 'pastillas',
        frequency: m.frequency || 'Cada 24 horas',
        time: m.time || '08:00',
        currentStock: Number(m.current_stock) || 0,
        dailyDose: Number(m.daily_dose) || 1,
        instructions: m.instructions || '',
        refillThreshold: Number(m.refill_threshold) || 5,
        expiryDate: m.expiry_date || '',
        usageType: m.usage_type || 'activo',
        locationNotes: m.location_notes || ''
      }));
    } catch (e) {
      // Tabla puede no existir todavía si el usuario no ha corrido el SQL
      console.warn('Nota: Sincronización en la nube de medicamentos pendiente o tabla no creada:', e.message);
      return [];
    }
  },

  async upsertMedicationToCloud(med) {
    if (!_client || !med || !med.userEmail) return null;
    try {
      const payload = {
        id: med.id,
        user_email: (med.userEmail || '').trim().toLowerCase(),
        user_name: med.userName || '',
        name: med.name,
        dose_per_take: Number(med.dosePerTake) || 1,
        unit: med.unit || 'pastillas',
        frequency: med.frequency || 'Cada 24 horas',
        time: med.time || '08:00',
        current_stock: Number(med.currentStock) || 0,
        daily_dose: Number(med.dailyDose) || 1,
        instructions: med.instructions || '',
        refill_threshold: Number(med.refillThreshold) || 5,
        expiry_date: med.expiryDate || null,
        usage_type: med.usageType || 'activo',
        location_notes: med.locationNotes || '',
        updated_at: new Date().toISOString()
      };
      const { data, error } = await _client
        .from('medications')
        .upsert(payload)
        .select();
      if (error) throw error;
      return data?.[0] || null;
    } catch (e) {
      console.warn('No se pudo guardar medicamento en Supabase (usando almacenamiento local):', e.message);
      return null;
    }
  },

  async deleteMedicationFromCloud(medId) {
    if (!_client || !medId) return;
    try {
      await _client.from('medications').delete().eq('id', medId);
    } catch (e) {
      console.warn('Error eliminando medicamento de Supabase:', e.message);
    }
  },

  async logMedicationTakenToCloud(log) {
    if (!_client || !log || !log.userEmail) return;
    try {
      const payload = {
        medication_id: log.medicationId || null,
        user_email: (log.userEmail || '').trim().toLowerCase(),
        medication_name: log.medicationName || 'Medicamento',
        dose_taken: Number(log.doseTaken) || 1,
        stock_after: log.stockAfter !== undefined ? Number(log.stockAfter) : null,
        status: log.status || 'Tomado',
        taken_at: log.takenAt || new Date().toISOString()
      };
      await _client.from('medication_logs').insert(payload);
    } catch (e) {
      console.warn('Nota log de toma en nube:', e.message);
    }
  },

  /* ── MÓDULO FITNESS & WORKOUTS (SUPABASE CLOUD) ── */
  async saveFitnessWorkoutToCloud(workout, user) {
    if (!_client || !workout || !user?.email) return null;
    try {
      const payload = {
        user_email: user.email.trim().toLowerCase(),
        user_name: user.name || '',
        title: workout.title || 'Entrenamiento',
        activity_type: workout.activityType || 'gym',
        muscle_group: workout.muscleGroup || '',
        duration: workout.duration || '1 hora',
        duration_hours: Number(workout.durationHours) || 1.0,
        distance_km: Number(workout.distanceKm) || 0,
        calories: Number(workout.calories) || 400,
        location: workout.location || 'Gimnasio',
        exercises: workout.exercises || []
      };
      const { data, error } = await _client.from('fitness_workouts').insert(payload).select();
      if (error) throw error;
      return data?.[0] || null;
    } catch (e) {
      console.warn('Nota workout en nube:', e.message);
      return null;
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
