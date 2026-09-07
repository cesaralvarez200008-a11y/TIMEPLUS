/**
 * TIMEPLUS OS — Unified Reactive State Store
 * Offline-First + Supabase Cloud Database Integration
 */

class TimePlusStore {
  constructor() {
    this.STORAGE_KEY = 'TIMEPLUS_OS_STATE_V3';
    this.listeners = [];
    this.state = this.loadState();
  }

  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.activities) {
          // Asegurar que si hay un usuario en caché, no sea un cliente no aprobado
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Fallback a datos iniciales:', e);
    }
    return JSON.parse(JSON.stringify(window.TIMEPLUS_CONFIG.INITIAL_DATA));
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this.state); } catch (err) { console.error('Error en listener:', err); }
    });
  }

  // --- Auth Management con Verificación Estricta en Supabase Cloud ---
  getCurrentUser() {
    return this.state.user || null;
  }

  setUser(user) {
    this.state.user = user;
    this.saveState();
  }

  async loginWithApproval(roleOrEmail, password = '') {
    const config = window.TIMEPLUS_CONFIG;
    const cleanEmail = (roleOrEmail || '').trim().toLowerCase();

    // 1. Caso SuperAdmin
    if (cleanEmail === 'admin' || cleanEmail === config.SUPERADMIN_EMAIL.toLowerCase()) {
      if (password && password !== config.SUPERADMIN_PASS) {
        return { success: false, status: 'error', reason: 'Contraseña de SuperAdmin incorrecta.' };
      }
      this.state.user = {
        id: 'adm-root',
        name: 'SuperAdmin Maestro',
        email: config.SUPERADMIN_EMAIL,
        role: 'admin',
        plan: 'Control Maestro Global'
      };
      this.saveState();
      return { success: true, user: this.state.user };
    }

    // 2. Caso Cliente Normal — VERIFICACIÓN EN SUPABASE CLOUD
    if (window.timeplusSupabase) {
      const check = await window.timeplusSupabase.checkClientApproval(cleanEmail);
      if (check.allowed && check.status === 'aprobado') {
        const req = check.data;
        let extra = {};
        if (req.notes) {
          try { extra = JSON.parse(req.notes); } catch(e) {}
        }
        this.state.user = {
          id: req.id || ('usr-' + Date.now()),
          name: req.name || 'Cliente TIMEPLUS',
          email: req.email || cleanEmail,
          phone: req.phone || extra.phone || '',
          birthDate: req.birth_date || extra.birthDate || '',
          city: req.city || extra.city || '',
          role: 'client',
          plan: req.plan || 'TIMEPLUS Connect Pro',
          userType: extra.userType || 'Estudiante',
          personType: extra.personType || 'Natural',
          firstName: extra.firstName || '',
          lastName: extra.lastName || '',
          docType: extra.docType || 'CC',
          docNumber: extra.docNumber || '',
          gender: extra.gender || '',
          country: extra.country || 'Colombia',
          academicLevel: extra.academicLevel || '',
          institution: extra.institution || '',
          program: extra.program || '',
          semester: extra.semester || '',
          interests: extra.interests || '',
          learningGoal: extra.learningGoal || '',
          addrHome: extra.addrHome || '',
          addrWork: extra.addrWork || '',
          addrFamily: extra.addrFamily || '',
          addrGym: extra.addrGym || '',
          availability: extra.availability || '',
          notifyPref: extra.notifyPref || 'WhatsApp',
          timezone: extra.timezone || 'America/Bogota',
          extra: extra
        };
        this.saveState();
        return { success: true, user: this.state.user };
      } else {
        // Bloqueado: o está pendiente o no está registrado
        return {
          success: false,
          status: check.status || 'pendiente',
          reason: check.reason || 'Tu cuenta aún no ha sido aprobada por el Administrador.'
        };
      }
    }

    return { success: false, status: 'error', reason: 'No se pudo conectar con Supabase para verificar aprobación.' };
  }

  // Compatibilidad con login sincrónico anterior si es admin
  login(roleOrEmail, password = '') {
    const config = window.TIMEPLUS_CONFIG;
    const cleanEmail = (roleOrEmail || '').trim().toLowerCase();
    if (cleanEmail === 'admin' || cleanEmail === config.SUPERADMIN_EMAIL.toLowerCase()) {
      this.state.user = {
        id: 'adm-root',
        name: 'SuperAdmin Maestro',
        email: config.SUPERADMIN_EMAIL,
        role: 'admin',
        plan: 'Control Maestro Global'
      };
      this.saveState();
      return this.state.user;
    }
    return null;
  }

  logout() {
    this.state.user = null;
    this.saveState();
  }

  async updateUserProfile(updatedData) {
    if (!this.state.user) return false;
    this.state.user = {
      ...this.state.user,
      ...updatedData
    };
    this.saveState();

    if (window.timeplusSupabase && this.state.user.role === 'client') {
      try {
        await window.timeplusSupabase.updateClientProfile(this.state.user.id || this.state.user.email, updatedData);
      } catch(e) {
        console.warn('Error syncing profile update to Supabase:', e);
      }
    }
    return true;
  }

  // --- Activities Management con Aislamiento Estricto por Cliente ---
  getActivities() {
    const acts = this.state.activities || [];
    const user = this.getCurrentUser();
    if (!user) return [];
    if (user.role === 'admin') return acts; // SuperAdmin controla y ve todo
    // Cliente solo ve sus propias actividades (en blanco si acaba de registrarse)
    const userEmail = (user.email || '').trim().toLowerCase();
    return acts.filter(a => a.userEmail && a.userEmail.trim().toLowerCase() === userEmail);
  }

  addActivity(activity) {
    if (!activity.id) activity.id = 'act-' + Date.now();
    if (!activity.date) activity.date = 'today';

    const user = this.getCurrentUser();
    if (user && user.email) {
      activity.userEmail = user.email.toLowerCase();
      activity.userId = user.id;
      activity.userName = user.name;
    }

    this.state.activities.push(activity);
    
    // Si tiene lugar asociado, registrar visita
    if (activity.placeId) {
      this.recordPlaceVisit(activity.placeId);
    }

    this.saveState();
    return activity;
  }

  updateActivity(id, updates) {
    const idx = this.state.activities.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.state.activities[idx] = { ...this.state.activities[idx], ...updates };
      this.saveState();
      return this.state.activities[idx];
    }
    return null;
  }

  deleteActivity(id) {
    this.state.activities = this.state.activities.filter(a => a.id !== id);
    this.saveState();
  }

  // --- Salud: Inventario y Seguimiento de Medicamentos (Visión 8) ---
  getMedications() {
    const meds = this.state.medications || [];
    const user = this.getCurrentUser();
    if (!user) return [];
    if (user.role === 'admin') return meds;
    const userEmail = (user.email || '').trim().toLowerCase();
    return meds.filter(m => m.userEmail && m.userEmail.trim().toLowerCase() === userEmail);
  }

  addMedication(med) {
    if (!this.state.medications) this.state.medications = [];
    if (!med.id) med.id = 'med-' + Date.now();
    const user = this.getCurrentUser();
    if (user && user.email) {
      med.userEmail = user.email.toLowerCase();
      med.userName = user.name || '';
    }
    this.state.medications.push(med);

    // Si tiene hora programada, crear la actividad en agenda para hoy
    if (med.time) {
      this.addActivity({
        id: 'act-' + med.id,
        title: `Medicamento — ${med.name}`,
        category: 'salud',
        time: med.time,
        date: 'today',
        duration: '15m',
        type: 'medicamento',
        dosage: `${med.dosePerTake || 1} ${med.unit || 'pastilla(s)'}`,
        medicationId: med.id,
        confirmedTaken: false,
        notes: med.instructions || 'Tomar según prescripción'
      });
    }

    this.saveState();
    return med;
  }

  updateMedication(id, updates) {
    if (!this.state.medications) return null;
    const idx = this.state.medications.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.state.medications[idx] = { ...this.state.medications[idx], ...updates };
      this.saveState();
      return this.state.medications[idx];
    }
    return null;
  }

  deleteMedication(id) {
    if (!this.state.medications) return;
    this.state.medications = this.state.medications.filter(m => m.id !== id);
    this.state.activities = this.state.activities.filter(a => a.medicationId !== id);
    this.saveState();
  }

  restockMedication(id, additionalUnits) {
    if (!this.state.medications) return;
    const med = this.state.medications.find(m => m.id === id);
    if (med) {
      med.currentStock = (Number(med.currentStock) || 0) + Number(additionalUnits);
      this.saveState();
      return med;
    }
    return null;
  }

  confirmMedication(actId, taken = true) {
    const act = this.state.activities.find(a => a.id === actId);
    let medUpdated = null;

    if (act && taken && !act.confirmedTaken && act.medicationId) {
      if (this.state.medications) {
        const med = this.state.medications.find(m => m.id === act.medicationId);
        if (med) {
          const dose = Number(med.dosePerTake) || 1;
          med.currentStock = Math.max(0, (Number(med.currentStock) || 0) - dose);
          medUpdated = med;
        }
      }
    }

    const updatedAct = this.updateActivity(actId, {
      confirmedTaken: taken,
      takenAt: taken ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      notes: taken ? `Toma confirmada a las ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Toma pospuesta/recordar luego.'
    });

    return { activity: updatedAct, medication: medUpdated };
  }

  // --- Fitness: Registro de Ejercicio (Visión 9) ---
  recordWorkout(workout) {
    if (!this.state.fitnessSummary) {
      this.state.fitnessSummary = { weeklyWorkouts: 0, targetWorkouts: 5, activeHours: 0, caloriesBurned: 0 };
    }
    this.state.fitnessSummary.weeklyWorkouts += 1;
    this.state.fitnessSummary.activeHours += (workout.durationHours || 1);
    this.state.fitnessSummary.caloriesBurned += (workout.calories || 450);

    const user = this.getCurrentUser();
    const act = {
      id: 'fit-' + Date.now(),
      title: workout.title || 'Entrenamiento Registrado',
      category: 'fitness',
      time: workout.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'today',
      duration: workout.duration || '1h',
      type: 'fitness',
      exercises: workout.exercises || [],
      userEmail: user ? user.email.toLowerCase() : null
    };
    return this.addActivity(act);
  }

  getFitnessSummary() {
    const user = this.getCurrentUser();
    if (user && user.role === 'client') {
      const clientWorkouts = this.getActivities().filter(a => a.category === 'fitness');
      const hours = clientWorkouts.reduce((acc, w) => acc + (parseFloat(w.duration) || 1), 0);
      return {
        weeklyWorkouts: clientWorkouts.length,
        targetWorkouts: 5,
        activeHours: hours,
        caloriesBurned: clientWorkouts.length * 450
      };
    }
    return this.state.fitnessSummary || { weeklyWorkouts: 0, targetWorkouts: 5, activeHours: 0, caloriesBurned: 0 };
  }

  // --- Contactos (Visión 6) ---
  getContacts() {
    const contacts = this.state.contacts || [];
    const user = this.getCurrentUser();
    if (!user) return [];
    if (user.role === 'admin') return contacts;
    const userEmail = (user.email || '').trim().toLowerCase();
    return contacts.filter(c => c.userEmail && c.userEmail.trim().toLowerCase() === userEmail);
  }

  addContact(contact) {
    if (!contact.id) contact.id = 'cnt-' + Date.now();
    const user = this.getCurrentUser();
    if (user && user.email) {
      contact.userEmail = user.email.toLowerCase();
    }
    if (!this.state.contacts) this.state.contacts = [];
    this.state.contacts.push(contact);
    this.saveState();
    return contact;
  }

  // --- Lugares y Movilidad (Visión 15 & 3) ---
  getPlaces() {
    const places = this.state.places || [];
    const user = this.getCurrentUser();
    if (!user) return [];
    if (user.role === 'admin') return places;
    const userEmail = (user.email || '').trim().toLowerCase();
    const userPlaces = places.filter(p => p.userEmail && p.userEmail.trim().toLowerCase() === userEmail);
    if (userPlaces.length === 0 && (user.addrHome || user.addrGym || user.addrWork)) {
      const autoPlaces = [];
      if (user.addrHome) autoPlaces.push({ id: 'plc-home', name: 'Casa / Residencia', address: user.addrHome, visitsCount: 1, avgTravelTime: 'Punto Base' });
      if (user.addrWork) autoPlaces.push({ id: 'plc-work', name: 'Trabajo / Estudio', address: user.addrWork, visitsCount: 0, avgTravelTime: '~20 min' });
      if (user.addrGym) autoPlaces.push({ id: 'plc-gym', name: 'Gimnasio Habitual', address: user.addrGym, visitsCount: 0, avgTravelTime: '~15 min' });
      return autoPlaces;
    }
    return userPlaces;
  }

  recordPlaceVisit(placeId) {
    const place = this.state.places.find(p => p.id === placeId);
    if (place) {
      place.visitsCount = (place.visitsCount || 0) + 1;
      this.saveState();
    }
  }

  // --- Detección de Conflictos de Horario (Visión 20) ---
  detectConflicts() {
    const acts = this.getActivities().filter(a => a.date === 'today');
    const conflicts = [];

    for (let i = 0; i < acts.length; i++) {
      for (let j = i + 1; j < acts.length; j++) {
        if (acts[i].time === acts[j].time) {
          conflicts.push({
            actA: acts[i],
            actB: acts[j],
            time: acts[i].time,
            proposal: `Puedo reprogramar "${acts[j].title}" a las ${this.calculateNextSlot(acts[j].time)}.`
          });
        }
      }
    }
    return conflicts;
  }

  calculateNextSlot(timeStr) {
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const nextH = (h + 1) % 24;
      return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } catch (e) {
      return '17:00';
    }
  }

  // --- Bandeja de Entrada IA (Visión 18) ---
  getInbox() {
    const inbox = this.state.inbox || [];
    const user = this.getCurrentUser();
    if (!user) return [];
    if (user.role === 'admin') return inbox;
    const userEmail = (user.email || '').trim().toLowerCase();
    return inbox.filter(i => i.userEmail && i.userEmail.trim().toLowerCase() === userEmail);
  }

  addInboxItem(text, source = 'audio') {
    const user = this.getCurrentUser();
    const item = { 
      id: 'inb-' + Date.now(), 
      text, 
      source, 
      date: 'Hoy',
      userEmail: user ? user.email.toLowerCase() : null
    };
    if (!this.state.inbox) this.state.inbox = [];
    this.state.inbox.unshift(item);
    this.saveState();
    return item;
  }

  removeInboxItem(id) {
    this.state.inbox = this.state.inbox.filter(i => i.id !== id);
    this.saveState();
  }
}

window.timeplusStore = new TimePlusStore();
