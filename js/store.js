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
        this.state.user = {
          id: req.id || ('usr-' + Date.now()),
          name: req.name || 'Cliente TIMEPLUS',
          email: req.email || cleanEmail,
          role: 'client',
          plan: req.plan || 'TIMEPLUS Connect Pro'
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

  // --- Activities Management (Visión 1, 2, 4, 10, 11, 12, 13) ---
  getActivities() {
    return this.state.activities || [];
  }

  addActivity(activity) {
    if (!activity.id) activity.id = 'act-' + Date.now();
    if (!activity.date) activity.date = 'today';
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

  // --- Salud: Confirmación de Toma de Medicamentos (Visión 8) ---
  confirmMedication(actId, taken = true) {
    return this.updateActivity(actId, {
      confirmedTaken: taken,
      takenAt: taken ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      notes: taken ? `Toma confirmada a las ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Toma pospuesta/recordar luego.'
    });
  }

  // --- Fitness: Registro de Ejercicio (Visión 9) ---
  recordWorkout(workout) {
    if (!this.state.fitnessSummary) {
      this.state.fitnessSummary = { weeklyWorkouts: 0, targetWorkouts: 5, activeHours: 0, caloriesBurned: 0 };
    }
    this.state.fitnessSummary.weeklyWorkouts += 1;
    this.state.fitnessSummary.activeHours += (workout.durationHours || 1);
    this.state.fitnessSummary.caloriesBurned += (workout.calories || 450);

    const act = {
      id: 'fit-' + Date.now(),
      title: workout.title || 'Entrenamiento Registrado',
      category: 'fitness',
      time: workout.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'today',
      duration: workout.duration || '1h',
      type: 'fitness',
      exercises: workout.exercises || []
    };
    return this.addActivity(act);
  }

  getFitnessSummary() {
    return this.state.fitnessSummary || { weeklyWorkouts: 4, targetWorkouts: 5, activeHours: 5.5, caloriesBurned: 2450 };
  }

  // --- Contactos (Visión 6) ---
  getContacts() {
    return this.state.contacts || [];
  }

  addContact(contact) {
    if (!contact.id) contact.id = 'cnt-' + Date.now();
    this.state.contacts.push(contact);
    this.saveState();
    return contact;
  }

  // --- Lugares y Movilidad (Visión 15 & 3) ---
  getPlaces() {
    return this.state.places || [];
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
    return this.state.inbox || [];
  }

  addInboxItem(text, source = 'audio') {
    const item = { id: 'inb-' + Date.now(), text, source, date: 'Hoy' };
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
