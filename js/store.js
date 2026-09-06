// TIMEPLUS — Centralized Reactive Store with LocalStorage Persistence

const STORAGE_KEY = 'TIMEPLUS_DATA_V1';

// Initial sample data replicating the exact vision of TIMEPLUS
const INITIAL_DATA = {
  auth: {
    currentUser: null, // Starts at Login screen!
    accounts: [
      {
        id: 'user-admin',
        email: 'ces.rodriguez200@gmail.com',
        password: '16278465',
        role: 'admin',
        roleTitle: '1. Quien maneja todo',
        roleLabel: 'Super Administrador del Sistema',
        name: 'César Rodríguez (Superadmin)',
        plan: 'Control Total & Gestión de Licencias',
        avatar: '👑'
      }
    ],
    clientsList: [],
    clientRequests: [],
    clientRequestsPurgedV4: true,
    adminStats: {
      totalClients: 1420,
      activeLicenses: '98.4%',
      totalMonthlyRevenue: '$14,200 USD',
      globalPlacesConnected: 8650,
      globalIAQueriesToday: 3840
    }
  },
  user: {
    name: 'Rafael',
    greeting: 'Buenos días',
    dateFormatted: 'Viernes, 4 de septiembre',
    currentTime: '2026-09-04T08:00:00'
  },
  places: [
    {
      id: 'place-oficina',
      name: 'Oficina Central',
      shortName: 'Oficina',
      icon: '🏢',
      address: 'Av. Empresarial 100, Piso 5',
      coords: '4.6782,-74.0578',
      isFavorite: true,
      visitsCount: 43,
      historySummary: {
        reuniones: 31,
        entregas: 5,
        capacitaciones: 7
      },
      lastVisit: '3 de septiembre 2026',
      nextVisit: '7 de septiembre 2026'
    },
    {
      id: 'place-clinica',
      name: 'Clínica Sanitas & Especialistas',
      shortName: 'Clínica',
      icon: '🏥',
      address: 'Calle 127 # 21-40',
      coords: '4.7042,-74.0450',
      isFavorite: true,
      visitsCount: 18,
      historySummary: {
        citas: 12,
        reuniones: 4,
        actividades: 2
      },
      lastVisit: '3 septiembre 2026',
      nextVisit: '15 septiembre 2026'
    },
    {
      id: 'place-universidad',
      name: 'Universidad del Rosario',
      shortName: 'Universidad',
      icon: '🎓',
      address: 'Cra. 6 # 15-18, Claustro Principal',
      coords: '4.6015,-74.0721',
      isFavorite: true,
      visitsCount: 86,
      historySummary: {
        clases: 72,
        examenes: 8,
        entregas: 6
      },
      lastVisit: '2 de septiembre 2026',
      nextVisit: '4 de septiembre 2026'
    },
    {
      id: 'place-restaurante',
      name: 'Restaurante & Café Bistro',
      shortName: 'Restaurante',
      icon: '🍽️',
      address: 'Zona G, Cra. 5 # 69-26',
      coords: '4.6540,-74.0550',
      isFavorite: true,
      visitsCount: 12,
      historySummary: {
        salidas: 8,
        reuniones: 4
      },
      lastVisit: '28 de agosto 2026',
      nextVisit: '4 de septiembre 2026'
    }
  ],
  activities: [
    {
      id: 'act-1',
      title: 'Medicamento matutino',
      category: 'medicamento',
      categoryLabel: 'Medicamento',
      icon: '💊',
      date: '2026-09-04',
      time: '08:00',
      displayTime: '08:00',
      completed: true,
      placeId: null,
      placeName: 'Casa',
      responsible: 'Yo',
      details: 'Tomar pastilla con agua después del desayuno.',
      checklist: [],
      reminders: ['A la hora del evento'],
      attachments: []
    },
    {
      id: 'act-2',
      title: 'Reunión virtual equipo producto',
      category: 'reunion_virtual',
      categoryLabel: 'Reunión virtual',
      icon: '💻',
      date: '2026-09-04',
      time: '09:30',
      displayTime: '09:30',
      completed: false,
      placeId: 'place-oficina',
      placeName: 'Oficina Central (Remoto/Híbrido)',
      responsible: 'Equipo de Desarrollo',
      details: 'Sincronización semanal sobre avances del MVP TIMEPLUS.',
      link: 'https://meet.google.com/xyz-timeplus',
      checklist: [
        { id: 'chk-r1', text: 'Revisar métricas de sprint', done: true },
        { id: 'chk-r2', text: 'Definir prioridades de lanzamiento', done: false }
      ],
      reminders: ['15 minutos antes'],
      attachments: []
    },
    {
      id: 'act-3',
      title: 'Cita médica control general',
      category: 'cita_medica',
      categoryLabel: 'Cita médica',
      icon: '🩺',
      date: '2026-09-04',
      time: '11:00',
      displayTime: '11:00',
      completed: false,
      placeId: 'place-clinica',
      placeName: 'Clínica Sanitas',
      responsible: 'Dr. Alejandro Martínez',
      details: 'Revisión semestral y lectura de exámenes de laboratorio.',
      checklist: [
        { id: 'chk-c1', text: 'Llevar carnet y documento', done: true },
        { id: 'chk-c2', text: 'Llevar resultados de laboratorio', done: false }
      ],
      reminders: ['1 día antes', '2 horas antes'],
      attachments: ['orden_medica.pdf']
    },
    {
      id: 'act-4',
      title: 'Clase de Inteligencia Artificial',
      category: 'clase',
      categoryLabel: 'Clase',
      icon: '🎓',
      date: '2026-09-04',
      time: '14:00',
      displayTime: '14:00',
      completed: false,
      placeId: 'place-universidad',
      placeName: 'Universidad del Rosario',
      responsible: 'Prof. Santiago Valencia',
      details: 'Módulo de Agentes Inteligentes y Modelos de Razonamiento.',
      checklist: [
        { id: 'chk-cl1', text: 'Leer paper de investigación', done: true }
      ],
      reminders: ['30 minutos antes'],
      attachments: ['guia_agentes_ia.pdf']
    },
    {
      id: 'act-5',
      title: 'Entrega informe de auditoría',
      category: 'entrega_trabajo',
      categoryLabel: 'Entrega informe',
      icon: '📄',
      date: '2026-09-04',
      time: '16:00',
      displayTime: '16:00',
      completed: false,
      placeId: 'place-oficina',
      placeName: 'Oficina Central',
      responsible: 'Yo',
      statusLabel: 'En proceso',
      statusColor: 'yellow',
      details: 'Informe financiero y auditoría de procesos del tercer trimestre.',
      checklist: [
        { id: 'chk-1', text: 'Investigar', done: true },
        { id: 'chk-2', text: 'Elaborar', done: true },
        { id: 'chk-3', text: 'Revisar', done: false },
        { id: 'chk-4', text: 'Entregar', done: false }
      ],
      reminders: [
        '3 días antes',
        '1 día antes',
        '1 hora antes'
      ],
      attachments: ['informe_auditoria_v3.pdf', 'anexo_financiero.xlsx']
    },
    {
      id: 'act-6',
      title: 'Salida a cenar con amigos',
      category: 'salida',
      categoryLabel: 'Salida',
      icon: '🍽️',
      date: '2026-09-04',
      time: '19:00',
      displayTime: '19:00',
      completed: false,
      placeId: 'place-restaurante',
      placeName: 'Restaurante & Café Bistro',
      responsible: 'Amigos de la universidad',
      details: 'Celebración y cena casual en la terraza.',
      checklist: [
        { id: 'chk-s1', text: 'Confirmar reserva de mesa', done: true }
      ],
      reminders: ['1 hora antes'],
      attachments: []
    },
    // Future and connected activities
    {
      id: 'act-7',
      title: 'Entrega Informe de auditoría final',
      category: 'entrega_trabajo',
      categoryLabel: 'Entrega de trabajo',
      icon: '📄',
      date: '2026-09-10',
      time: '17:00',
      displayTime: '5:00 p. m.',
      completed: false,
      placeId: 'place-oficina',
      placeName: 'Oficina Central',
      responsible: 'Yo',
      statusLabel: 'En proceso',
      statusColor: 'yellow',
      details: 'Versión final consolidada con firmas de junta directiva.',
      checklist: [
        { id: 'chk-7-1', text: 'Investigar', done: true },
        { id: 'chk-7-2', text: 'Elaborar', done: true },
        { id: 'chk-7-3', text: 'Revisar', done: false },
        { id: 'chk-7-4', text: 'Entregar', done: false }
      ],
      reminders: [
        '3 días antes',
        '1 día antes',
        '1 hora antes'
      ],
      attachments: ['informe_auditoria_final_draft.pdf']
    },
    {
      id: 'act-8',
      title: 'Cita con especialista cardiólogo',
      category: 'cita_medica',
      categoryLabel: 'Cita médica',
      icon: '🩺',
      date: '2026-09-15',
      time: '10:00',
      displayTime: '10:00 a. m.',
      completed: false,
      placeId: 'place-clinica',
      placeName: 'Clínica Sanitas',
      responsible: 'Dra. Patricia Silva',
      details: 'Seguimiento especializado y electrocardiógrafo.',
      checklist: [
        { id: 'chk-8-1', text: 'Ayuno de 8 horas', done: false }
      ],
      reminders: ['2 días antes', '1 día antes'],
      attachments: []
    }
  ],
  statsData: {
    month: 'Septiembre 2026',
    totalActivities: 147,
    breakdown: [
      { key: 'reunion', label: 'Reuniones', icon: '💻', count: 32, color: '#3B82F6' },
      { key: 'clase', label: 'Clases', icon: '🎓', count: 18, color: '#8B5CF6' },
      { key: 'entrega', label: 'Entregas', icon: '📄', count: 9, color: '#F59E0B' },
      { key: 'cita', label: 'Citas', icon: '🩺', count: 7, color: '#EF4444' },
      { key: 'evento', label: 'Eventos', icon: '🎉', count: 12, color: '#EC4899' },
      { key: 'salida', label: 'Salidas', icon: '🍽️', count: 15, color: '#10B981' },
      { key: 'informe', label: 'Informes', icon: '📑', count: 8, color: '#6366F1' },
      { key: 'recordatorio', label: 'Recordatorios', icon: '💊', count: 46, color: '#14B8A6' }
    ]
  }
};

