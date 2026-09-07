// TIMEPLUS — Main Application Controller & View Router

document.addEventListener('DOMContentLoaded', () => {
  const store = window.timeplusStore;
  const ai = window.timeplusAI;

  // App State
  let currentView = 'home'; // 'home', 'agenda', 'places', 'stats'
  let agendaSubView = 'timeline'; // 'dia', 'semana', 'mes', 'año', 'timeline'
  let statsFilter = 'MES'; // 'HOY', 'SEMANA', 'MES', 'AÑO'
  let selectedPlaceId = null;
  let selectedActivityId = null;
  let _syncInProgress = false;
  let _calMonthOffset = 0;
  let _pairTimerInterval = null;

  // DOM Containers
  const viewLanding = document.getElementById('view-landing');
  const viewLogin = document.getElementById('view-login');
  const appShell = document.getElementById('app-shell');
  const viewHome = document.getElementById('view-home');
  const viewAgenda = document.getElementById('view-agenda');
  const viewPlaces = document.getElementById('view-places');
  const viewStats = document.getElementById('view-stats');
  const viewPlaceDetail = document.getElementById('view-place-detail');
  const viewActivityDetail = document.getElementById('view-activity-detail');
  const viewAdminDashboard = document.getElementById('view-admin-dashboard');
  const viewModules = document.getElementById('view-modules');
  const viewApk = document.getElementById('view-apk');
  const viewSecurity = document.getElementById('view-security');

  // Modals
  const modalCreateActivity = document.getElementById('modal-create-activity');
  const modalCreateForm = document.getElementById('modal-create-form');
  const modalAI = document.getElementById('modal-ai');
  const modalAuthSelector = document.getElementById('modal-auth-selector');
  const modalPairDevice = document.getElementById('modal-pair-device');

  // Navigation Items
  const navButtons = document.querySelectorAll('.nav-btn');

  function initApp() {
    renderCurrentView();
    setupEventListeners();
    setupStoreSubscription();
    setupSupabaseRealtime();
    updateClock();
    setInterval(updateClock, 30000);
  }

  function setupSupabaseRealtime() {
    if (window.timeplusSupabase && typeof window.timeplusSupabase.subscribeClientRequests === 'function') {
      window.timeplusSupabase.subscribeClientRequests(() => {
        const user = store.getCurrentUser();
        if (user && user.role === 'admin') {
          _syncInProgress = false;
          _syncRequestsFromCloud();
        }
      });
    }
  }

  function setupStoreSubscription() {
    store.subscribe(() => {
      renderCurrentView();
    });

    // Auto-polling cada 4s: si el SuperAdmin está en pantalla, sincronizar DIRECTAMENTE desde Supabase Cloud
    setInterval(() => {
      const user = store.getCurrentUser();
      if (user && user.role === 'admin') {
        _syncInProgress = false;
        _syncRequestsFromCloud();
      }
    }, 4000);
  }

  function updateClock() {
    const timeEl = document.getElementById('status-bar-time');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  }

  // --- View Switcher ---
  function navigateTo(viewName, param = null) {
    const currentUser = store.getCurrentUser();
    if (!currentUser) {
      currentView = 'login';
      renderCurrentView();
      return;
    }

    currentView = viewName;
    if (viewName === 'place-detail' && param) {
      selectedPlaceId = param;
    }
    if (viewName === 'activity-detail' && param) {
      selectedActivityId = param;
    }
    if (viewName === 'activity-detail-list') {
      currentView = 'activity-detail';
      selectedActivityId = param || 'act-5';
    }

    // Hide all views
    [viewHome, viewAgenda, viewPlaces, viewStats, viewPlaceDetail, viewActivityDetail, viewAdminDashboard, viewModules, viewApk, viewSecurity].forEach(v => {
      if (v) v.classList.add('hidden');
    });

    // Update Nav Buttons Active State (Desktop & Mobile)
    navButtons.forEach(btn => {
      const target = btn.getAttribute('data-view');
      const isMatch = target === viewName || (viewName === 'activity-detail' && target === 'activity-detail-list');
      if (isMatch) {
        btn.classList.add('text-blue-600', 'bg-blue-50', 'font-bold');
        btn.classList.remove('text-slate-600');
      } else {
        btn.classList.remove('text-blue-600', 'bg-blue-50', 'font-bold');
        btn.classList.add('text-slate-600');
      }
    });

    renderCurrentView();
  }

  function updateAuthHeaderUI(user) {
    if (!user) return;
    const avatarEl = document.getElementById('user-avatar-pill');
    const nameEl = document.getElementById('user-name-display');
    const planEl = document.getElementById('user-plan-display');
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarPlan = document.getElementById('sidebar-user-plan');
    const roleBadge = document.getElementById('header-role-badge');
    const roleDesc = document.getElementById('header-role-desc');
    const rolePill = document.getElementById('role-pill-indicator');
    const greetingIcon = document.getElementById('sidebar-greeting-icon');
    const roleIndicator = document.getElementById('sidebar-role-indicator');
    const adminNavGroup = document.getElementById('admin-nav-group');
    const clientNavGroup = document.getElementById('client-nav-group');
    const btnNewActTop = document.getElementById('btn-new-activity-top');
    const searchContainer = document.getElementById('header-search-container');

    if (avatarEl) avatarEl.textContent = user.avatar || 'U';
    if (nameEl) nameEl.textContent = user.name;
    if (planEl) planEl.textContent = user.plan;
    if (sidebarName) sidebarName.textContent = user.name;
    if (sidebarPlan) sidebarPlan.textContent = user.plan;

    if (user.role === 'admin') {
      if (roleBadge) {
        roleBadge.textContent = '1. Quien Maneja Todo';
        roleBadge.className = 'text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full';
      }
      if (roleDesc) roleDesc.textContent = 'Super Administrador del Sistema';
      if (rolePill) {
        rolePill.textContent = '👑 Admin';
        rolePill.className = 'text-[10px] font-bold px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded-md';
      }
      if (greetingIcon) greetingIcon.textContent = '👑';
      if (roleIndicator) roleIndicator.textContent = 'Super Administrador';
      if (adminNavGroup) adminNavGroup.classList.remove('hidden');
      if (clientNavGroup) clientNavGroup.classList.add('hidden');
      if (btnNewActTop) btnNewActTop.classList.add('hidden');
      if (searchContainer) searchContainer.classList.add('hidden');
    } else {
      if (roleBadge) {
        roleBadge.textContent = '2. Quien Adquiere la App';
        roleBadge.className = 'text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full';
      }
      if (roleDesc) roleDesc.textContent = 'Cliente / Suscriptor Activo';
      if (rolePill) {
        rolePill.textContent = '👤 Cliente';
        rolePill.className = 'text-[10px] font-bold px-2 py-0.5 bg-blue-500/30 text-blue-300 rounded-md';
      }
      if (greetingIcon) greetingIcon.textContent = '☀️';
      if (roleIndicator) roleIndicator.textContent = 'Buenos días';
      if (adminNavGroup) adminNavGroup.classList.add('hidden');
      if (clientNavGroup) clientNavGroup.classList.remove('hidden');
      if (btnNewActTop) btnNewActTop.classList.remove('hidden');
      if (searchContainer) searchContainer.classList.remove('hidden');
    }
  }

  function closeAllAuthModals() {
    ['modal-auth-selector', 'modal-auth-client', 'modal-auth-admin', 'modal-auth-plan', 'modal-pair-device', 'view-login'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  function renderCurrentView() {
    const currentUser = store.getCurrentUser();

    // Referencias defensivas a elementos clave
    const landingEl = viewLanding || document.getElementById('view-landing');
    const shellEl = appShell || document.getElementById('app-shell');
    const adminEl = viewAdminDashboard || document.getElementById('view-admin-dashboard') || document.getElementById('view-admin');
    const homeEl = viewHome || document.getElementById('view-home');

    // If no user is logged in, show Landing Page and keep Shell hidden
    // Do NOT close auth modals here — the user may be filling a registration/login form!
    if (!currentUser) {
      if (landingEl) landingEl.classList.remove('hidden');
      if (shellEl) shellEl.classList.add('hidden');
      return;
    }

    // User is logged in: show app shell, hide landing and auth modals
    if (landingEl) landingEl.classList.add('hidden');
    closeAllAuthModals();
    if (shellEl) shellEl.classList.remove('hidden');
    updateAuthHeaderUI(currentUser);

    // If current user is admin and currentView was home, default to admin-dashboard
    if (currentUser.role === 'admin' && (currentView === 'home' || currentView === 'login')) {
      currentView = 'admin-dashboard';
    } else if (currentUser.role === 'client' && (currentView === 'admin-dashboard' || currentView === 'login')) {
      currentView = 'home';
    }

    // Hide all view panels first
    [viewHome, viewAgenda, viewPlaces, viewStats, viewPlaceDetail, viewActivityDetail, viewAdminDashboard, viewModules, viewApk, viewSecurity].forEach(v => {
      if (v) v.classList.add('hidden');
    });

    switch (currentView) {
      case 'admin-dashboard':
        if (adminEl) {
          adminEl.classList.remove('hidden');
          renderAdminDashboard();
        } else if (homeEl) {
          homeEl.classList.remove('hidden');
          renderHome();
        }
        break;
      case 'home':
        if (homeEl) {
          homeEl.classList.remove('hidden');
          renderHome();
        }
        break;
      case 'agenda':
        if (viewAgenda) {
          viewAgenda.classList.remove('hidden');
          renderAgenda();
        }
        break;
      case 'places':
        if (viewPlaces) {
          viewPlaces.classList.remove('hidden');
          renderPlaces();
        }
        break;
      case 'stats':
        if (viewStats) {
          viewStats.classList.remove('hidden');
          renderStats();
        }
        break;
      case 'modules':
        if (viewModules) {
          viewModules.classList.remove('hidden');
        }
        break;
      case 'apk':
        if (viewApk) {
          viewApk.classList.remove('hidden');
          renderApkView();
        }
        break;
      case 'security':
        if (viewSecurity) {
          viewSecurity.classList.remove('hidden');
          renderSecurityView();
        }
        break;
      case 'place-detail':
        if (viewPlaceDetail) {
          viewPlaceDetail.classList.remove('hidden');
          renderPlaceDetail(selectedPlaceId);
        }
        break;
      case 'activity-detail':
        if (viewActivityDetail) {
          viewActivityDetail.classList.remove('hidden');
          renderActivityDetail(selectedActivityId);
        }
        break;
      default:
        if (currentUser.role === 'admin' && adminEl) {
          adminEl.classList.remove('hidden');
          renderAdminDashboard();
        } else if (homeEl) {
          homeEl.classList.remove('hidden');
          renderHome();
        }
        break;
    }
  }

  // ==========================================
  // VIEW: ADMIN DASHBOARD (QUIEN MANEJA TODO)
  // ==========================================
  async function renderAdminDashboard() {
    // Sincronizar inmediatamente desde Supabase Cloud (Fuente Única de Verdad)
    try {
      await _syncRequestsFromCloud();
    } catch (err) {
      console.warn('Error al sincronizar dashboard de SuperAdmin:', err);
    }
  }

  // ============================================================
  // SYNC DIRECTO DESDE SUPABASE — FUENTE ÚNICA DE VERDAD EN LA NUBE
  // Se lee directamente de Supabase para que cualquier navegador o dispositivo vea exactamente lo mismo
  // ============================================================
  async function _syncRequestsFromCloud() {
    if (_syncInProgress) return;
    _syncInProgress = true;

    try {
      if (!window.timeplusSupabase || typeof window.timeplusSupabase.getClientRequests !== 'function') {
        _syncInProgress = false;
        return;
      }

      const cloudData = await window.timeplusSupabase.getClientRequests();
      console.log('☁️ Supabase client_requests en tiempo real:', cloudData ? cloudData.length : 0, cloudData);

      if (!Array.isArray(cloudData)) {
        _syncInProgress = false;
        return;
      }

      // Separar directamente de Supabase: Pendientes vs Aprobados
      const pendingList = cloudData.filter(r => (r.status || '').toLowerCase() === 'pendiente');
      const approvedList = cloudData.filter(r => (r.status || '').toLowerCase() === 'aprobado');

      // 1. RENDERIZAR TABLA DE SOLICITUDES PENDIENTES
      const requestsTbody = document.getElementById('admin-requests-table-body');
      const badgePending = document.getElementById('badge-pending-count');

      if (badgePending) {
        badgePending.textContent = `${pendingList.length} pendientes`;
        badgePending.className = pendingList.length > 0
          ? 'text-[10px] font-black px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full animate-pulse'
          : 'text-[10px] font-black px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full';
      }

      if (requestsTbody) {
        requestsTbody.innerHTML = '';
        if (pendingList.length === 0) {
          requestsTbody.innerHTML = `
            <tr>
              <td colspan="5" class="py-6 text-center text-xs text-slate-400 font-medium">
                ✨ No hay solicitudes pendientes. Todos los clientes registrados han sido procesados.
              </td>
            </tr>
          `;
        } else {
          pendingList.forEach(req => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-amber-50/40 transition-colors';
            const providerLabel = req.provider || 'Correo Corporativo';
            const isGoogle = providerLabel.toLowerCase().includes('google');
            const fechaDisplay = req.created_at ? new Date(req.created_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : (req.requestedAt || 'Reciente');
            
            // Datos adicionales (Teléfono, Ciudad, Fecha de Nacimiento)
            const phoneBadge = req.phone ? `<span class="inline-block text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">📞 ${req.phone}</span>` : '';
            const cityBadge = req.city ? `<span class="inline-block text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5">📍 ${req.city}</span>` : '';
            const bdayBadge = req.birthday ? `<span class="inline-block text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mt-0.5">🎂 ${req.birthday}</span>` : '';

            tr.innerHTML = `
              <td class="py-3.5">
                <div class="font-extrabold text-slate-900">${req.name || req.email}</div>
                <div class="text-[11px] text-slate-400 font-mono">${req.email}</div>
                <div class="flex flex-wrap gap-1 mt-1">
                  ${phoneBadge}
                  ${cityBadge}
                  ${bdayBadge}
                </div>
              </td>
              <td class="py-3.5">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${isGoogle ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-sky-50 text-sky-700 border border-sky-200'}">
                  ${isGoogle ? '🌐' : '📫'} ${providerLabel}
                </span>
              </td>
              <td class="py-3.5">
                <span class="font-bold text-indigo-700">${req.plan || 'TIMEPLUS Connect Pro'}</span>
              </td>
              <td class="py-3.5 text-[11px] text-slate-400 font-medium">${fechaDisplay}</td>
              <td class="py-3.5 text-right space-x-1.5">
                <button class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
                        onclick="window.timeplusApproveClient('${req.email}')">
                  ✓ Aprobar
                </button>
                <button class="px-2.5 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl font-bold text-xs transition-colors"
                        onclick="window.timeplusRejectClient('${req.email}')">
                  ✕ Rechazar
                </button>
              </td>
            `;
            requestsTbody.appendChild(tr);
          });
        }
      }

      // 2. RENDERIZAR TABLA DE CLIENTES APROBADOS CON LICENCIA ACTIVA
      const tbody = document.getElementById('admin-clients-table-body');
      const badgeActive = document.getElementById('badge-active-clients-count');

      // Sincronizar clientes aprobados en store local para simulaciones
      const localClients = approvedList.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        password: c.password || '123456',
        plan: c.plan || 'TIMEPLUS Connect Pro',
        status: 'Activo',
        acquiredDate: c.created_at ? new Date(c.created_at).toLocaleDateString('es') : 'Reciente',
        activitiesCount: 0,
        placesCount: 0,
        iaQueriesCount: 0
      }));
      if (store.data.auth) {
        store.data.auth.clientsList = localClients;
        store.saveData();
      }

      if (badgeActive) badgeActive.textContent = `${approvedList.length} clientes activos`;

      // Métricas KPI reales desde Supabase Cloud
      const kpiClientsEl = document.getElementById('kpi-admin-clients');
      const kpiLicensesEl = document.getElementById('kpi-admin-licenses');
      const kpiPlacesEl = document.getElementById('kpi-admin-places');
      const kpiQueriesEl = document.getElementById('kpi-admin-queries');

      if (kpiClientsEl) kpiClientsEl.textContent = approvedList.length;
      if (kpiLicensesEl) kpiLicensesEl.textContent = approvedList.length > 0 ? '100%' : '0%';
      if (kpiPlacesEl) kpiPlacesEl.textContent = '0';
      if (kpiQueriesEl) kpiQueriesEl.textContent = '0';

      if (tbody) {
        tbody.innerHTML = '';
        if (approvedList.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="6" class="py-8 text-center text-slate-400">
                <div class="space-y-1">
                  <span class="text-2xl block mb-1">👥</span>
                  <p class="font-bold text-xs text-slate-600">No hay clientes activos registrados</p>
                  <p class="text-[11px] text-slate-400">Cuando un cliente solicite un plan y lo apruebes en Supabase, aparecerá aquí.</p>
                </div>
              </td>
            </tr>
          `;
        } else {
          approvedList.forEach(client => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors';
            const fechaAdq = client.created_at ? new Date(client.created_at).toLocaleDateString('es') : 'Reciente';
            tr.innerHTML = `
              <td class="py-3.5">
                <div class="font-bold text-slate-800">${client.name}</div>
                <div class="text-[11px] text-slate-400 font-mono">${client.email}</div>
              </td>
              <td class="py-3.5">
                <span class="font-semibold text-slate-700">${client.plan}</span>
                <span class="block text-[10px] text-slate-400">Desde ${fechaAdq}</span>
              </td>
              <td class="py-3.5">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  <span>●</span> Activo
                </span>
              </td>
              <td class="py-3.5 font-bold font-mono text-slate-800">0</td>
              <td class="py-3.5 font-bold font-mono text-blue-600">0 lugares</td>
              <td class="py-3.5">
                <div class="flex items-center gap-1.5">
                  <button class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-[11px] transition-colors"
                          onclick="window.timeplusSimulateClient('${client.name}')">
                    Ver como cliente →
                  </button>
                  <button class="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1"
                          onclick="window.timeplusDeleteClient('${client.email}', '${client.name}')" title="Eliminar cliente">
                    <span>🗑️</span> Eliminar
                  </button>
                </div>
              </td>
            `;
            tbody.appendChild(tr);
          });
        }
      }
      // 3. RENDERIZAR CENTRO DE SEGURIDAD Y AUDITORÍA (SECCIONES 10 Y 11)
      renderSecurityCenterTables();

    } catch (err) {
      console.warn('Error en _syncRequestsFromCloud:', err);
    } finally {
      _syncInProgress = false;
    }
  }

  function renderSecurityCenterTables() {
    const accessTbody = document.getElementById('admin-security-access-body');
    const auditTbody = document.getElementById('admin-audit-logs-body');
    const secSessionsCount = document.getElementById('sec-active-sessions-count');

    const secStats = store.getSecurityStats ? store.getSecurityStats() : {};
    if (secSessionsCount) secSessionsCount.textContent = secStats.activeSessions || 386;

    // Tabla 10: Últimos Accesos
    if (accessTbody) {
      const logs = store.getAuditLogs ? store.getAuditLogs() : [];
      accessTbody.innerHTML = '';
      logs.slice(0, 5).forEach(l => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        const isSuccess = l.success;
        tr.innerHTML = `
          <td class="py-2.5 font-bold text-slate-800">${l.user}</td>
          <td class="py-2.5 text-slate-500">${l.role}</td>
          <td class="py-2.5">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${l.platform === 'APK' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}">
              ${l.platform === 'APK' ? '📱' : '🌐'} ${l.platform}
            </span>
          </td>
          <td class="py-2.5 font-mono text-[11px] text-slate-600">${l.device}</td>
          <td class="py-2.5 text-slate-400 font-mono text-[11px]">${l.time}</td>
          <td class="py-2.5 text-center">
            <span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${isSuccess ? 'bg-emerald-100 text-emerald-700 font-black' : 'bg-red-100 text-red-700 font-black'} text-xs">
              ${isSuccess ? '✓' : '✕'}
            </span>
          </td>
        `;
        accessTbody.appendChild(tr);
      });
    }

    // Tabla 11: Auditoría de Actividad Forense
    if (auditTbody) {
      const logs = store.getAuditLogs ? store.getAuditLogs() : [];
      auditTbody.innerHTML = '';
      logs.forEach(l => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
          <td class="py-2.5 font-mono text-[11px] font-bold text-slate-700">${l.time}</td>
          <td class="py-2.5 font-semibold text-slate-800">${l.action}</td>
          <td class="py-2.5 font-mono text-[11px] text-slate-600">${l.device} (${l.platform})</td>
          <td class="py-2.5 font-mono text-[11px] text-indigo-600">${l.ip}</td>
        `;
        auditTbody.appendChild(tr);
      });
    }
  }

  // ==========================================
  // VIEW 1: HOME (DASHBOARD - TU CENTRO DE CONTROL)
  // ==========================================
  function renderHome() {
    const user = store.getCurrentUser();
    const rawName = user ? user.name : 'Juan Pérez';
    const firstName = rawName.split(' ')[0];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? '¡Buenos días' : (hour < 18 ? '¡Buenas tardes' : '¡Buenas noches');

    const welcomeTitle = document.getElementById('home-welcome-title');
    if (welcomeTitle) welcomeTitle.textContent = `${greeting}, ${firstName}!`;

    // 4 KPI Cards Exact Section 4
    const kpiEvents = document.getElementById('kpi-card-events');
    const kpiTasks = document.getElementById('kpi-card-tasks');
    const kpiAppts = document.getElementById('kpi-card-appointments');
    const kpiClasses = document.getElementById('kpi-card-classes');

    if (kpiEvents) kpiEvents.textContent = '12';
    if (kpiTasks) kpiTasks.textContent = '5';
    if (kpiAppts) kpiAppts.textContent = '3';
    if (kpiClasses) kpiClasses.textContent = '2';

    // Mini-calendario interactivo
    renderMiniCalendar();

    // Próximas actividades (Lista de compromisos)
    const listContainer = document.getElementById('home-activities-list');
    if (!listContainer) return;

    const activities = store.getActivities('2026-09-04');
    listContainer.innerHTML = '';

    activities.slice(0, 5).forEach(act => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-blue-50/40 rounded-2xl border border-slate-100 transition-all hover:border-blue-200 pressable cursor-pointer';
      
      const isChecked = act.completed;
      const textClass = isChecked ? 'line-through text-slate-400' : 'text-slate-800 font-bold';

      item.innerHTML = `
        <div class="flex items-center gap-3.5 flex-1 min-w-0" data-action="open-detail" data-id="${act.id}">
          <span class="font-mono text-xs font-black text-blue-600 bg-blue-100/60 px-2 py-1 rounded-xl w-14 text-center flex-shrink-0">${act.time}</span>
          <span class="text-xl flex-shrink-0">${act.icon}</span>
          <div class="truncate">
            <p class="text-xs sm:text-sm ${textClass} truncate">${act.title}</p>
            ${act.placeName ? `<span class="text-[10px] text-slate-400 flex items-center gap-1 font-medium">📍 ${act.placeName}</span>` : ''}
          </div>
        </div>
        <div class="pl-2">
          <input type="checkbox" class="timeplus-checkbox" ${isChecked ? 'checked' : ''} data-id="${act.id}" title="Marcar completado">
        </div>
      `;

      listContainer.appendChild(item);
    });

    // Event listeners
    listContainer.querySelectorAll('.timeplus-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = chk.getAttribute('data-id');
        store.toggleActivityComplete(id);
        renderHome();
      });
    });

    listContainer.querySelectorAll('[data-action="open-detail"]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        navigateTo('activity-detail', id);
      });
    });
  }

  // Mini-Calendario Interactivo Septiembre 2026 (Sección 4)
  function renderMiniCalendar() {
    const daysContainer = document.getElementById('mini-calendar-days');
    const monthTitle = document.getElementById('mini-cal-month-title');
    if (!daysContainer) return;

    const baseDate = new Date(2026, 8 + _calMonthOffset, 1);
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();

    if (monthTitle) monthTitle.textContent = `${months[month]} ${year}`;

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    daysContainer.innerHTML = '';

    // Días previos
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = document.createElement('div');
      d.className = 'py-1.5 text-slate-300 text-center text-xs select-none';
      d.textContent = prevMonthDays - i;
      daysContainer.appendChild(d);
    }

    // Días del mes
    const activeDays = [2, 4, 6, 9, 11, 14, 16, 18, 21, 23, 26, 28];
    for (let day = 1; day <= totalDays; day++) {
      const d = document.createElement('div');
      const isCurrent = day === 6 && month === 8;
      const hasEvents = activeDays.includes(day);

      d.className = `py-1.5 rounded-xl text-center cursor-pointer transition-all relative ${
        isCurrent ? 'bg-blue-600 text-white font-black shadow-xs' : 'hover:bg-slate-100 text-slate-700 font-semibold'
      }`;
      d.innerHTML = `
        <span>${day}</span>
        ${hasEvents && !isCurrent ? '<span class="w-1 h-1 rounded-full bg-emerald-500 absolute bottom-0.5 left-1/2 -translate-x-1/2"></span>' : ''}
      `;
      d.addEventListener('click', () => {
        navigateTo('agenda');
      });
      daysContainer.appendChild(d);
    }

    const btnPrev = document.getElementById('btn-mini-cal-prev');
    const btnNext = document.getElementById('btn-mini-cal-next');
    if (btnPrev && !btnPrev._bound) {
      btnPrev._bound = true;
      btnPrev.addEventListener('click', () => {
        _calMonthOffset--;
        renderMiniCalendar();
      });
    }
    if (btnNext && !btnNext._bound) {
      btnNext._bound = true;
      btnNext.addEventListener('click', () => {
        _calMonthOffset++;
        renderMiniCalendar();
      });
    }
  }

  // Render Módulo APK / APP (Sección 7)
  function renderApkView() {
    const list = document.getElementById('apk-linked-devices-list');
    if (!list) return;

    const devices = store.getDevices ? store.getDevices() : [];
    list.innerHTML = '';

    devices.forEach(dev => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between py-3.5 hover:bg-slate-50 transition-colors';
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-2xl p-2 bg-slate-100 rounded-xl">${dev.icon || '📱'}</span>
          <div>
            <h4 class="text-xs font-black text-slate-900">${dev.name}</h4>
            <p class="text-[11px] text-slate-400">${dev.type} · ${dev.lastAccess}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${dev.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
            <span class="w-1.5 h-1.5 rounded-full ${dev.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
            ${dev.active ? 'Activo' : 'Inactivo'}
          </span>
          ${!dev.isCurrent ? `
            <button onclick="window.timeplusDisconnectDevice('${dev.id}')" class="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              Desvincular
            </button>
          ` : ''}
        </div>
      `;
      list.appendChild(row);
    });
  }

  // Render Seguridad y Sesiones (Sección 9)
  function renderSecurityView() {
    const list = document.getElementById('security-other-devices-list');
    if (!list) return;

    const devices = store.getDevices ? store.getDevices().filter(d => !d.isCurrent) : [];
    list.innerHTML = '';

    if (devices.length === 0) {
      list.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400">
          ✨ No hay otros dispositivos conectados en este momento.
        </div>
      `;
      return;
    }

    devices.forEach(dev => {
      const card = document.createElement('div');
      card.className = 'flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80';
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-2xl p-2 bg-white rounded-xl shadow-2xs">${dev.icon || '📱'}</span>
          <div>
            <h4 class="text-xs font-black text-slate-800">${dev.name}</h4>
            <p class="text-[11px] text-slate-400">Último acceso: ${dev.lastAccess}</p>
          </div>
        </div>
        <button onclick="window.timeplusDisconnectDevice('${dev.id}')" class="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all">
          Cerrar sesión
        </button>
      `;
      list.appendChild(card);
    });
  }

  // ==========================================
  // VIEW 2: AGENDA & TIMELINE
  // ==========================================
  function renderAgenda() {
    const container = document.getElementById('agenda-content');
    if (!container) return;

    const activities = store.getActivities('2026-09-04');

    if (agendaSubView === 'timeline') {
      // 🧭 LÍNEA DE TIEMPO
      let html = `
        <div class="relative py-2">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">HOY · 4 SEPTIEMBRE</span>
            <span class="text-xs text-slate-500 font-medium">${activities.length} actividades</span>
          </div>
          <div class="space-y-1">
      `;

      activities.forEach((act, index) => {
        const isLast = index === activities.length - 1;
        const isDone = act.completed;

        html += `
          <div class="relative flex items-start group">
            <!-- Time column -->
            <div class="w-14 pt-1 flex-shrink-0 text-right pr-3 font-mono text-xs font-bold ${isDone ? 'text-slate-400' : 'text-slate-700'}">
              ${act.time}
            </div>

            <!-- Central Dot and Line -->
            <div class="relative flex flex-col items-center flex-shrink-0 mr-3">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-sm ${isDone ? 'bg-emerald-100 border border-emerald-400' : 'bg-white border-2 border-blue-600'}">
                ${isDone ? '✓' : act.icon}
              </div>
              ${!isLast ? `
                <div class="w-0.5 h-12 bg-slate-200 group-hover:bg-blue-300 transition-colors flex items-center justify-center">
                  <span class="text-[10px] text-slate-400 my-auto">↓</span>
                </div>
              ` : ''}
            </div>

            <!-- Card content -->
            <div class="flex-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm mb-2 pressable cursor-pointer" onclick="window.timeplusNavigate('activity-detail', '${act.id}')">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}">${act.title}</h4>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-medium ${isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}">
                  ${act.categoryLabel}
                </span>
              </div>
              ${act.placeName ? `<p class="text-xs text-slate-500 mt-1 flex items-center gap-1">📍 ${act.placeName}</p>` : ''}
              ${act.details ? `<p class="text-[11px] text-slate-400 mt-1 line-clamp-1">${act.details}</p>` : ''}
            </div>
          </div>
        `;
      });

      html += `</div></div>`;
      container.innerHTML = html;
    } else if (agendaSubView === 'dia') {
      // 🕒 SECCIÓN 6: VISTA DE AGENDA POR HORAS (07:00 A 19:00) COLOREADOS PASTEL
      const daySlots = [
        {
          start: '07:00', end: '08:00',
          title: 'Gimnasio & Entrenamiento Matutino',
          category: 'Salud / Deporte',
          place: 'Smart Fit Centro',
          duration: '1h 00m',
          icon: '🏃‍♂️',
          bg: 'bg-emerald-50/90 border-emerald-400 text-emerald-950',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        },
        {
          start: '08:00', end: '08:30',
          isFree: true,
          label: 'Desayuno & Rutina Matutina'
        },
        {
          start: '08:30', end: '09:30',
          title: 'Reunión de Sincronización de Equipo',
          category: 'Trabajo',
          place: 'Sala Principal / Google Meet',
          duration: '1h 00m',
          icon: '💼',
          bg: 'bg-blue-50/90 border-blue-400 text-blue-950',
          badge: 'bg-blue-100 text-blue-800 border-blue-300'
        },
        {
          start: '09:30', end: '10:00',
          isFree: true,
          label: 'Espacio libre / Revisión de correos'
        },
        {
          start: '10:00', end: '11:30',
          title: 'Clase de Matemáticas Avanzadas',
          category: 'Estudio',
          place: 'Aula 302 - Campus Central',
          duration: '1h 30m',
          icon: '📚',
          bg: 'bg-purple-50/90 border-purple-400 text-purple-950',
          badge: 'bg-purple-100 text-purple-800 border-purple-300'
        },
        {
          start: '11:30', end: '12:00',
          isFree: true,
          label: 'Tiempo de repaso / Organización'
        },
        {
          start: '12:00', end: '13:00',
          title: 'Almuerzo con Carlos Mendoza',
          category: 'Personal',
          place: 'Restaurante El Jardín',
          duration: '1h 00m',
          icon: '🍽️',
          bg: 'bg-amber-50/90 border-amber-400 text-amber-950',
          badge: 'bg-amber-100 text-amber-800 border-amber-300'
        },
        {
          start: '13:00', end: '14:30',
          isFree: true,
          label: 'Descanso / Traslado a cita médica'
        },
        {
          start: '14:30', end: '15:30',
          title: 'Cita Médica General',
          category: 'Salud',
          place: 'Clínica Las Américas · Dr. Silva',
          duration: '1h 00m',
          icon: '🩺',
          bg: 'bg-teal-50/90 border-teal-400 text-teal-950',
          badge: 'bg-teal-100 text-teal-800 border-teal-300'
        },
        {
          start: '15:30', end: '16:00',
          isFree: true,
          label: 'Retorno a sede de trabajo'
        },
        {
          start: '16:00', end: '17:00',
          title: 'Preparar Informe Mensual Q3',
          category: 'Trabajo',
          place: 'Oficina Central / Google Drive',
          duration: '1h 00m',
          icon: '📊',
          bg: 'bg-sky-50/90 border-sky-400 text-sky-950',
          badge: 'bg-sky-100 text-sky-800 border-sky-300'
        },
        {
          start: '17:00', end: '18:00',
          isFree: true,
          label: 'Tiempo flexible / Preparación cierre'
        },
        {
          start: '18:00', end: '19:00',
          title: 'Reunión Virtual de Cierre Semanal',
          category: 'Reuniones',
          place: 'Zoom Room 4402',
          duration: '1h 00m',
          icon: '💻',
          bg: 'bg-indigo-50/90 border-indigo-400 text-indigo-950',
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-300'
        }
      ];

      let html = `
        <!-- Header Día Exact Section 6 -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span class="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              6. Vista de Agenda por Horas (07:00 a 19:00)
            </span>
            <h3 class="text-base font-black text-slate-900 mt-1">Viernes, 4 de Septiembre de 2026</h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              ⏱️ 6 bloques · 6.5 hrs ocupadas
            </span>
            <button onclick="window.timeplusNavigate('activity-form')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1">
              <span>+</span> <span>Agregar</span>
            </button>
          </div>
        </div>

        <!-- Hourly Schedule 07:00 to 19:00 Pastel Cards -->
        <div class="space-y-2.5 pt-1">
      `;

      daySlots.forEach(slot => {
        if (slot.isFree) {
          html += `
            <div class="flex items-center gap-3 py-1.5 px-3 rounded-xl border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-xs text-slate-400 group cursor-pointer" onclick="window.timeplusNavigate('activity-form')">
              <span class="font-mono text-[11px] font-bold text-slate-400 w-12 flex-shrink-0">${slot.start}</span>
              <span class="text-slate-300">·</span>
              <span class="text-[11px] font-medium text-slate-500 group-hover:text-blue-600 transition-colors flex-1">${slot.label}</span>
              <span class="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-xs transition-opacity">+ Agendar</span>
            </div>
          `;
        } else {
          html += `
            <div class="flex items-start gap-3 p-3.5 rounded-2xl border-l-4 shadow-sm transition-all hover:scale-[1.005] hover:shadow-md cursor-pointer ${slot.bg}" onclick="window.timeplusNavigate('activity-form')">
              <div class="text-center font-mono flex-shrink-0 w-12 pt-0.5">
                <span class="text-xs font-black block">${slot.start}</span>
                <span class="text-[10px] font-bold opacity-60">${slot.end}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center justify-between gap-1.5">
                  <h4 class="text-xs sm:text-sm font-black truncate">${slot.title}</h4>
                  <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${slot.badge}">
                    ${slot.category}
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-75 font-medium mt-1">
                  <span>📍 ${slot.place}</span>
                  <span>⏳ ${slot.duration}</span>
                </div>
              </div>
              <div class="text-xl flex-shrink-0 self-center pl-1">
                ${slot.icon}
              </div>
            </div>
          `;
        }
      });

      html += `</div>`;
      container.innerHTML = html;
    } else {
      // Classic View (SEMANA / MES / AÑO)
      let html = `
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Vista Clásica</p>
          <h3 class="text-base font-bold text-slate-800 capitalize">${agendaSubView} — Septiembre 2026</h3>
          <div class="grid grid-cols-7 gap-1 mt-4 text-center text-xs">
            <span class="text-slate-400 font-medium">L</span>
            <span class="text-slate-400 font-medium">M</span>
            <span class="text-slate-400 font-medium">X</span>
            <span class="text-slate-400 font-medium">J</span>
            <span class="text-slate-400 font-bold text-blue-600">V</span>
            <span class="text-slate-400 font-medium">S</span>
            <span class="text-slate-400 font-medium">D</span>
            <div class="p-2 text-slate-300">31</div>
            <div class="p-2 text-slate-600">1</div>
            <div class="p-2 text-slate-600">2</div>
            <div class="p-2 text-slate-600">3</div>
            <div class="p-2 font-bold bg-blue-600 text-white rounded-xl shadow-sm">4</div>
            <div class="p-2 text-slate-600">5</div>
            <div class="p-2 text-slate-600">6</div>
          </div>
        </div>
        <div class="mt-4 space-y-2.5">
          <h4 class="text-xs font-bold text-slate-500 uppercase">Actividades del período</h4>
      `;

      activities.forEach(act => {
        html += `
          <div class="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-between pressable cursor-pointer" onclick="window.timeplusNavigate('activity-detail', '${act.id}')">
            <div class="flex items-center gap-3">
              <span class="text-xl">${act.icon}</span>
              <div>
                <p class="text-sm font-semibold text-slate-800">${act.title}</p>
                <p class="text-xs text-slate-400">${act.time} · ${act.placeName || 'Sin lugar'}</p>
              </div>
            </div>
            <span class="text-xs font-medium ${act.completed ? 'text-emerald-600' : 'text-amber-600'}">
              ${act.completed ? 'Completado' : 'Pendiente'}
            </span>
          </div>
        `;
      });

      html += `</div>`;
      container.innerHTML = html;
    }
  }

  // ==========================================
  // VIEW 3: MIS LUGARES (DIFERENCIAL CLAVE)
  // ==========================================
  function renderPlaces() {
    const list = document.getElementById('places-list');
    if (!list) return;

    const places = store.getPlaces();
    list.innerHTML = '';

    places.forEach(place => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded-2xl border border-slate-100 shadow-sm pressable cursor-pointer hover:border-blue-300 transition-all';
      card.onclick = () => navigateTo('place-detail', place.id);

      // Build summary tags
      let summaryText = '';
      if (place.historySummary) {
        const parts = [];
        for (const [key, val] of Object.entries(place.historySummary)) {
          parts.push(`${val} ${key}`);
        }
        summaryText = parts.join(' · ');
      }

      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">
              ${place.icon}
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">${place.shortName}</h3>
              <p class="text-xs font-semibold text-blue-600 mt-0.5">${place.visitsCount} visitas acumuladas</p>
            </div>
          </div>
          ${place.isFavorite ? '<span class="text-amber-400 text-lg">⭐</span>' : ''}
        </div>
        ${summaryText ? `
          <div class="mt-3 pt-2.5 border-t border-slate-50 flex items-center text-[12px] text-slate-500">
            <span>${summaryText}</span>
          </div>
        ` : ''}
        <div class="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>Última: ${place.lastVisit}</span>
          <span class="text-blue-500 font-medium">Ver historial →</span>
        </div>
      `;

      list.appendChild(card);
    });
  }

  // ==========================================
  // VIEW 3.1: DETALLE DE LUGAR
  // ==========================================
  function renderPlaceDetail(placeId) {
    const place = store.getPlaceById(placeId);
    if (!place) return;

    const container = document.getElementById('place-detail-content');
    if (!container) return;

    const history = store.getPlaceHistory(placeId);

    // Build historical breakdown tags
    let breakdownHtml = '';
    if (place.historySummary) {
      for (const [key, val] of Object.entries(place.historySummary)) {
        breakdownHtml += `
          <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <span class="text-sm capitalize text-slate-700 font-medium">${key}</span>
            <span class="text-sm font-bold text-slate-900">${val}</span>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-center relative overflow-hidden">
        <div class="w-16 h-16 mx-auto rounded-3xl bg-blue-50 flex items-center justify-center text-3xl mb-3 shadow-inner">
          ${place.icon}
        </div>
        <h2 class="text-xl font-extrabold text-slate-900">${place.name.toUpperCase()}</h2>
        <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full text-blue-700 font-bold text-sm mt-2">
          <span>${place.visitsCount} visitas</span>
        </div>
        <p class="text-xs text-slate-400 mt-2">📍 ${place.address}</p>

        <!-- Navegar Button -->
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}" 
           target="_blank" 
           class="mt-4 inline-flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md transition-all active:scale-95">
          <span>🗺️</span> NAVEGAR
        </a>
      </div>

      <!-- Stats Box -->
      <div class="mt-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <h3 class="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3 flex items-center gap-2">
          <span>📊</span> Actividad histórica
        </h3>
        <div class="divide-y divide-slate-100">
          ${breakdownHtml || '<p class="text-xs text-slate-400">Sin historial registrado aún.</p>'}
        </div>
      </div>

      <!-- Visits Meta Box -->
      <div class="mt-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Última visita:</span>
          <span class="font-semibold text-slate-800">${place.lastVisit}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Próxima visita:</span>
          <span class="font-semibold text-blue-600">${place.nextVisit}</span>
        </div>
      </div>

      <!-- Associated Activities in Agenda -->
      <div class="mt-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <h3 class="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">
          Próximas actividades aquí
        </h3>
        <div class="space-y-2">
          ${history.activities.map(a => `
            <div class="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs pressable cursor-pointer" onclick="window.timeplusNavigate('activity-detail', '${a.id}')">
              <span class="font-medium text-slate-800">${a.icon} ${a.title}</span>
              <span class="text-slate-400 font-mono">${a.date} · ${a.time}</span>
            </div>
          `).join('') || '<p class="text-xs text-slate-400">No hay más actividades programadas.</p>'}
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW 4: MI ACTIVIDAD (ESTADÍSTICAS)
  // ==========================================
  function renderStats() {
    const container = document.getElementById('stats-content');
    if (!container) return;

    const stats = store.getStats(statsFilter);

    let breakdownHtml = '';
    stats.breakdown.forEach(item => {
      const percentage = Math.round((item.count / stats.total) * 100);
      breakdownHtml += `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span class="flex items-center gap-1.5">
              <span>${item.icon}</span> ${item.label}
            </span>
            <span class="font-mono text-slate-900">${item.count}</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div class="h-2.5 rounded-full transition-all duration-500" style="width: ${percentage}%; background-color: ${item.color}"></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 text-8xl opacity-10 font-bold">PLUS</div>
        <p class="text-xs uppercase tracking-widest text-blue-200 font-bold">MI ACTIVIDAD — ${stats.label.toUpperCase()}</p>
        <h2 class="text-4xl font-extrabold mt-2 tracking-tight">${stats.total} <span class="text-lg font-normal text-blue-100">actividades</span></h2>
        <p class="text-xs text-blue-200 mt-1">Conectadas con lugares, agendas y tareas registradas.</p>
      </div>

      <!-- Filter Buttons -->
      <div class="grid grid-cols-4 gap-2 mt-4 p-1 bg-slate-200/70 rounded-2xl">
        ${['HOY', 'SEMANA', 'MES', 'AÑO'].map(p => `
          <button class="py-2 text-xs font-bold rounded-xl transition-all ${statsFilter === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
                  onclick="window.setTimeplusStatsFilter('${p}')">
            ${p}
          </button>
        `).join('')}
      </div>

      <!-- Category Breakdown List -->
      <div class="mt-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <h3 class="text-xs uppercase tracking-wider font-bold text-slate-400">
          Distribución por categoría
        </h3>
        <div class="space-y-3.5">
          ${breakdownHtml}
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW 5: DETALLE DE ACTIVIDAD / ENTREGA DE TRABAJO
  // ==========================================
  function renderActivityDetail(activityId) {
    const act = store.getActivityById(activityId);
    if (!act) return;

    const container = document.getElementById('activity-detail-content');
    if (!container) return;

    // Checklists
    const checklistHtml = (act.checklist || []).map(chk => `
      <label class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
        <input type="checkbox" class="timeplus-checkbox" ${chk.done ? 'checked' : ''} 
               onchange="window.timeplusToggleCheck('${act.id}', '${chk.id}')">
        <span class="text-sm ${chk.done ? 'line-through text-slate-400 font-normal' : 'text-slate-800 font-medium'}">${chk.text}</span>
      </label>
    `).join('');

    // Reminders
    const remindersHtml = (act.reminders || []).map(r => `
      <li class="text-xs text-slate-600 flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        ${r}
      </li>
    `).join('');

    // Attachments
    const attachmentsHtml = (act.attachments || []).map(f => `
      <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-700 font-medium border border-slate-200">
        <span>📎</span> ${f}
      </div>
    `).join('');

    container.innerHTML = `
      <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
          <span>${act.icon}</span> ${act.categoryLabel.toUpperCase()}
        </div>
        <h2 class="text-xl font-extrabold text-slate-900">${act.title}</h2>

        <!-- Info Grid -->
        <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span class="text-slate-400 block font-medium">📅 Fecha:</span>
            <span class="font-bold text-slate-800">${act.date}</span>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">⏰ Hora:</span>
            <span class="font-bold text-slate-800">${act.displayTime || act.time}</span>
          </div>
          <div class="col-span-2">
            <span class="text-slate-400 block font-medium">📍 Lugar:</span>
            ${act.placeId ? `
              <button class="font-bold text-blue-600 text-left hover:underline flex items-center gap-1" onclick="window.timeplusNavigate('place-detail', '${act.placeId}')">
                ${act.placeName} → (Ver historial de visitas)
              </button>
            ` : `<span class="font-bold text-slate-800">${act.placeName || 'Sin lugar asignado'}</span>`}
          </div>
          <div class="col-span-2">
            <span class="text-slate-400 block font-medium">👤 Responsable:</span>
            <span class="font-bold text-slate-800">${act.responsible || 'Yo'}</span>
          </div>
        </div>

        <!-- Estado -->
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs uppercase font-bold text-slate-400">ESTADO</span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${act.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
            <span>${act.completed ? '🟢' : '🟡'}</span> ${act.statusLabel || (act.completed ? 'Completado' : 'En proceso')}
          </span>
        </div>
      </div>

      <!-- Checklist Section -->
      <div class="mt-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xs uppercase tracking-wider font-bold text-slate-400">Subtareas / Checklist</h3>
          <button class="text-xs font-bold text-blue-600" onclick="window.timeplusAddSubtask('${act.id}')">＋ Agregar</button>
        </div>
        <div class="space-y-1 divide-y divide-slate-50">
          ${checklistHtml || '<p class="text-xs text-slate-400 py-2">Sin subtareas asignadas.</p>'}
        </div>
      </div>

      <!-- Recordatorios -->
      <div class="mt-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <h3 class="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 flex items-center gap-1.5">
          <span>🔔</span> Recordarme
        </h3>
        <ul class="space-y-2 mt-2">
          ${remindersHtml || '<li class="text-xs text-slate-400">Sin recordatorios automáticos.</li>'}
        </ul>
      </div>

      <!-- Adjuntos -->
      <div class="mt-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
            <span>📎</span> Archivos Adjuntos
          </h3>
          <button class="text-xs font-bold text-blue-600" onclick="alert('Simulación: Archivo adjuntado correctamente con sincronización en la nube.')">＋ Adjuntar</button>
        </div>
        <div class="flex flex-wrap gap-2">
          ${attachmentsHtml || '<p class="text-xs text-slate-400">No hay archivos adjuntos.</p>'}
        </div>
      </div>
    `;
  }

  // ==========================================
  // EVENT LISTENERS & MODAL HANDLERS
  // ==========================================
  function setupEventListeners() {
    // Bottom Nav clicks
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        if (view === 'create') {
          openCreateModal();
        } else {
          navigateTo(view);
        }
      });
    });

    // "＋ NUEVA ACTIVIDAD" button on Home and Header
    const btnNewActivity = document.getElementById('btn-new-activity');
    const btnNewActivityTop = document.getElementById('btn-new-activity-top');
    if (btnNewActivity) btnNewActivity.addEventListener('click', openCreateModal);
    if (btnNewActivityTop) btnNewActivityTop.addEventListener('click', openCreateModal);

    // AI Trigger Bar and Header button
    const aiSearchTrigger = document.getElementById('ai-search-trigger');
    const btnOpenAI = document.getElementById('btn-open-ai');
    if (aiSearchTrigger) aiSearchTrigger.addEventListener('click', () => openAIModal());
    if (btnOpenAI) btnOpenAI.addEventListener('click', () => openAIModal());

    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('app-sidebar');
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
      });
    }

    // AI Mic button click
    const btnVoiceMic = document.getElementById('btn-voice-mic');
    if (btnVoiceMic) {
      btnVoiceMic.addEventListener('click', (e) => {
        e.stopPropagation();
        openAIModal(true); // start listening directly
      });
    }

    // Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeModals();
      });
    });

    // Escape key listener to close modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const explainer = document.getElementById('modal-features-explainer');
        if (explainer && !explainer.classList.contains('hidden')) {
          window.timeplusCloseExplainerModal();
          return;
        }
        if (!store.getCurrentUser()) {
          closeAllAuthModals();
        }
      }
    });

    // Agenda Subview Tabs (Día, Semana, Mes, Año, 🧭 Línea de tiempo)
    document.querySelectorAll('.agenda-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.agenda-tab-btn').forEach(b => {
          b.classList.remove('bg-blue-600', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-600');
        });
        btn.classList.add('bg-blue-600', 'text-white');
        btn.classList.remove('bg-slate-100', 'text-slate-600');

        agendaSubView = btn.getAttribute('data-tab');
        renderAgenda();
      });
    });

    // Device mockup toggle (Full desktop vs Phone simulator)
    const toggleDeviceBtn = document.getElementById('toggle-device-btn');
    if (toggleDeviceBtn) {
      toggleDeviceBtn.addEventListener('click', () => {
        document.body.classList.toggle('fullscreen-mode');
        const isFull = document.body.classList.contains('fullscreen-mode');
        toggleDeviceBtn.innerHTML = isFull ? '📱 Vista Móvil' : '🖥️ Pantalla Completa';
      });
    }

    // Reset Demo Data
    const resetDemoBtn = document.getElementById('reset-demo-btn');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', () => {
        if (confirm('¿Restablecer los datos demo iniciales de TIMEPLUS?')) {
          store.resetToDefaults();
          navigateTo('home');
        }
      });
    }

    // Category Grid Item Selection in Create Modal
    document.querySelectorAll('.cat-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const catKey = btn.getAttribute('data-category');
        const catIcon = btn.getAttribute('data-icon');
        const catLabel = btn.getAttribute('data-label');

        openCreateForm(catKey, catLabel, catIcon);
      });
    });

    // Form Submit
    const formNewAct = document.getElementById('form-new-activity');
    if (formNewAct) {
      formNewAct.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('input-act-title').value;
        const category = document.getElementById('input-act-category').value;
        const categoryLabel = document.getElementById('input-act-category-label').value;
        const icon = document.getElementById('input-act-icon').value;
        const date = document.getElementById('input-act-date').value || '2026-09-04';
        const time = document.getElementById('input-act-time').value || '10:00';
        const placeId = document.getElementById('input-act-place').value || null;
        const details = document.getElementById('input-act-details').value;

        const newAct = store.addActivity({
          title,
          category,
          categoryLabel,
          icon,
          date,
          time,
          displayTime: time,
          placeId: placeId || null,
          details
        });

        closeModals();
        navigateTo('agenda');
      });
    }

    // AI Form & Mic inside AI Modal
    setupAIModalHandlers();
  }

  function setupAIModalHandlers() {
    const aiInput = document.getElementById('ai-modal-input');
    const aiSendBtn = document.getElementById('ai-modal-send');
    const aiMicBtn = document.getElementById('ai-modal-mic');
    const aiTranscript = document.getElementById('ai-chat-transcript');

    function appendMessage(sender, text, isSpecial = false, meta = null) {
      const msg = document.createElement('div');
      msg.className = `flex flex-col ${sender === 'user' ? 'items-end' : 'items-start'} mb-3`;
      
      let innerHtml = `
        <div class="max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
          sender === 'user'
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
        }">
          ${sender === 'ai' ? '<div class="text-[10px] font-bold text-blue-600 mb-0.5">🧠 TIMEPLUS IA</div>' : ''}
          <p class="leading-relaxed">${text}</p>
          ${meta && meta.type === 'create_success' ? `
            <div class="mt-2 pt-2 border-t border-slate-100 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span>✓</span> Conectado a la Agenda e Historial de Lugares
            </div>
          ` : ''}
        </div>
      `;

      msg.innerHTML = innerHtml;
      aiTranscript.appendChild(msg);
      aiTranscript.scrollTop = aiTranscript.scrollHeight;
    }

    function handleAISubmit(inputText) {
      if (!inputText || !inputText.trim()) return;
      const text = inputText.trim();
      appendMessage('user', text);
      aiInput.value = '';

      // Process with AI Engine
      setTimeout(() => {
        const response = ai.processInput(text);
        appendMessage('ai', response.text, true, response);
        ai.speak(response.text);

        if (response.action === 'open_place' && response.placeId) {
          setTimeout(() => {
            closeModals();
            navigateTo('place-detail', response.placeId);
          }, 1800);
        }
      }, 400);
    }

    if (aiSendBtn) {
      aiSendBtn.addEventListener('click', () => handleAISubmit(aiInput.value));
    }

    if (aiInput) {
      aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAISubmit(aiInput.value);
      });
    }

    if (aiMicBtn) {
      aiMicBtn.addEventListener('click', () => {
        if (ai.isListening) {
          ai.stopListening();
          aiMicBtn.classList.remove('bg-red-500', 'text-white', 'recording-pulse');
          aiMicBtn.classList.add('bg-blue-50', 'text-blue-600');
        } else {
          aiMicBtn.classList.add('bg-red-500', 'text-white', 'recording-pulse');
          aiMicBtn.classList.remove('bg-blue-50', 'text-blue-600');
          ai.startListening(
            (transcript) => {
              aiInput.value = transcript;
              handleAISubmit(transcript);
            },
            () => {
              aiMicBtn.classList.remove('bg-red-500', 'text-white', 'recording-pulse');
              aiMicBtn.classList.add('bg-blue-50', 'text-blue-600');
            }
          );
        }
      });
    }

    // Suggestion chips
    document.querySelectorAll('.ai-chip-prompt').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-prompt');
        handleAISubmit(text);
      });
    });
  }

  // --- Modal Controllers ---
  function openCreateModal() {
    if (modalCreateActivity) {
      modalCreateActivity.classList.remove('hidden');
    }
  }

  function openCreateForm(catKey, catLabel, catIcon) {
    if (modalCreateActivity) modalCreateActivity.classList.add('hidden');
    if (modalCreateForm) {
      modalCreateForm.classList.remove('hidden');
      document.getElementById('form-cat-title').textContent = `${catIcon} ${catLabel}`;
      document.getElementById('input-act-category').value = catKey;
      document.getElementById('input-act-category-label').value = catLabel;
      document.getElementById('input-act-icon').value = catIcon;

      // Populate places select
      const placeSelect = document.getElementById('input-act-place');
      if (placeSelect) {
        placeSelect.innerHTML = '<option value="">-- Sin lugar específico (o Casa/Remoto) --</option>';
        store.getPlaces().forEach(p => {
          placeSelect.innerHTML += `<option value="${p.id}">${p.icon} ${p.shortName} (${p.visitsCount} visitas)</option>`;
        });
      }
    }
  }

  function openAIModal(startMic = false) {
    if (modalAI) {
      modalAI.classList.remove('hidden');
      if (startMic) {
        const micBtn = document.getElementById('ai-modal-mic');
        if (micBtn) micBtn.click();
      }
    }
  }

  function closeModals() {
    [modalCreateActivity, modalCreateForm, modalAI].forEach(m => {
      if (m) m.classList.add('hidden');
    });
    ai.stopListening();
  }

  // Global window helpers for inline HTML event handlers
  window.timeplusNavigate = (view, param) => navigateTo(view, param);
  window.openCreateModal = () => openCreateModal();
  window.openAIModal = (startMic = false) => openAIModal(startMic);
  window.setTimeplusStatsFilter = (filter) => {
    statsFilter = filter;
    renderStats();
  };
  window.timeplusToggleCheck = (actId, checkId) => {
    store.toggleChecklistItem(actId, checkId);
    renderActivityDetail(actId);
  };
  window.timeplusAddSubtask = (actId) => {
    const text = prompt('Escribe el nombre de la subtarea:');
    if (text && text.trim()) {
      store.addChecklistItem(actId, text.trim());
      renderActivityDetail(actId);
    }
  };

  // Auth & Multi-Role Global Handlers
  window.quickLogin = (role) => {
    store.login(role);
    renderCurrentView();
  };
  window.timeplusLogout = async () => {
    try {
      if (window.timeplusSupabase && window.timeplusSupabase.client) {
        await window.timeplusSupabase.client.auth.signOut();
      }
    } catch (e) {
      console.warn('Error signOut supabase:', e);
    }
    store.logout();
    renderCurrentView();
  };
  window.timeplusSwitchRole = (role) => {
    store.switchRole(role);
    renderCurrentView();
  };
  window.timeplusToggleRoleDirect = () => {
    const curr = store.getCurrentUser();
    if (curr && curr.role === 'admin') {
      store.switchRole('client');
    } else {
      store.switchRole('admin');
    }
    renderCurrentView();
  };
  window.timeplusSimulateClient = (clientName) => {
    store.switchRole('client');
    currentView = 'home';
    renderCurrentView();
  };

  // Botón 🔄 Actualizar del panel de solicitudes admin
  window.timeplusRefreshAdminRequests = async () => {
    store.reloadFromStorage();
    _syncInProgress = false; // Forzar re-fetch aunque esté en progreso
    await _syncRequestsFromCloud();
    // Feedback visual en el botón
    const btn = document.querySelector('[onclick="window.timeplusRefreshAdminRequests()"]');
    if (btn) {
      const original = btn.innerHTML;
      btn.innerHTML = '✅ Actualizado';
      btn.disabled = true;
      btn.classList.add('opacity-60');
      setTimeout(() => {
        btn.innerHTML = original;
        btn.disabled = false;
        btn.classList.remove('opacity-60');
      }, 1500);
    }
  };

  // Botón ➕ Simular Solicitud instantánea para pruebas del SuperAdmin
  window.timeplusSimulateRequest = () => {
    const randomNum = Math.floor(Math.random() * 900) + 100;
    const names = ['Dr. Alejandro Morales', 'Dra. Sofía Restrepo', 'Arq. Carlos Mendoza', 'Lic. Valentina Ortiz'];
    const plans = ['TIMEPLUS Connect Pro', 'TIMEPLUS Médico & Citas', 'TIMEPLUS Corporativo'];
    const chosenName = names[Math.floor(Math.random() * names.length)];
    const chosenPlan = plans[Math.floor(Math.random() * plans.length)];
    const fakeEmail = `cliente.${randomNum}@gmail.com`;

    store.addClientRequest(chosenName, fakeEmail, 'Google Workspace', chosenPlan, '123456');
    renderAdminDashboard();
    alert(`✨ Solicitud simulada creada con éxito:\n\nNombre: ${chosenName}\nCorreo: ${fakeEmail}\nPlan: ${chosenPlan}\n\nYa está visible en tu tabla para Aprobar o Rechazar.`);
  };

  // --- Modal Explicativo ("¿Para qué sirve TIMEPLUS?") ---
  window.timeplusOpenExplainerModal = (topic = 'timeline') => {
    const modal = document.getElementById('modal-features-explainer');
    if (modal) {
      modal.classList.remove('hidden');
      window.timeplusSwitchExplainerTab(topic);
    }
  };

  window.timeplusCloseExplainerModal = () => {
    const modal = document.getElementById('modal-features-explainer');
    if (modal) {
      modal.classList.add('hidden');
    }
  };

  window.timeplusSwitchExplainerTab = (topic) => {
    const topics = ['timeline', 'places', 'ai', 'admin', 'cases'];
    const active = topics.includes(topic) ? topic : 'timeline';

    topics.forEach(t => {
      const btn = document.getElementById(`explainer-tab-btn-${t}`);
      const content = document.getElementById(`explainer-content-${t}`);
      if (btn) {
        if (t === active) {
          btn.className = 'px-3.5 py-2 rounded-xl text-xs font-black bg-blue-600 text-white shadow-sm transition-all flex items-center gap-1.5';
        } else {
          btn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all flex items-center gap-1.5';
        }
      }
      if (content) {
        if (t === active) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      }
    });
  };

  // --- Modales de Autenticación Separados (Selector Dual vs Cliente vs Admin vs Adquirir Plan) ---
  window.timeplusOpenLoginSelector = () => {
    closeAllAuthModals();
    const modal = document.getElementById('modal-auth-selector');
    if (modal) modal.classList.remove('hidden');
  };

  window.timeplusCloseLoginSelector = () => {
    const modal = document.getElementById('modal-auth-selector');
    if (modal) modal.classList.add('hidden');
  };

  window.timeplusOpenClientModal = () => {
    closeAllAuthModals();
    const modal = document.getElementById('modal-auth-client');
    if (modal) modal.classList.remove('hidden');
  };

  window.timeplusOpenAdminModal = () => {
    closeAllAuthModals();
    const modal = document.getElementById('modal-auth-admin');
    if (modal) modal.classList.remove('hidden');
  };

  window.timeplusOpenPlanModal = () => {
    closeAllAuthModals();
    const modal = document.getElementById('modal-auth-plan');
    if (modal) modal.classList.remove('hidden');
  };

  window.timeplusCloseAuthModal = () => {
    closeAllAuthModals();
    // Resetear formulario de registro para la próxima apertura
    const panelForm = document.getElementById('panel-reg-form');
    const panelWelcome = document.getElementById('panel-reg-welcome');
    if (panelForm) panelForm.classList.remove('hidden');
    if (panelWelcome) panelWelcome.classList.add('hidden');
    // Ocultar filas opcionales para que se muestren de nuevo la próxima vez
    const cityRow = document.getElementById('welcome-reg-city-row');
    const bdayRow = document.getElementById('welcome-reg-bday-row');
    if (cityRow) cityRow.classList.remove('hidden');
    if (bdayRow) bdayRow.classList.remove('hidden');
  };

  // Compatibilidad con invocaciones existentes
  window.timeplusOpenLoginModal = (tab = 'client') => {
    if (tab === 'admin') {
      window.timeplusOpenAdminModal();
    } else if (tab === 'plan') {
      window.timeplusOpenPlanModal();
    } else {
      window.timeplusOpenClientModal();
    }
  };

  window.timeplusCloseLoginModal = () => {
    closeAllAuthModals();
  };

  // --- Multi-Role Switcher & Login Tab Handlers ---
  window.timeplusSwitchLoginTab = (tab) => {
    const btnAdmin = document.getElementById('tab-login-superadmin');
    const btnClient = document.getElementById('tab-login-client');
    const panelAdmin = document.getElementById('panel-login-admin');
    const panelClient = document.getElementById('panel-login-client');

    if (tab === 'admin') {
      if (btnAdmin) {
        btnAdmin.className = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 bg-white text-indigo-900 shadow-sm';
      }
      if (btnClient) {
        btnClient.className = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900';
      }
      if (panelAdmin) panelAdmin.classList.remove('hidden');
      if (panelClient) panelClient.classList.add('hidden');
    } else {
      if (btnClient) {
        btnClient.className = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 bg-white text-blue-900 shadow-sm';
      }
      if (btnAdmin) {
        btnAdmin.className = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900';
      }
      if (panelClient) panelClient.classList.remove('hidden');
      if (panelAdmin) panelAdmin.classList.add('hidden');
    }
  };

  // Login SuperAdmin Directo (con credenciales)
  window.timeplusHandleSuperadminLogin = async () => {
    const emailInput = document.getElementById('admin-login-email');
    const passInput = document.getElementById('admin-login-password');
    const msgEl = document.getElementById('admin-login-msg');

    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value : '';

    if (msgEl) {
      msgEl.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'bg-emerald-50', 'text-emerald-700');
    }

    // Validación SuperAdmin
    if (email.toLowerCase() === 'ces.rodriguez200@gmail.com' && pass === '16278465') {
      if (msgEl) {
        msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-emerald-50 text-emerald-700 block';
        msgEl.textContent = '👑 ¡Acceso Maestro Concedido! Iniciando Panel de SuperAdmin...';
      }

      // Autenticar en Supabase Auth en vivo para habilitar políticas RLS de SuperAdmin
      if (window.timeplusSupabase && window.timeplusSupabase.client) {
        window.timeplusSupabase.client.auth.signInWithPassword({
          email: 'ces.rodriguez200@gmail.com',
          password: '16278465'
        }).then(({ data, error }) => {
          if (!error && data && data.user) {
            console.log('👑 SuperAdmin autenticado exitosamente en Supabase Auth');
            if (typeof renderAdminDashboard === 'function') {
              renderAdminDashboard._fetchingCloud = false;
              renderAdminDashboard();
            }
          } else if (error) {
            console.warn('Nota Supabase Auth SuperAdmin:', error.message);
          }
        }).catch(() => {});
      }

      setTimeout(() => {
        store.login('admin');
        renderCurrentView();
      }, 500);
      return;
    }

    // Intentar con Supabase Auth si se registró con contraseña distinta
    if (window.timeplusSupabase && window.timeplusSupabase.client) {
      try {
        const { data, error } = await window.timeplusSupabase.client.auth.signInWithPassword({
          email: email,
          password: pass
        });
        if (!error && data && data.user) {
          const isAdmin = email.toLowerCase() === 'ces.rodriguez200@gmail.com';
          store.login(isAdmin ? 'admin' : 'client');
          renderCurrentView();
          return;
        }
      } catch (e) {
        console.warn('Fallo Supabase sign-in:', e);
      }
    }

    if (msgEl) {
      msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-red-50 text-red-700 block';
      msgEl.textContent = 'Credenciales maestras incorrectas. Usa ces.rodriguez200@gmail.com con la contraseña 16278465.';
    }
  };

  // --- Subtab interno de Clientes: Login vs Registro ---
  window.timeplusToggleClientSubTab = (subtab) => {
    const btnLogin = document.getElementById('btn-client-subtab-login');
    const btnReg = document.getElementById('btn-client-subtab-register');
    const panelLogin = document.getElementById('client-subpanel-login');
    const panelReg = document.getElementById('client-subpanel-register');

    if (subtab === 'login') {
      if (btnLogin) btnLogin.className = 'flex-1 py-2 font-black rounded-lg bg-white text-blue-900 shadow-sm transition-all text-center';
      if (btnReg) btnReg.className = 'flex-1 py-2 font-bold rounded-lg text-slate-500 hover:text-slate-800 transition-all text-center';
      if (panelLogin) panelLogin.classList.remove('hidden');
      if (panelReg) panelReg.classList.add('hidden');
    } else {
      if (btnReg) btnReg.className = 'flex-1 py-2 font-black rounded-lg bg-white text-blue-900 shadow-sm transition-all text-center';
      if (btnLogin) btnLogin.className = 'flex-1 py-2 font-bold rounded-lg text-slate-500 hover:text-slate-800 transition-all text-center';
      if (panelReg) panelReg.classList.remove('hidden');
      if (panelLogin) panelLogin.classList.add('hidden');
    }
  };

  // Login directo con Google u Outlook para cliente aprobado
  window.timeplusDirectClientLogin = (provider) => {
    const email = prompt(`[${provider.toUpperCase()}] Ingresa tu correo electrónico registrado y aprobado:`);
    if (!email || !email.includes('@')) return;

    // Verificar si el cliente existe en la lista de aprobados o en Supabase
    const clients = store.getClientsList();
    const approved = clients.find(c => c.email.toLowerCase() === email.toLowerCase());

    if (approved) {
      alert(`¡Bienvenido de nuevo, ${approved.name}! Tu plan activo es: ${approved.plan}`);
      store.login('client');
      renderCurrentView();
    } else {
      alert(`El correo "${email}" no se encuentra en la lista de clientes aprobados.\n\nSi aún no te has registrado, completa el formulario de solicitud para que el SuperAdmin te habilite el acceso.`);
    }
  };

  // Formulario de login para cliente aprobado (Valida Correo + Contraseña directo en Supabase Cloud)
  window.timeplusHandleClientApprovedLogin = async () => {
    const emailInput = document.getElementById('client-login-email');
    const passInput = document.getElementById('client-login-password');
    const msgEl = document.getElementById('client-login-msg');

    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value : '';

    if (!email || !pass) return;

    if (msgEl) {
      msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-blue-50 text-blue-700 border border-blue-200 block';
      msgEl.textContent = '⏳ Verificando autorización en Supabase Cloud...';
    }

    // 1. Consultar directamente en Supabase Cloud (Fuente Única de Verdad)
    let cloudRecord = null;
    if (window.timeplusSupabase && typeof window.timeplusSupabase.checkClientLogin === 'function') {
      try {
        cloudRecord = await window.timeplusSupabase.checkClientLogin(email);
      } catch (err) {
        console.warn('Error consultando login en Supabase:', err);
      }
    }

    // Si encontramos el registro en Supabase Cloud
    if (cloudRecord) {
      const statusLower = (cloudRecord.status || '').toLowerCase();
      if (statusLower !== 'aprobado') {
        if (msgEl) {
          msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-amber-50 text-amber-800 border border-amber-200 block';
          msgEl.textContent = `Tu solicitud está en estado: "${cloudRecord.status || 'Pendiente'}". El SuperAdmin aún debe aprobarla para que puedas ingresar.`;
        }
        return;
      }

      // Validar contraseña
      if (cloudRecord.password && cloudRecord.password !== pass) {
        if (msgEl) {
          msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-red-50 text-red-700 border border-red-200 block';
          msgEl.textContent = '❌ La contraseña ingresada es incorrecta.';
        }
        return;
      }

      // Sincronizar en store local para la sesión activa
      const clientData = {
        id: cloudRecord.id || ('cli-' + Date.now()),
        name: cloudRecord.name,
        email: cloudRecord.email,
        password: cloudRecord.password,
        plan: cloudRecord.plan,
        status: 'Activo',
        acquiredDate: 'Hoy'
      };
      if (store.data && store.data.auth) {
        if (!store.data.auth.clientsList) store.data.auth.clientsList = [];
        const idx = store.data.auth.clientsList.findIndex(c => c.email.toLowerCase() === email.toLowerCase());
        if (idx !== -1) store.data.auth.clientsList[idx] = clientData;
        else store.data.auth.clientsList.unshift(clientData);
        store.saveData();
      }

      if (msgEl) {
        msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-emerald-50 text-emerald-700 block';
        msgEl.textContent = `✓ ¡Acceso autorizado! Bienvenido ${cloudRecord.name} (${cloudRecord.plan}). Iniciando tu agenda...`;
      }
      setTimeout(() => {
        store.login(cloudRecord.email);
        renderCurrentView();
      }, 500);
      return;
    }

    // Fallback local en store
    const clients = store.getClientsList();
    const approved = clients.find(c => c.email.toLowerCase() === email.toLowerCase());

    if (approved) {
      if (approved.password && approved.password !== pass) {
        if (msgEl) {
          msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-red-50 text-red-700 border border-red-200 block';
          msgEl.textContent = '❌ La contraseña ingresada es incorrecta.';
        }
        return;
      }

      if (msgEl) {
        msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-emerald-50 text-emerald-700 block';
        msgEl.textContent = `✓ ¡Acceso autorizado! Bienvenido ${approved.name} (${approved.plan}). Iniciando tu agenda...`;
      }
      setTimeout(() => {
        store.login('client');
        renderCurrentView();
      }, 500);
    } else {
      if (msgEl) {
        msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-amber-50 text-amber-800 border border-amber-200 block';
        msgEl.textContent = `El correo "${email}" aún no tiene aprobación activa del SuperAdmin en la nube. Si ya enviaste la solicitud, espera a que sea aprobada.`;
      }
    }
  };

  // Autenticación Social (Google Workspace / Microsoft Outlook)
  window.timeplusSocialAuth = (provider) => {
    const promptEmail = prompt(`[${provider}] Ingresa tu correo de usuario:`, provider.includes('Google') ? 'usuario@gmail.com' : 'usuario@outlook.com');
    if (!promptEmail || !promptEmail.includes('@')) return;

    const name = prompt('Ingresa tu nombre o empresa: ', promptEmail.split('@')[0]);
    const pass = prompt('Crea tu contraseña para esta cuenta (mínimo 6 caracteres):', '123456') || '123456';
    const plan = prompt('Plan que deseas adquirir (ej: TIMEPLUS Connect Pro / TIMEPLUS Médico & Citas / TIMEPLUS Corporativo):', 'TIMEPLUS Connect Pro') || 'TIMEPLUS Connect Pro';

    // Registrar solicitud pendiente directa en el aplicativo con contraseña
    store.addClientRequest(name, promptEmail, provider, plan, pass);

    alert(`¡Solicitud enviada directamente al aplicativo!\n\nUsuario: ${promptEmail}\nPlan: ${plan}\nContraseña configurada.\n\nLa solicitud ya está en la bandeja del SuperAdmin para su aprobación.`);
  };

  // Formulario manual de registro de cliente (con creación de contraseña)
  window.timeplusHandleClientRegistration = async () => {
    const nameInput = document.getElementById('client-reg-name');
    const emailInput = document.getElementById('client-reg-email');
    const passInput = document.getElementById('client-reg-pass');
    const passConfirmInput = document.getElementById('client-reg-pass-confirm');
    const planSelect = document.getElementById('client-reg-plan');
    const phoneInput = document.getElementById('client-reg-phone');
    const birthdayInput = document.getElementById('client-reg-birthday');
    const cityInput = document.getElementById('client-reg-city');
    const msgEl = document.getElementById('client-reg-msg');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value : '';
    const passConfirm = passConfirmInput ? passConfirmInput.value : '';
    const plan = planSelect ? planSelect.value : 'TIMEPLUS Connect Pro';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const birthday = birthdayInput ? birthdayInput.value : '';
    const city = cityInput ? cityInput.value.trim() : '';

    if (!email || !name || !pass) return;

    if (pass !== passConfirm) {
      if (msgEl) {
        msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-red-50 text-red-700 border border-red-200 block';
        msgEl.textContent = '❌ Las contraseñas no coinciden. Por favor verifícalas.';
      }
      return;
    }

    if (pass.length < 6) {
      if (msgEl) {
        msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-red-50 text-red-700 border border-red-200 block';
        msgEl.textContent = '❌ La contraseña debe tener al menos 6 caracteres.';
      }
      return;
    }

    // Mostrar estado "Enviando..."
    if (msgEl) {
      msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-blue-50 text-blue-700 border border-blue-200 block';
      msgEl.textContent = '⏳ Enviando solicitud...';
    }

    const provider = email.includes('gmail') ? 'Google Workspace' : (email.includes('outlook') || email.includes('hotmail') ? 'Microsoft Outlook' : 'Correo Corporativo');
    const firstName = name.split(' ')[0];

    // 1. Guardar en localStorage local
    store.addClientRequest(name, email, provider, plan, pass);

    // 2. Guardar en Supabase Cloud (awaited para confirmar éxito)
    let savedToCloud = false;
    if (window.timeplusSupabase && typeof window.timeplusSupabase.addClientRequest === 'function') {
      try {
        const result = await window.timeplusSupabase.addClientRequest({
          name, email, password: pass, provider, plan, phone, birthday, city
        });
        savedToCloud = !!result;
        console.log('☁️ Resultado Supabase addClientRequest:', result);
      } catch (e) {
        console.warn('Error guardando en Supabase Cloud:', e);
      }
    }

    // 3. También intentar registro en Auth (sin bloquear)
    if (window.timeplusSupabase && window.timeplusSupabase.client) {
      window.timeplusSupabase.client.auth.signUp({
        email, password: pass,
        options: { data: { full_name: name, plan, phone, birthday, city } }
      }).then(({ error }) => {
        if (error) console.warn('Nota Auth signUp (no crítico):', error.message);
      }).catch(() => {});
    }

    // 4. Mostrar pantalla de bienvenida personalizada
    const panelForm = document.getElementById('panel-reg-form');
    const panelWelcome = document.getElementById('panel-reg-welcome');

    if (panelForm && panelWelcome) {
      panelForm.classList.add('hidden');
      panelWelcome.classList.remove('hidden');

      // Rellenar datos en el panel de bienvenida
      const titleEl = document.getElementById('welcome-reg-title');
      const subtitleEl = document.getElementById('welcome-reg-subtitle');
      if (titleEl) titleEl.textContent = `¡Bienvenido, ${firstName}! 🎉`;
      if (subtitleEl) subtitleEl.textContent = savedToCloud
        ? 'Tu solicitud fue enviada exitosamente a la nube.'
        : 'Tu solicitud fue registrada. El SuperAdmin la revisará pronto.';

      const elName = document.getElementById('welcome-reg-name');
      const elEmail = document.getElementById('welcome-reg-email');
      const elPlan = document.getElementById('welcome-reg-plan');
      const elCity = document.getElementById('welcome-reg-city');
      const elBday = document.getElementById('welcome-reg-bday');
      const cityRow = document.getElementById('welcome-reg-city-row');
      const bdayRow = document.getElementById('welcome-reg-bday-row');

      if (elName) elName.textContent = name;
      if (elEmail) elEmail.textContent = email;
      if (elPlan) elPlan.textContent = plan;

      if (city && elCity) {
        elCity.textContent = city;
      } else if (cityRow) {
        cityRow.classList.add('hidden');
      }

      if (birthday && elBday) {
        // Formatear fecha de nacimiento de forma legible
        const bdayDate = new Date(birthday + 'T12:00:00');
        elBday.textContent = bdayDate.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
      } else if (bdayRow) {
        bdayRow.classList.add('hidden');
      }
    } else {
      // Fallback si los paneles no existen
      if (msgEl) {
        msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-emerald-50 text-emerald-700 block';
        msgEl.textContent = `✅ ¡Bienvenido, ${firstName}! Tu solicitud fue enviada${savedToCloud ? ' y guardada en la nube' : ''}. El SuperAdmin activará tu acceso pronto.`;
      }
    }

    // Limpiar formulario
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';
    if (passConfirmInput) passConfirmInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (birthdayInput) birthdayInput.value = '';
    if (cityInput) cityInput.value = '';
  };

  // SuperAdmin Aprueba un cliente (Sincronizado con Supabase Cloud)
  window.timeplusApproveClient = async (emailOrId) => {
    const email = (emailOrId || '').includes('@') ? emailOrId : (store.getClientRequests().find(r => r.id === emailOrId)?.email || emailOrId);

    // 1. Actualizar estado en Supabase Cloud PRIMERO (Fuente Única de Verdad)
    if (window.timeplusSupabase && typeof window.timeplusSupabase.updateClientRequestStatus === 'function') {
      try {
        await window.timeplusSupabase.updateClientRequestStatus(email, 'Aprobado');
        console.log('✅ Solicitud aprobada en Supabase Cloud:', email);
      } catch (err) {
        console.warn('Error al aprobar cliente en Supabase:', err);
      }
    }

    // 2. Sincronizar en store local si existe id
    const req = store.getClientRequests().find(r => r.id === emailOrId || r.email === email);
    if (req) {
      store.approveClientRequest(req.id);
    }

    // 3. Re-renderizar desde la nube
    _syncInProgress = false;
    await _syncRequestsFromCloud();
  };

  // SuperAdmin Rechaza un cliente
  window.timeplusRejectClient = async (emailOrId) => {
    const email = (emailOrId || '').includes('@') ? emailOrId : (store.getClientRequests().find(r => r.id === emailOrId)?.email || emailOrId);
    if (confirm(`¿Seguro que deseas rechazar la solicitud de ${email}?`)) {
      if (window.timeplusSupabase && typeof window.timeplusSupabase.updateClientRequestStatus === 'function') {
        try {
          await window.timeplusSupabase.updateClientRequestStatus(email, 'Rechazado');
        } catch (err) {
          console.warn('Error al actualizar rechazo en Supabase:', err);
        }
      }

      const req = store.getClientRequests().find(r => r.id === emailOrId || r.email === email);
      if (req) {
        store.rejectClientRequest(req.id);
      }

      _syncInProgress = false;
      await _syncRequestsFromCloud();
    }
  };

  // SuperAdmin Elimina un cliente individual
  window.timeplusDeleteClient = async (email, name = '') => {
    const displayName = name || email;
    if (!confirm(`¿Eliminar al cliente "${displayName}" (${email})? Se revocará su acceso de inmediato.`)) {
      return;
    }
    
    // Eliminar de Supabase Cloud
    if (window.timeplusSupabase && typeof window.timeplusSupabase.deleteClientRequest === 'function') {
      try {
        await window.timeplusSupabase.deleteClientRequest(email);
        console.log('🗑️ Cliente eliminado de Supabase client_requests:', email);
      } catch (err) {
        console.warn('Error al eliminar cliente en Supabase:', err);
      }
    }

    store.deleteClient(email);
    _syncInProgress = false;
    await _syncRequestsFromCloud();
  };

  // SuperAdmin Elimina TODOS los clientes
  window.timeplusClearAllClients = async () => {
    if (!confirm('⚠️ ¿Estás seguro de que deseas ELIMINAR TODOS los clientes? Esta acción dejará la lista en 0.')) {
      return;
    }
    store.clearAllClients();
    renderAdminDashboard();

    // Eliminar clientes en Supabase Cloud
    if (window.timeplusSupabase && window.timeplusSupabase.client) {
      try {
        await window.timeplusSupabase.client.from('profiles').delete().neq('role', 'admin');
        console.log('🗑️ Todos los clientes eliminados de Supabase Cloud.');
      } catch (err) {
        console.warn('Error al vaciar clientes en Supabase:', err);
      }
    }
  };

  // ==========================================
  // SECCIÓN 8: VINCULACIÓN DE DISPOSITIVO (MODAL & COUNTDOWN)
  // ==========================================
  window.timeplusOpenPairModal = () => {
    const modal = document.getElementById('modal-pair-device');
    if (!modal) return;
    modal.classList.remove('hidden');

    // Generar código OTP fresco
    const codeDisplay = document.getElementById('pair-device-code-display');
    if (codeDisplay) {
      codeDisplay.textContent = typeof store.generatePairingCode === 'function' ? store.generatePairingCode() : 'TP-7F3K-2H9P';
    }

    // Iniciar countdown regresivo de 10 minutos (600 segundos)
    let timeLeft = 600;
    const timerDisplay = document.getElementById('pair-timer-countdown');
    if (_pairTimerInterval) clearInterval(_pairTimerInterval);

    _pairTimerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(_pairTimerInterval);
        _pairTimerInterval = null;
        if (timerDisplay) timerDisplay.textContent = '00:00 (Expirado)';
      } else {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        if (timerDisplay) {
          timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
      }
    }, 1000);
  };

  window.timeplusClosePairModal = () => {
    const modal = document.getElementById('modal-pair-device');
    if (modal) modal.classList.add('hidden');
    if (_pairTimerInterval) {
      clearInterval(_pairTimerInterval);
      _pairTimerInterval = null;
    }
  };

  // ==========================================
  // SECCIÓN 9: SEGURIDAD & SESIONES ACTIVAS
  // ==========================================
  window.timeplusCloseAllOtherSessions = () => {
    if (confirm('¿Cerrar todas las sesiones en otros dispositivos vinculados? Tu sesión actual se mantendrá activa.')) {
      if (typeof store.closeAllOtherSessions === 'function') {
        store.closeAllOtherSessions();
      }
      renderSecurityView();
      renderApkView();
      alert('✅ Todas las demás sesiones han sido cerradas con éxito.');
    }
  };

  window.timeplusDisconnectDevice = (deviceId) => {
    if (confirm('¿Desvincular este dispositivo de tu cuenta TIMEPLUS?')) {
      if (typeof store.disconnectDevice === 'function') {
        store.disconnectDevice(deviceId);
      }
      renderSecurityView();
      renderApkView();
    }
  };

  // Filtro de actividades rápido
  window.timeplusFilterView = (filterName) => {
    console.log('Filtro aplicado:', filterName);
    navigateTo('agenda');
  };

  // Inicializar la aplicación una vez que todo el script y sus funciones están cargados
  try {
    initApp();
  } catch (err) {
    console.error('Error al inicializar TIMEPLUS:', err);
    if (viewLanding) viewLanding.classList.remove('hidden');
    if (appShell) appShell.classList.add('hidden');
  }
});
