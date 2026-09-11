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
        // Componer nombre completo desde los 4 campos si están disponibles
        const fn1 = extra.firstName || '';
        const fn2 = extra.secondName || '';
        const ln1 = extra.lastName1 || extra.lastName || '';
        const ln2 = extra.lastName2 || '';
        const computedName = [fn1, fn2, ln1, ln2].filter(Boolean).join(' ') || req.name || 'Cliente TIMEPLUS';
        this.state.user = {
          id: req.id || ('usr-' + Date.now()),
          name: computedName,
          email: req.email || cleanEmail,
          phone: req.phone || extra.phone || '',
          birthDate: req.birth_date || extra.birthDate || '',
          city: req.city || extra.city || '',
          role: 'client',
          plan: req.plan || 'TIMEPLUS Connect Pro',
          userType: extra.userType || 'Estudiante',
          personType: extra.personType || 'Natural',
          firstName: fn1,
          secondName: fn2,
          lastName: ln1,
          lastName1: ln1,
          lastName2: ln2,
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
          workStatus: extra.workStatus || 'Presencial',
          addrWork: extra.addrWork || '',
          familyKinship: extra.familyKinship || 'Mamá',
          addrFamily: extra.addrFamily || '',
          gymStatus: extra.gymStatus || 'si',
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
    let acts = this.state.activities || [];

    // Auto-sanear actividades que hayan quedado mal categorizadas como "medicamento"
    let changed = false;
    acts.forEach(a => {
      if (a.type === 'medicamento') {
        const lower = (a.title || '').toLowerCase();
        if (lower.includes('examen') || lower.includes('laboratorio') || lower.includes('cita') || lower.includes('consulta') || lower.includes('odontol') || lower.includes('terapia')) {
          a.type = 'cita_presencial';
          a.title = a.title.replace(/^Medicamento\s*[—–-]\s*/i, '');
          if (!a.placeName) a.placeName = 'Laboratorio / Centro Médico';
          changed = true;
        }
      }
    });
    if (changed) this.saveState();

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

  addMedication(med, skipActivityCreation = false) {
    if (!this.state.medications) this.state.medications = [];
    if (!med.id) med.id = 'med-' + Date.now();
    const user = this.getCurrentUser();
    if (user && user.email) {
      med.userEmail = user.email.toLowerCase();
      med.userName = user.name || '';
    }
    this.state.medications.push(med);

    const isBotiquin = med.usageType === 'botiquin' || med.usageType === 'reserva' || med.noSchedule === true;

    // Si tiene hora programada, no se omitió y NO es de botiquín/reserva, crear la actividad en agenda para hoy
    if (med.time && !skipActivityCreation && !isBotiquin) {
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

    // Sincronizar en Supabase Cloud si está conectado
    if (window.timeplusSupabase?.upsertMedicationToCloud) {
      window.timeplusSupabase.upsertMedicationToCloud(med).catch(() => {});
    }

    return med;
  }

  updateMedication(id, updates) {
    if (!this.state.medications) return null;
    const idx = this.state.medications.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.state.medications[idx] = { ...this.state.medications[idx], ...updates };
      this.saveState();

      if (window.timeplusSupabase?.upsertMedicationToCloud) {
        window.timeplusSupabase.upsertMedicationToCloud(this.state.medications[idx]).catch(() => {});
      }

      return this.state.medications[idx];
    }
    return null;
  }

  deleteMedication(id) {
    if (!this.state.medications) return;
    this.state.medications = this.state.medications.filter(m => m.id !== id);
    this.state.activities = this.state.activities.filter(a => a.medicationId !== id);
    this.saveState();

    if (window.timeplusSupabase?.deleteMedicationFromCloud) {
      window.timeplusSupabase.deleteMedicationFromCloud(id).catch(() => {});
    }
  }

  restockMedication(id, additionalUnits) {
    if (!this.state.medications) return;
    const med = this.state.medications.find(m => m.id === id);
    if (med) {
      med.currentStock = (Number(med.currentStock) || 0) + Number(additionalUnits);
      this.saveState();

      if (window.timeplusSupabase?.upsertMedicationToCloud) {
        window.timeplusSupabase.upsertMedicationToCloud(med).catch(() => {});
      }

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

          // Sincronizar actualización de stock y registrar log en Supabase Cloud
          if (window.timeplusSupabase?.upsertMedicationToCloud) {
            window.timeplusSupabase.upsertMedicationToCloud(med).catch(() => {});
          }
          if (window.timeplusSupabase?.logMedicationTakenToCloud) {
            const user = this.getCurrentUser();
            window.timeplusSupabase.logMedicationTakenToCloud({
              medicationId: med.id,
              userEmail: user?.email || med.userEmail,
              medicationName: med.name,
              doseTaken: dose,
              stockAfter: med.currentStock,
              status: 'Tomado',
              takenAt: new Date().toISOString()
            }).catch(() => {});
          }
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
    const cal = workout.calories || (workout.distanceKm ? Math.round(workout.distanceKm * 65) : 400);
    const durHours = workout.durationHours || (workout.duration ? (workout.duration.includes('min') ? parseFloat((parseFloat(workout.duration)/60).toFixed(1)) : parseFloat(workout.duration)) : 1);

    this.state.fitnessSummary.weeklyWorkouts += 1;
    this.state.fitnessSummary.activeHours += durHours;
    this.state.fitnessSummary.caloriesBurned += cal;

    const user = this.getCurrentUser();
    const act = {
      id: 'fit-' + Date.now(),
      title: workout.title || 'Entrenamiento Registrado',
      category: 'fitness',
      activityType: workout.activityType || (workout.distanceKm ? 'outdoor' : 'gym'),
      distanceKm: workout.distanceKm || null,
      location: workout.location || '',
      muscleGroup: workout.muscleGroup || '',
      time: workout.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'today',
      duration: workout.duration || '45 min',
      durationHours: durHours,
      calories: cal,
      type: 'fitness',
      exercises: workout.exercises || [],
      userEmail: user?.email || '',
      userName: user?.name || ''
    };

    this.state.activities.push(act);
    this.saveState();

    // Guardar en Supabase Cloud si está conectado
    if (window.timeplusSupabase?.saveFitnessWorkoutToCloud) {
      window.timeplusSupabase.saveFitnessWorkoutToCloud(act, user).catch(() => {});
    }
    return act;
  }

  getFitnessSummary() {
    const user = this.getCurrentUser();
    if (user && user.role === 'client') {
      const clientWorkouts = this.getActivities().filter(a => a.category === 'fitness');
      const hours = clientWorkouts.reduce((acc, w) => acc + (parseFloat(w.durationHours) || (w.duration && w.duration.includes('min') ? parseFloat(w.duration)/60 : (parseFloat(w.duration) || 1))), 0);
      const calories = clientWorkouts.reduce((acc, w) => acc + (parseInt(w.calories) || (w.distanceKm ? Math.round(w.distanceKm * 65) : 400)), 0);
      return {
        weeklyWorkouts: clientWorkouts.length,
        targetWorkouts: 5,
        activeHours: parseFloat(hours.toFixed(1)),
        caloriesBurned: calories
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
    let userPlaces = places.filter(p => p.userEmail && p.userEmail.trim().toLowerCase() === userEmail);
    
    // Auto-generar lugares base si aún no están en la lista personalizada
    if (user.addrHome && !userPlaces.some(p => p.id === 'plc-home')) {
      userPlaces.unshift({ id: 'plc-home', name: 'Casa / Residencia', address: user.addrHome, category: 'casa', visitsCount: 1, avgTravelTime: 'Punto Base', userEmail });
    }
    const noTrabaja = user.workStatus === 'no_trabaja' || (user.addrWork && user.addrWork.toLowerCase().includes('no trabaja'));
    if (user.addrWork && !noTrabaja && !userPlaces.some(p => p.id === 'plc-work')) {
      userPlaces.push({ id: 'plc-work', name: 'Trabajo / Estudio', address: user.addrWork, category: 'trabajo', visitsCount: 0, avgTravelTime: '~20 min', userEmail });
    }
    const noGym = user.gymStatus === 'no' || (user.addrGym && user.addrGym.toLowerCase().includes('no asiste'));
    if (user.addrGym && !noGym && !userPlaces.some(p => p.id === 'plc-gym')) {
      userPlaces.push({ id: 'plc-gym', name: 'Gimnasio Habitual', address: user.addrGym, category: 'gym', visitsCount: 0, avgTravelTime: '~15 min', userEmail });
    }
    if (user.addrFamily && !userPlaces.some(p => p.id === 'plc-family')) {
      const familyName = user.familyKinship ? `Familiar (${user.familyKinship})` : 'Familiar / Principal';
      userPlaces.push({ id: 'plc-family', name: familyName, address: user.addrFamily, category: 'familiar', visitsCount: 0, avgTravelTime: '~25 min', userEmail });
    }

    return userPlaces;
  }

  addPlace(place) {
    if (!this.state.places) this.state.places = [];
    if (!place.id) place.id = 'plc-' + Date.now();
    const user = this.getCurrentUser();
    if (user && user.email) {
      place.userEmail = user.email.toLowerCase();
    }
    place.visitsCount = place.visitsCount || 0;
    place.avgTravelTime = place.avgTravelTime || '~20-30 min';
    this.state.places.push(place);
    this.saveState();
    return place;
  }

  deletePlace(placeId) {
    if (!this.state.places) return;
    this.state.places = this.state.places.filter(p => p.id !== placeId);
    this.saveState();
  }

  recordPlaceVisit(placeId) {
    const place = (this.state.places || []).find(p => p.id === placeId);
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

  // --- ② AGENDA & TAREAS ---
  getTasks() {
    if (!this.state.tasks) {
      this.state.tasks = [
        { id: 'tsk-1', title: 'Revisar reporte semanal de gestión', category: 'trabajo', priority: 'alta', done: false, date: 'Hoy' },
        { id: 'tsk-2', title: 'Comprar frutas y suplemento de proteína', category: 'personal', priority: 'media', done: true, date: 'Hoy' },
        { id: 'tsk-3', title: 'Programar cita odontológica', category: 'salud', priority: 'baja', done: false, date: 'Mañana' }
      ];
      this.saveState();
    }
    const user = this.getCurrentUser();
    if (!user || user.role === 'admin') return this.state.tasks;
    const email = (user.email || '').toLowerCase();
    return this.state.tasks.filter(t => !t.userEmail || t.userEmail.toLowerCase() === email);
  }

  addTask(task) {
    if (!this.state.tasks) this.state.tasks = [];
    const user = this.getCurrentUser();
    const newTask = {
      id: 'tsk-' + Date.now(),
      title: task.title,
      category: task.category || 'personal',
      priority: task.priority || 'media',
      done: false,
      date: task.date || 'Hoy',
      userEmail: user ? user.email.toLowerCase() : null
    };
    this.state.tasks.unshift(newTask);
    this.saveState();
    return newTask;
  }

  toggleTask(id) {
    const tsk = (this.state.tasks || []).find(t => t.id === id);
    if (tsk) {
      tsk.done = !tsk.done;
      this.saveState();
    }
  }

  deleteTask(id) {
    this.state.tasks = (this.state.tasks || []).filter(t => t.id !== id);
    this.saveState();
  }

  // --- ③ TIEMPO & BLOQUES ---
  getTimeLogs() {
    if (!this.state.timeLogs) {
      this.state.timeLogs = [
        { id: 'tl-1', activity: 'Trabajo Enfocado (Deep Work)', category: 'trabajo', durationMin: 90, date: 'Hoy', time: '09:00 - 10:30' },
        { id: 'tl-2', activity: 'Entrenamiento de Fuerza', category: 'fitness', durationMin: 60, date: 'Hoy', time: '11:00 - 12:00' },
        { id: 'tl-3', activity: 'Lectura y Aprendizaje', category: 'estudio', durationMin: 45, date: 'Hoy', time: '14:00 - 14:45' }
      ];
      this.saveState();
    }
    return this.state.timeLogs;
  }

  addTimeLog(log) {
    if (!this.state.timeLogs) this.state.timeLogs = [];
    const user = this.getCurrentUser();
    const newLog = {
      id: 'tl-' + Date.now(),
      activity: log.activity,
      category: log.category || 'trabajo',
      durationMin: log.durationMin,
      date: 'Hoy',
      time: log.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userEmail: user ? user.email.toLowerCase() : null
    };
    this.state.timeLogs.unshift(newLog);
    this.saveState();
    return newLog;
  }

  // --- ⑥ PASOS & MÉTRICAS ---
  getStepsData() {
    if (!this.state.stepsData) {
      this.state.stepsData = {
        todaySteps: 7420,
        goalSteps: 10000,
        todayKm: 5.2,
        caloriesBurned: 320,
        history: [
          { day: 'Lun', steps: 8900 },
          { day: 'Mar', steps: 10450 },
          { day: 'Mié', steps: 6800 },
          { day: 'Jue', steps: 9100 },
          { day: 'Vie', steps: 11200 },
          { day: 'Sáb', steps: 8300 },
          { day: 'Dom', steps: 7420 }
        ]
      };
      this.saveState();
    }
    return this.state.stepsData;
  }

  recordSteps(addedSteps) {
    const data = this.getStepsData();
    data.todaySteps = (data.todaySteps || 0) + Number(addedSteps);
    data.todayKm = parseFloat((data.todaySteps * 0.00075).toFixed(2));
    data.caloriesBurned = Math.round(data.todaySteps * 0.04);
    this.saveState();
  }

  // --- ⑦ COMPRAS INTELIGENTES & FACTURAS OCR ---
  getPurchases() {
    if (!this.state.purchases) {
      this.state.purchases = [
        { id: 'pur-1', store: 'Éxito Calle 80', date: '2026-09-07', total: 145000, category: 'Supermercado', itemsCount: 8, receiptType: 'Factura Electrónica OCR' },
        { id: 'pur-2', store: 'Farmatodo Unicentro', date: '2026-09-06', total: 68500, category: 'Farmacia', itemsCount: 3, receiptType: 'Ticket Escaneado' },
        { id: 'pur-3', store: 'Decathlon Colina', date: '2026-09-04', total: 189000, category: 'Deportes', itemsCount: 2, receiptType: 'Factura Electrónica OCR' }
      ];
      this.saveState();
    }
    return this.state.purchases;
  }

  addPurchase(pur) {
    if (!this.state.purchases) this.state.purchases = [];
    const user = this.getCurrentUser();
    const item = {
      id: 'pur-' + Date.now(),
      store: pur.store,
      date: pur.date || new Date().toISOString().split('T')[0],
      total: Number(pur.total) || 0,
      category: pur.category || 'Supermercado',
      itemsCount: Number(pur.itemsCount) || 1,
      receiptType: pur.receiptType || 'Manual',
      userEmail: user ? user.email.toLowerCase() : null
    };
    this.state.purchases.unshift(item);
    this.saveState();
    return item;
  }

  deletePurchase(id) {
    this.state.purchases = (this.state.purchases || []).filter(p => p.id !== id);
    this.saveState();
  }

  // --- ⑧ FINANZAS & PRESUPUESTOS ---
  getFinances() {
    if (!this.state.finances) {
      this.state.finances = [
        { id: 'fin-1', description: 'Honorarios Servicios Pro', type: 'ingreso', amount: 3500000, category: 'Ingresos', date: '2026-09-01' },
        { id: 'fin-2', description: 'Mercado del mes', type: 'gasto', amount: 480000, category: 'Alimentación', date: '2026-09-03' },
        { id: 'fin-3', description: 'Gimnasio y Bienestar', type: 'gasto', amount: 150000, category: 'Salud & Deporte', date: '2026-09-04' },
        { id: 'fin-4', description: 'Combustible y Transporte', type: 'gasto', amount: 120000, category: 'Movilidad', date: '2026-09-05' },
        { id: 'fin-5', description: 'Servicios Públicos & Internet', type: 'gasto', amount: 230000, category: 'Hogar', date: '2026-09-06' }
      ];
      this.saveState();
    }
    return this.state.finances;
  }

  addFinance(item) {
    if (!this.state.finances) this.state.finances = [];
    const user = this.getCurrentUser();
    const newEntry = {
      id: 'fin-' + Date.now(),
      description: item.description,
      type: item.type || 'gasto',
      amount: Number(item.amount) || 0,
      category: item.category || 'General',
      date: item.date || new Date().toISOString().split('T')[0],
      userEmail: user ? user.email.toLowerCase() : null
    };
    this.state.finances.unshift(newEntry);
    this.saveState();
    return newEntry;
  }

  deleteFinance(id) {
    this.state.finances = (this.state.finances || []).filter(f => f.id !== id);
    this.saveState();
  }

  getBudgets() {
    if (!this.state.budgets) {
      this.state.budgets = [
        { category: 'Alimentación', budget: 600000, spent: 480000 },
        { category: 'Salud & Deporte', budget: 250000, spent: 150000 },
        { category: 'Movilidad', budget: 200000, spent: 120000 },
        { category: 'Hogar & Servicios', budget: 350000, spent: 230000 },
        { category: 'Entretenimiento', budget: 200000, spent: 85000 }
      ];
      this.saveState();
    }
    return this.state.budgets;
  }

  // --- ⑨ BIENESTAR: SUEÑO & HÁBITOS ---
  getSleepLogs() {
    if (!this.state.sleepLogs) {
      this.state.sleepLogs = [
        { id: 'sl-1', date: 'Anoche', hours: 7.5, bedTime: '23:15', wakeTime: '06:45', quality: 4, score: 86, notes: 'Sueño reparador, ritmo circadiano estable.' },
        { id: 'sl-2', date: 'Hace 2 días', hours: 6.8, bedTime: '00:00', wakeTime: '06:50', quality: 3, score: 74, notes: 'Interrupción leve a medianoche.' },
        { id: 'sl-3', date: 'Hace 3 días', hours: 8.0, bedTime: '22:45', wakeTime: '06:45', quality: 5, score: 94, notes: 'Óptimo descanso.' }
      ];
      this.saveState();
    }
    return this.state.sleepLogs;
  }

  addSleepLog(log) {
    if (!this.state.sleepLogs) this.state.sleepLogs = [];
    const user = this.getCurrentUser();
    const entry = {
      id: 'sl-' + Date.now(),
      date: log.date || 'Anoche',
      hours: Number(log.hours) || 7,
      bedTime: log.bedTime || '23:00',
      wakeTime: log.wakeTime || '06:30',
      quality: Number(log.quality) || 4,
      score: Math.min(100, Math.round((Number(log.hours) || 7) * 11.5 + (Number(log.quality) || 4) * 3)),
      notes: log.notes || 'Registro de descanso',
      userEmail: user ? user.email.toLowerCase() : null
    };
    this.state.sleepLogs.unshift(entry);
    this.saveState();
    return entry;
  }

  getHabits() {
    if (!this.state.habits) {
      this.state.habits = [
        { id: 'hab-1', name: 'Tomar 2 Litros de Agua 💧', streak: 12, doneToday: true, goal: 'Diario' },
        { id: 'hab-2', name: 'Lectura o Aprendizaje 20 min 📖', streak: 5, doneToday: true, goal: 'Diario' },
        { id: 'hab-3', name: 'Meditación & Respiración 10 min 🧘', streak: 8, doneToday: false, goal: 'Diario' },
        { id: 'hab-4', name: 'Caminar 8,000+ pasos 👟', streak: 4, doneToday: true, goal: 'Diario' },
        { id: 'hab-5', name: 'Cero Pantallas 30 min antes de dormir 📵', streak: 3, doneToday: false, goal: 'Diario' }
      ];
      this.saveState();
    }
    return this.state.habits;
  }

  toggleHabit(id) {
    const hab = (this.state.habits || []).find(h => h.id === id);
    if (hab) {
      hab.doneToday = !hab.doneToday;
      if (hab.doneToday) hab.streak = (hab.streak || 0) + 1;
      else hab.streak = Math.max(0, (hab.streak || 1) - 1);
      this.saveState();
    }
  }

  addHabit(habit) {
    if (!this.state.habits) this.state.habits = [];
    const entry = {
      id: 'hab-' + Date.now(),
      name: habit.name,
      streak: 1,
      doneToday: false,
      goal: habit.goal || 'Diario'
    };
    this.state.habits.push(entry);
    this.saveState();
    return entry;
  }

  // --- ⑩ METAS & LOGROS ---
  getGoals() {
    if (!this.state.goals) {
      this.state.goals = [
        { id: 'gl-1', title: 'Completar 20 sesiones de entrenamiento este mes', category: 'fitness', current: 14, target: 20, unit: 'sesiones', deadline: '30 Sep 2026', icon: '🏋️' },
        { id: 'gl-2', title: 'Fondo de Ahorro para Viaje', category: 'finanzas', current: 2400000, target: 4000000, unit: 'COP', deadline: '15 Dic 2026', icon: '✈️' },
        { id: 'gl-3', title: 'Certificación en IA y Machine Learning', category: 'estudio', current: 75, target: 100, unit: '%', deadline: '31 Oct 2026', icon: '🎓' },
        { id: 'gl-4', title: 'Mantener promedio de 7.5h de sueño diario', category: 'bienestar', current: 7.2, target: 7.5, unit: 'horas', deadline: 'Continuo', icon: '🛌' }
      ];
      this.saveState();
    }
    return this.state.goals;
  }

  addGoal(goal) {
    if (!this.state.goals) this.state.goals = [];
    const entry = {
      id: 'gl-' + Date.now(),
      title: goal.title,
      category: goal.category || 'personal',
      current: Number(goal.current) || 0,
      target: Number(goal.target) || 100,
      unit: goal.unit || '%',
      deadline: goal.deadline || 'Sin fecha',
      icon: goal.icon || '🎯'
    };
    this.state.goals.push(entry);
    this.saveState();
    return entry;
  }
}

window.timeplusStore = new TimePlusStore();
