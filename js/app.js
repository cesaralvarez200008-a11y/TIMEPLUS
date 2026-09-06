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

  // Modals
  const modalCreateActivity = document.getElementById('modal-create-activity');
  const modalCreateForm = document.getElementById('modal-create-form');
  const modalAI = document.getElementById('modal-ai');

  // Navigation Items
  const navButtons = document.querySelectorAll('.nav-btn');

  // Initialize
  initApp();

  function initApp() {
    renderCurrentView();
    setupEventListeners();
    setupStoreSubscription();
    updateClock();
    setInterval(updateClock, 30000);
  }

  function setupStoreSubscription() {
    store.subscribe(() => {
      renderCurrentView();
    });
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
    [viewHome, viewAgenda, viewPlaces, viewStats, viewPlaceDetail, viewActivityDetail, viewAdminDashboard].forEach(v => {
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
    ['modal-auth-client', 'modal-auth-admin', 'modal-auth-plan', 'view-login'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  function renderCurrentView() {
    const currentUser = store.getCurrentUser();

    // If no user is logged in, show Landing Page and keep Shell hidden
    // Do NOT close auth modals here — the user may be filling a registration/login form!
    if (!currentUser) {
      if (viewLanding) viewLanding.classList.remove('hidden');
      if (appShell) appShell.classList.add('hidden');
      return;
    }

    // User is logged in: show app shell, hide landing and auth modals
    if (viewLanding) viewLanding.classList.add('hidden');
    closeAllAuthModals();
    if (appShell) appShell.classList.remove('hidden');
    updateAuthHeaderUI(currentUser);

    // If current user is admin and currentView was home, default to admin-dashboard
    if (currentUser.role === 'admin' && (currentView === 'home' || currentView === 'login')) {
      currentView = 'admin-dashboard';
    } else if (currentUser.role === 'client' && (currentView === 'admin-dashboard' || currentView === 'login')) {
      currentView = 'home';
    }

    // Hide all view panels first
    [viewHome, viewAgenda, viewPlaces, viewStats, viewPlaceDetail, viewActivityDetail, viewAdminDashboard].forEach(v => {
      if (v) v.classList.add('hidden');
    });

    switch (currentView) {
      case 'admin-dashboard':
        if (viewAdminDashboard) {
          viewAdminDashboard.classList.remove('hidden');
          renderAdminDashboard();
        }
        break;
      case 'home':
        if (viewHome) {
          viewHome.classList.remove('hidden');
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
    }
  }

  // ==========================================
  // VIEW: ADMIN DASHBOARD (QUIEN MANEJA TODO)
  // ==========================================
  function renderAdminDashboard() {
    // 1. Renderizar solicitudes pendientes de aprobación (Google / Outlook / Registro)
    const requestsTbody = document.getElementById('admin-requests-table-body');
    const badgePending = document.getElementById('badge-pending-count');
    const requests = store.getClientRequests ? store.getClientRequests() : [];
    const pendingList = requests.filter(r => r.status === 'Pendiente');

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
          tr.innerHTML = `
            <td class="py-3.5">
              <div class="font-extrabold text-slate-900">${req.name}</div>
              <div class="text-[11px] text-slate-400 font-mono">${req.email}</div>
            </td>
            <td class="py-3.5">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${req.provider.includes('Google') ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-sky-50 text-sky-700 border border-sky-200'}">
                ${req.provider.includes('Google') ? '🌐' : '📫'} ${req.provider}
              </span>
            </td>
            <td class="py-3.5">
              <span class="font-bold text-indigo-700">${req.plan}</span>
            </td>
            <td class="py-3.5 text-[11px] text-slate-400 font-medium">${req.requestedAt}</td>
            <td class="py-3.5 text-right space-x-1.5">
              <button class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
                      onclick="window.timeplusApproveClient('${req.id}')">
                ✓ Aprobar
              </button>
              <button class="px-2.5 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl font-bold text-xs transition-colors"
                      onclick="window.timeplusRejectClient('${req.id}')">
                ✕ Rechazar
              </button>
            </td>
          `;
          requestsTbody.appendChild(tr);
        });
      }
    }

    // 2. Renderizar clientes aprobados con licencias activas
    const tbody = document.getElementById('admin-clients-table-body');
    const badgeActive = document.getElementById('badge-active-clients-count');
    if (!tbody) return;

    let clients = store.getClientsList();

    if (badgeActive) badgeActive.textContent = `${clients.length} clientes activos`;
    tbody.innerHTML = '';

    // Actualizar métricas KPI reales y dinámicas
    const kpiClientsEl = document.getElementById('kpi-admin-clients');
    const kpiLicensesEl = document.getElementById('kpi-admin-licenses');
    const kpiPlacesEl = document.getElementById('kpi-admin-places');
    const kpiQueriesEl = document.getElementById('kpi-admin-queries');

    const totalPlacesReal = clients.reduce((acc, c) => acc + (c.placesCount || 0), 0);
    const totalQueriesReal = clients.reduce((acc, c) => acc + (c.iaQueriesCount || 0), 0);
    const activeClientsCount = clients.filter(c => c.status === 'Activo').length;
    const licenseRate = clients.length > 0 ? Math.round((activeClientsCount / clients.length) * 100) : 0;

    if (kpiClientsEl) kpiClientsEl.textContent = clients.length;
    if (kpiLicensesEl) kpiLicensesEl.textContent = `${licenseRate}%`;
    if (kpiPlacesEl) kpiPlacesEl.textContent = totalPlacesReal;
    if (kpiQueriesEl) kpiQueriesEl.textContent = totalQueriesReal;

    if (clients.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400">
            <div class="space-y-1">
              <span class="text-2xl block mb-1">👥</span>
              <p class="font-bold text-xs text-slate-600">No hay clientes activos registrados</p>
              <p class="text-[11px] text-slate-400">Cuando un cliente solicite un plan y lo apruebes, aparecerá aquí.</p>
            </div>
          </td>
        </tr>
      `;
    } else {
      clients.forEach(client => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
          <td class="py-3.5">
            <div class="font-bold text-slate-800">${client.name}</div>
            <div class="text-[11px] text-slate-400 font-mono">${client.email}</div>
          </td>
          <td class="py-3.5">
            <span class="font-semibold text-slate-700">${client.plan}</span>
            <span class="block text-[10px] text-slate-400">Desde ${client.acquiredDate}</span>
          </td>
          <td class="py-3.5">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
              <span>●</span> ${client.status}
            </span>
          </td>
          <td class="py-3.5 font-bold font-mono text-slate-800">${client.activitiesCount}</td>
          <td class="py-3.5 font-bold font-mono text-blue-600">${client.placesCount} lugares</td>
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

  // ==========================================
  // VIEW 1: HOME (PANTALLA PRINCIPAL)
  // ==========================================
  function renderHome() {
    const activities = store.getActivities('2026-09-04');
    const totalCount = activities.length;
    const pendingCount = activities.filter(a => !a.completed).length;

    // Counters
    const countTotalEl = document.getElementById('kpi-total');
    const countPendingEl = document.getElementById('kpi-pending');
    const countTotalDash = document.getElementById('kpi-total-dash');
    const countPendingDash = document.getElementById('kpi-pending-dash');

    if (countTotalEl) countTotalEl.textContent = totalCount;
    if (countPendingEl) countPendingEl.textContent = pendingCount;
    if (countTotalDash) countTotalDash.textContent = totalCount;
    if (countPendingDash) countPendingDash.textContent = pendingCount;

    // Today list container
    const listContainer = document.getElementById('home-activities-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    activities.forEach(act => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-sm border border-slate-100 transition-all hover:border-blue-200 pressable cursor-pointer';
      
      const isChecked = act.completed;
      const textClass = isChecked ? 'line-through text-slate-400' : 'text-slate-800 font-medium';

      item.innerHTML = `
        <div class="flex items-center gap-3.5 flex-1 min-w-0" data-action="open-detail" data-id="${act.id}">
          <span class="font-mono text-xs font-semibold ${isChecked ? 'text-slate-400' : 'text-slate-500'} w-12">${act.time}</span>
          <span class="text-xl flex-shrink-0">${act.icon}</span>
          <div class="truncate">
            <p class="text-sm ${textClass} truncate">${act.title}</p>
            ${act.placeName ? `<span class="text-[11px] text-slate-400 flex items-center gap-1">📍 ${act.placeName}</span>` : ''}
          </div>
        </div>
        <div class="pl-2">
          <input type="checkbox" class="timeplus-checkbox" ${isChecked ? 'checked' : ''} data-id="${act.id}" title="Marcar completado">
        </div>
      `;

      listContainer.appendChild(item);
    });

    // Attach event listeners for checkboxes and item click
    listContainer.querySelectorAll('.timeplus-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = chk.getAttribute('data-id');
        store.toggleActivityComplete(id);
      });
    });

    listContainer.querySelectorAll('[data-action="open-detail"]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        navigateTo('activity-detail', id);
      });
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
    } else {
      // Classic View (DÍA / SEMANA / MES / AÑO)
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

  // --- Modales de Autenticación Separados (Cliente vs Admin vs Adquirir Plan) ---
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

  // Formulario de login para cliente aprobado (Valida Correo + Contraseña)
  window.timeplusHandleClientApprovedLogin = () => {
    const emailInput = document.getElementById('client-login-email');
    const passInput = document.getElementById('client-login-password');
    const msgEl = document.getElementById('client-login-msg');

    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value : '';

    if (!email || !pass) return;

    const clients = store.getClientsList();
    const approved = clients.find(c => c.email.toLowerCase() === email.toLowerCase());

    if (approved) {
      // Si el cliente tiene contraseña guardada, validarla (o permitir clave por defecto)
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
        msgEl.textContent = `El correo "${email}" aún no tiene aprobación activa del SuperAdmin. Si ya enviaste la solicitud, espera a que sea aprobada.`;
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
  window.timeplusHandleClientRegistration = () => {
    const nameInput = document.getElementById('client-reg-name');
    const emailInput = document.getElementById('client-reg-email');
    const passInput = document.getElementById('client-reg-pass');
    const passConfirmInput = document.getElementById('client-reg-pass-confirm');
    const planSelect = document.getElementById('client-reg-plan');
    const msgEl = document.getElementById('client-reg-msg');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value : '';
    const passConfirm = passConfirmInput ? passConfirmInput.value : '';
    const plan = planSelect ? planSelect.value : 'TIMEPLUS Connect Pro';

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

    const provider = email.includes('gmail') ? 'Google Workspace' : (email.includes('outlook') || email.includes('hotmail') ? 'Microsoft Outlook' : 'Correo Corporativo');
    store.addClientRequest(name, email, provider, plan, pass);

    // Si el SuperAdmin ya está logueado en esta sesión, actualizar su dashboard en tiempo real
    const currentUser = store.getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
      renderAdminDashboard();
    }

    if (msgEl) {
      msgEl.className = 'text-[11px] font-semibold p-2.5 rounded-xl text-center bg-emerald-50 text-emerald-700 block';
      msgEl.textContent = `✅ Solicitud enviada al SuperAdmin. En cuanto apruebe tu plan "${plan}", podrás ingresar con tu correo y contraseña.`;
    }

    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';
    if (passConfirmInput) passConfirmInput.value = '';
  };

  // SuperAdmin Aprueba un cliente (Sincronizado con Supabase Cloud)
  window.timeplusApproveClient = async (reqId) => {
    const req = store.getClientRequests().find(r => r.id === reqId);
    store.approveClientRequest(reqId);
    renderAdminDashboard();

    // Sincronizar en vivo con la tabla profiles de Supabase
    if (req && window.timeplusSupabase && window.timeplusSupabase.client) {
      try {
        await window.timeplusSupabase.client.from('profiles').upsert({
          email: req.email,
          full_name: req.name,
          role: 'client',
          plan: req.plan,
          plan_status: 'activo',
          acquired_date: new Date().toISOString().split('T')[0]
        }, { onConflict: 'email' });
        console.log('✅ Cliente aprobado y sincronizado en Supabase Cloud:', req.email);
      } catch (err) {
        console.warn('Error al sincronizar cliente en Supabase:', err);
      }
    }
  };

  // SuperAdmin Rechaza un cliente
  window.timeplusRejectClient = async (reqId) => {
    const req = store.getClientRequests().find(r => r.id === reqId);
    if (confirm(`¿Seguro que deseas rechazar la solicitud de ${req ? req.name : 'este usuario'}?`)) {
      store.rejectClientRequest(reqId);
      renderAdminDashboard();

      if (req && window.timeplusSupabase && window.timeplusSupabase.client) {
        try {
          await window.timeplusSupabase.client.from('profiles').update({
            plan_status: 'inactivo'
          }).eq('email', req.email);
        } catch (err) {
          console.warn('Error al actualizar rechazo en Supabase:', err);
        }
      }
    }
  };

  // SuperAdmin Elimina un cliente individual
  window.timeplusDeleteClient = async (email, name = '') => {
    const displayName = name || email;
    if (!confirm(`¿Eliminar al cliente "${displayName}" (${email})? Se revocará su acceso de inmediato.`)) {
      return;
    }
    store.deleteClient(email);
    renderAdminDashboard();

    // Eliminar también de la nube Supabase si está disponible
    if (window.timeplusSupabase && window.timeplusSupabase.client) {
      try {
        await window.timeplusSupabase.client.from('profiles').delete().eq('email', email);
        console.log('🗑️ Cliente eliminado de Supabase Cloud:', email);
      } catch (err) {
        console.warn('Error al eliminar cliente en Supabase:', err);
      }
    }
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
});