class TimeplusStore {
  constructor() {
    this.data = this.loadData();
    this.listeners = [];

    // Sincronización en tiempo real entre pestañas: cuando otra pestaña
    // escribe al localStorage, recargar datos y notificar a todos los listeners.
    window.addEventListener('storage', (e) => {
      if ((e.key === STORAGE_KEY || e.key === 'TIMEPLUS_CLIENT_REQUESTS_BACKUP') && e.newValue) {
        try {
          this.reloadFromStorage();
        } catch (err) {
          console.warn('Error al sincronizar datos entre pestañas:', err);
        }
      }
    });

    // BroadcastChannel instantáneo entre pestañas
    try {
      if (window.BroadcastChannel) {
        this.bc = new BroadcastChannel('timeplus_requests_channel');
        this.bc.onmessage = (ev) => {
          if (ev.data && (ev.data.type === 'NEW_CLIENT_REQUEST' || ev.data.type === 'REQUEST_UPDATED')) {
            this.reloadFromStorage();
          }
        };
      }
    } catch (e) {}
  }

  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.auth) {
          parsed.auth = JSON.parse(JSON.stringify(INITIAL_DATA.auth));
        } else {
          if (parsed.auth.accounts) {
            const adminAcc = parsed.auth.accounts.find(a => a.role === 'admin');
            if (adminAcc) {
              adminAcc.email = 'ces.rodriguez200@gmail.com';
              adminAcc.password = '16278465';
              adminAcc.name = 'César Rodríguez (Superadmin)';
            }
          }
          // Purga automática solicitada por el usuario para dejar la lista de clientes en blanco
          if (parsed.auth.clientsPurgedV3 !== true) {
            parsed.auth.clientsList = [];
            if (parsed.auth.accounts) {
              parsed.auth.accounts = parsed.auth.accounts.filter(a => a.role === 'admin');
            }
            parsed.auth.clientsPurgedV3 = true;
          }
          // Purga V4: eliminar solicitudes de prueba hardcodeadas (req-1, req-2) de localStorage
          if (parsed.auth.clientRequestsPurgedV4 !== true) {
            if (parsed.auth.clientRequests) {
              parsed.auth.clientRequests = parsed.auth.clientRequests.filter(
                r => r.id !== 'req-1' && r.id !== 'req-2'
              );
            }
            parsed.auth.clientRequestsPurgedV4 = true;
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial data:', e);
    }
    this.saveData(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveData(data = this.data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.notify();
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.data); } catch (e) { console.error(e); }
    });
  }

  resetToDefaults() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveData();
  }

  // Fuerza recarga desde localStorage (útil para sincronizar entre pestañas)
  reloadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const currentUser = this.data.auth ? this.data.auth.currentUser : null;
        this.data = JSON.parse(stored);
        // Preservar sesión activa del usuario en esta pestaña
        if (currentUser && this.data.auth) {
          this.data.auth.currentUser = currentUser;
        }
        this.notify();
      }
    } catch (e) {
      console.warn('Error al recargar desde localStorage:', e);
    }
  }

  // --- Activity Actions ---
  getActivities(date = '2026-09-04') {
    if (!date) return this.data.activities;
    return this.data.activities.filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
  }

  getAllActivities() {
    return [...this.data.activities].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      return dateCmp !== 0 ? dateCmp : a.time.localeCompare(b.time);
    });
  }

  getActivityById(id) {
    return this.data.activities.find(a => a.id === id);
  }

  toggleActivityComplete(id) {
    const act = this.getActivityById(id);
    if (act) {
      act.completed = !act.completed;
      this.saveData();
    }
    return act;
  }

  addActivity(activity) {
    const newAct = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      completed: false,
      checklist: [],
      reminders: ['15 minutos antes'],
      attachments: [],
      ...activity
    };

    // If attached to a place, update visits or stats if applicable
    if (newAct.placeId) {
      const place = this.getPlaceById(newAct.placeId);
      if (place) {
        newAct.placeName = place.name;
        // recalculate next visit
        this.recalculatePlaceVisits(place.id);
      }
    }

    this.data.activities.push(newAct);
    this.saveData();
    return newAct;
  }

  updateActivity(id, updates) {
    const idx = this.data.activities.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.activities[idx] = { ...this.data.activities[idx], ...updates };
      this.saveData();
      return this.data.activities[idx];
    }
    return null;
  }

  deleteActivity(id) {
    this.data.activities = this.data.activities.filter(a => a.id !== id);
    this.saveData();
  }

  toggleChecklistItem(activityId, checkId) {
    const act = this.getActivityById(activityId);
    if (act && act.checklist) {
      const item = act.checklist.find(c => c.id === checkId);
      if (item) {
        item.done = !item.done;
        // Check if all items are done
        const allDone = act.checklist.length > 0 && act.checklist.every(c => c.done);
        if (allDone) {
          act.completed = true;
          act.statusLabel = 'Completado';
        } else {
          act.completed = false;
          act.statusLabel = 'En proceso';
        }
        this.saveData();
      }
    }
    return act;
  }

  addChecklistItem(activityId, text) {
    const act = this.getActivityById(activityId);
    if (act) {
      if (!act.checklist) act.checklist = [];
      act.checklist.push({
        id: 'chk-' + Date.now(),
        text,
        done: false
      });
      this.saveData();
    }
    return act;
  }

  // --- Place Actions ---
  getPlaces() {
    return this.data.places;
  }

  getPlaceById(id) {
    return this.data.places.find(p => p.id === id);
  }

  getPlaceHistory(placeId) {
    const place = this.getPlaceById(placeId);
    if (!place) return { place: null, activities: [], visitsCount: 0 };

    const activities = this.data.activities.filter(a => a.placeId === placeId);
    return {
      place,
      activities,
      visitsCount: place.visitsCount,
      lastVisit: place.lastVisit,
      nextVisit: place.nextVisit
    };
  }

  addPlace(place) {
    const newPlace = {
      id: 'place-' + Date.now(),
      visitsCount: 1,
      isFavorite: false,
      historySummary: {},
      lastVisit: 'Hoy',
      nextVisit: 'Por definir',
      ...place
    };
    this.data.places.push(newPlace);
    this.saveData();
    return newPlace;
  }

  recalculatePlaceVisits(placeId) {
    const place = this.getPlaceById(placeId);
    if (!place) return;
    const future = this.data.activities
      .filter(a => a.placeId === placeId && a.date >= '2026-09-04' && !a.completed)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (future.length > 0) {
      const nextDate = new Date(future[0].date + 'T00:00:00');
      place.nextVisit = `${nextDate.getDate()} de septiembre 2026`;
    }
  }

  // --- Statistics ---
  getStats(period = 'MES') {
    // Return formatted stats for HOY, SEMANA, MES, AÑO
    const baseBreakdown = this.data.statsData.breakdown;
    let multiplier = 1;
    let label = 'Septiembre 2026';

    if (period === 'HOY') {
      multiplier = 0.05;
      label = 'Viernes, 4 de septiembre';
    } else if (period === 'SEMANA') {
      multiplier = 0.25;
      label = 'Semana 36 (31 Ago - 6 Sep)';
    } else if (period === 'AÑO') {
      multiplier = 8.5;
      label = 'Año 2026';
    }

    const calculated = baseBreakdown.map(item => ({
      ...item,
      count: Math.max(1, Math.round(item.count * multiplier))
    }));

    const total = calculated.reduce((sum, item) => sum + item.count, 0);

    return {
      period,
      label,
      total,
      breakdown: calculated
    };
  }

  // --- Authentication & Multi-Role System ---
  getCurrentUser() {
    return (this.data.auth && this.data.auth.currentUser) ? this.data.auth.currentUser : null;
  }

  getAccounts() {
    return (this.data.auth && this.data.auth.accounts) ? this.data.auth.accounts : [];
  }

  getClientsList() {
    return (this.data.auth && this.data.auth.clientsList) ? this.data.auth.clientsList : [];
  }

  getAdminStats() {
    return (this.data.auth && this.data.auth.adminStats) ? this.data.auth.adminStats : null;
  }

  login(emailOrRole, password = '') {
    if (!this.data.auth) return null;
    // 1. Buscar en accounts (SuperAdmin)
    let account = this.data.auth.accounts ? this.data.auth.accounts.find(
      a => a.role === emailOrRole || (a.email && a.email.toLowerCase() === emailOrRole.toLowerCase())
    ) : null;

    // 2. Si no se encuentra en accounts, buscar en clientes aprobados
    if (!account && this.data.auth.clientsList) {
      const client = this.data.auth.clientsList.find(
        c => (c.email && c.email.toLowerCase() === emailOrRole.toLowerCase()) || emailOrRole === 'client'
      );
      if (client) {
        account = {
          id: client.id,
          email: client.email,
          role: 'client',
          roleTitle: '2. Quien adquiere la app',
          roleLabel: 'Cliente / Suscriptor Activo',
          name: client.name,
          plan: client.plan,
          avatar: '👤'
        };
      }
    }

    if (account) {
      this.data.auth.currentUser = { ...account };
      this.saveData();
      return account;
    }
    return null;
  }

  logout() {
    if (this.data.auth) {
      this.data.auth.currentUser = null;
      this.saveData();
    }
  }

  switchRole(targetRole) {
    return this.login(targetRole);
  }

  _syncRequestsBackup() {
    try {
      localStorage.setItem('TIMEPLUS_CLIENT_REQUESTS_BACKUP', JSON.stringify(this.data.auth.clientRequests || []));
    } catch (e) {
      console.warn('Error syncing backup:', e);
    }
  }

  // Solicitudes de nuevos clientes (Google / Outlook / Email) pendientes de aprobación
  getClientRequests() {
    if (!this.data.auth) this.data.auth = {};
    if (!this.data.auth.clientRequests) {
      this.data.auth.clientRequests = [];
    }

    // Recuperar e integrar cualquier solicitud guardada en el backup redundante
    try {
      const rawBackup = localStorage.getItem('TIMEPLUS_CLIENT_REQUESTS_BACKUP');
      if (rawBackup) {
        const backup = JSON.parse(rawBackup);
        if (Array.isArray(backup) && backup.length > 0) {
          backup.forEach(bReq => {
            const index = this.data.auth.clientRequests.findIndex(r => r.id === bReq.id || (r.email && r.email.toLowerCase() === bReq.email.toLowerCase()));
            if (index === -1) {
              this.data.auth.clientRequests.unshift(bReq);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error leyendo backup de solicitudes:', e);
    }

    return this.data.auth.clientRequests;
  }

  addClientRequest(name, email, provider, plan, password = '') {
    const requests = this.getClientRequests();
    
    // Evitar duplicados pendientes exactos
    const existingIdx = requests.findIndex(r => r.email && r.email.toLowerCase() === (email || '').toLowerCase());
    const newReq = {
      id: 'req-' + Date.now(),
      name: name || email.split('@')[0],
      email: email,
      password: password,
      provider: provider || 'Google Workspace',
      plan: plan || 'TIMEPLUS Connect Pro',
      status: 'Pendiente',
      requestedAt: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (existingIdx !== -1) {
      requests[existingIdx] = newReq;
    } else {
      requests.unshift(newReq);
    }

    this.saveData();
    this._syncRequestsBackup();

    // Notificar instantáneamente a todas las pestañas vía BroadcastChannel
    try {
      if (window.BroadcastChannel) {
        const bc = new BroadcastChannel('timeplus_requests_channel');
        bc.postMessage({ type: 'NEW_CLIENT_REQUEST', request: newReq });
        bc.close();
      }
    } catch (e) {}

    return newReq;
  }

  approveClientRequest(reqId) {
    const req = this.getClientRequests().find(r => r.id === reqId);
    if (!req) return;
    req.status = 'Aprobado';

    // Agregar a la lista de clientes activos con su contraseña
    if (!this.data.auth.clientsList) this.data.auth.clientsList = [];
    const clientIdx = this.data.auth.clientsList.findIndex(c => c.email && c.email.toLowerCase() === req.email.toLowerCase());
    const clientData = {
      id: 'cli-' + Date.now(),
      name: req.name,
      email: req.email,
      password: req.password || '123456',
      plan: req.plan,
      status: 'Activo',
      acquiredDate: 'Hoy',
      activitiesCount: 0,
      placesCount: 0,
      iaQueriesCount: 0
    };

    if (clientIdx !== -1) {
      this.data.auth.clientsList[clientIdx] = clientData;
    } else {
      this.data.auth.clientsList.unshift(clientData);
    }

    this.saveData();
    this._syncRequestsBackup();

    try {
      if (window.BroadcastChannel) {
        const bc = new BroadcastChannel('timeplus_requests_channel');
        bc.postMessage({ type: 'REQUEST_UPDATED' });
        bc.close();
      }
    } catch (e) {}

    this.notify();
  }

  rejectClientRequest(reqId) {
    const req = this.getClientRequests().find(r => r.id === reqId);
    if (req) {
      req.status = 'Rechazado';
      this.saveData();
      this._syncRequestsBackup();

      try {
        if (window.BroadcastChannel) {
          const bc = new BroadcastChannel('timeplus_requests_channel');
          bc.postMessage({ type: 'REQUEST_UPDATED' });
          bc.close();
        }
      } catch (e) {}

      this.notify();
    }
  }

  deleteClient(emailOrId) {
    if (!this.data.auth || !this.data.auth.clientsList) return;
    const lower = (emailOrId || '').toLowerCase().trim();
    this.data.auth.clientsList = this.data.auth.clientsList.filter(
      c => c.id !== emailOrId && (c.email || '').toLowerCase().trim() !== lower
    );
    if (this.data.auth.accounts) {
      this.data.auth.accounts = this.data.auth.accounts.filter(
        a => (a.email || '').toLowerCase().trim() !== lower || a.role === 'admin'
      );
    }
    this.saveData();
    this.notify();
  }

  clearAllClients() {
    if (!this.data.auth) return;
    this.data.auth.clientsList = [];
    if (this.data.auth.accounts) {
      this.data.auth.accounts = this.data.auth.accounts.filter(a => a.role === 'admin');
    }
    this.saveData();
    this.notify();
  }
}

// Global singleton instance
window.timeplusStore = new TimeplusStore();
