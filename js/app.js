/**
 * TIMEPLUS OS — Main Application Controller & View Renderer
 * Orchestrates the 30 Capabilities of the Personal Operating System
 */

document.addEventListener('DOMContentLoaded', () => {
  const store = window.timeplusStore;
  const ai = window.timeplusAI;
  const router = window.timeplusRouter;
  const supabase = window.timeplusSupabase;

  const contentEl = document.getElementById('main-content-view');
  const userPill = document.getElementById('user-pill-display');
  const roleBadge = document.getElementById('role-badge-display');

  function showAppView() {
    const landing = document.getElementById('landing-view');
    const app = document.getElementById('app-view');
    if (landing) landing.style.display = 'none';
    if (app) app.style.display = 'flex';
  }

  function showLandingView() {
    const landing = document.getElementById('landing-view');
    const app = document.getElementById('app-view');
    if (landing) landing.style.display = 'block';
    if (app) app.style.display = 'none';
  }

  function updateUIForRole(user) {
    const headerUserBadge  = document.getElementById('header-user-badge');
    const headerAdminBtn   = document.getElementById('header-admin-btn');
    const sidebarAdminSec  = document.getElementById('sidebar-admin-section');
    const sidebarClientSec = document.getElementById('sidebar-client-section');

    if (!user) {
      if (headerUserBadge) headerUserBadge.innerHTML = '';
      if (headerAdminBtn) headerAdminBtn.style.display = 'none';
      if (sidebarAdminSec) sidebarAdminSec.style.display = 'none';
      if (sidebarClientSec) sidebarClientSec.style.display = 'none';
      return;
    }

    if (user.role === 'admin') {
      // Vista SuperAdmin: Controla todo
      if (headerUserBadge) {
        headerUserBadge.innerHTML = `
          <span>👑</span>
          <strong style="color:#D97706;">SuperAdmin Maestro</strong>
          <span style="background:#FEF3C7;color:#B45309;padding:0.1rem 0.4rem;border-radius:9999px;font-size:0.6875rem;font-weight:800;">Control Total</span>
        `;
      }
      if (headerAdminBtn) headerAdminBtn.style.display = 'inline-flex';
      if (sidebarAdminSec) sidebarAdminSec.style.display = 'block';
      if (sidebarClientSec) sidebarClientSec.style.display = 'none';
    } else {
      // Vista Cliente: Solo ve sus datos, NADA de SuperAdmin
      if (headerUserBadge) {
        headerUserBadge.innerHTML = `
          <span>👤</span>
          <strong style="color:#0F172A;">${user.name || 'Cliente'}</strong>
          <span style="background:#DCFCE7;color:#15803D;padding:0.1rem 0.4rem;border-radius:9999px;font-size:0.6875rem;font-weight:700;">Cliente Pro</span>
        `;
      }
      if (headerAdminBtn) headerAdminBtn.style.display = 'none';
      if (sidebarAdminSec) sidebarAdminSec.style.display = 'none';
      if (sidebarClientSec) sidebarClientSec.style.display = 'block';
    }
  }

  function requireAuth(viewFn, requireAdmin = false) {
    const user = store.getCurrentUser();
    if (!user) {
      showLandingView();
      window.timeplusShowToast('🔒 Inicia sesión con una cuenta aprobada para acceder.');
      return;
    }
    if (requireAdmin && user.role !== 'admin') {
      window.timeplusShowToast('👑 Solo el SuperAdmin puede acceder al panel maestro.');
      router.navigate('hoy');
      return;
    }
    updateUIForRole(user);
    showAppView();
    viewFn();
  }

  // --- Router Registration con Guardia de Seguridad Estricta ---
  router.register('hoy', () => requireAuth(renderToday));
  router.register('inicio', () => renderLanding());
  router.register('perfil', () => requireAuth(renderProfile));
  router.register('agenda', () => requireAuth(renderAgenda));
  router.register('salud', () => requireAuth(renderHealth));
  router.register('fitness', () => requireAuth(renderFitness));
  router.register('reuniones', () => requireAuth(renderMeetings));
  router.register('citas', () => requireAuth(renderAppointments));
  router.register('proyectos', () => requireAuth(renderProjects));
  router.register('contactos', () => requireAuth(renderContacts));
  router.register('lugares', () => requireAuth(renderPlaces));
  router.register('viajes', () => requireAuth(renderTravel));
  router.register('inbox', () => requireAuth(renderInbox));
  router.register('estadisticas', () => requireAuth(renderStats));
  router.register('admin', () => requireAuth(renderAdmin, true));
  router.register('login', () => { showAppView(); renderLogin(); });
  router.register('*', () => {
    const user = store.getCurrentUser();
    if (user) {
      showAppView();
      renderToday();
    } else {
      renderLanding();
    }
  });

  // Subscribe Store Changes to re-render active route
  store.subscribe(() => {
    updateUIForRole(store.getCurrentUser());
    router.handleRouting();
  });

  // Inicializar UI de rol al cargar
  updateUIForRole(store.getCurrentUser());

  // Escuchar Realtime de Supabase para actualizar Admin si está activo
  if (supabase) {
    supabase.subscribeRealtime(() => {
      if (router.currentRoute === 'admin') renderAdmin();
    });
  }

  // --- 1 & 2. VISTA HOY: CENTRO DE CONTROL (VISIÓN 1, 2, 3, 20, 21, 23) ---
  function renderToday() {
    const user = store.getCurrentUser();
    const acts = store.getActivities().filter(a => a.date === 'today');
    const conflicts = store.detectConflicts();
    const meds = acts.filter(a => a.type === 'medicamento');
    const medsTaken = meds.filter(a => a.confirmedTaken).length;
    const fit = store.getFitnessSummary();
    const places = store.getPlaces();

    // Cálculo inteligente de Próximo Compromiso y Tiempo Disponible
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Ordenar actividades cronológicamente
    const sortedActs = [...acts].sort((a, b) => {
      const [hA, mA] = (a.time || '00:00').split(':').map(Number);
      const [hB, mB] = (b.time || '00:00').split(':').map(Number);
      return (hA * 60 + mA) - (hB * 60 + mB);
    });

    // Próxima actividad pendiente hoy
    const nextAct = sortedActs.find(a => {
      const [h, m] = (a.time || '00:00').split(':').map(Number);
      return (h * 60 + m) >= currentMinutes && !a.confirmedTaken;
    }) || sortedActs[0] || null;

    // Horas libres estimadas de una jornada típica de 16h despierto
    const busyHours = acts.length * 0.75;
    const freeHours = Math.max(1, Math.round(14 - busyHours));

    const dateStr = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date());

    contentEl.innerHTML = `
      <!-- Banner Bienvenida -->
      <div class="hero-today-banner">
        <div class="today-header">
          <div>
            <div class="today-greeting">
              <span>🗓️</span> <span>${dateStr}</span>
            </div>
            <h2 style="font-size: 1.75rem; font-weight: 900; margin-top: 0.25rem;">
              Buenos días, ${user ? user.name : 'Usuario'} 👋
            </h2>
            <p style="font-size: 0.8125rem; margin-top: 0.25rem;">
              ${user && user.role === 'admin' 
                ? '👑 <strong>Modo SuperAdmin Maestro</strong> — Control total de la plataforma y Centro de Control general.'
                : `👤 Espacio personal de cliente — Plan: <strong>${user ? (user.plan || 'TIMEPLUS Connect Pro') : 'Personal'}</strong> (Tus datos privados)`}
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn-secondary" onclick="window.timeplusOrganizeMyDay()">
              <span>⚡</span> Organizar mi día
            </button>
            <button class="btn-primary" onclick="window.timeplusOpenNewActivityModal()">
              <span>＋</span> Nueva actividad
            </button>
          </div>
        </div>

        <!-- 3. CUADRO OMNIPRESENTE DE IA (VOZ & TEXTO) -->
        <div class="ai-omni-bar">
          <div class="ai-omni-header">
            <div class="ai-omni-title">
              <span>🧠</span> <span>TIMEPLUS AI — Asistente Autónomo</span>
            </div>
            <span style="font-size: 0.6875rem; color: #94A3B8;">Dile lo que necesitas y la IA organiza el resto</span>
          </div>
          <div class="ai-input-wrap">
            <input type="text" id="ai-omni-input" class="ai-text-input" 
                   placeholder="Escribe o habla: 'Agéndame una reunión con Carlos a las 3' o '¿Qué tengo hoy?'..."
                   onkeydown="if(event.key==='Enter') window.timeplusSendAICommand()">
            <button class="btn-mic-glow" onclick="window.timeplusAI.toggleVoice()" title="Hablar con TIMEPLUS IA">
              🎙️
            </button>
          </div>
          <div class="ai-chips-container">
            <button class="ai-chip" onclick="window.timeplusRunPrompt('¿Qué tengo hoy?')">📅 ¿Qué tengo hoy?</button>
            <button class="ai-chip" onclick="window.timeplusRunPrompt('Agéndame una reunión virtual con Carlos el martes a las 3')">💻 Reunión con Carlos</button>
            <button class="ai-chip" onclick="window.timeplusRunPrompt('Recuérdame tomar la pastilla a las 8')">💊 Recordar pastilla</button>
            <button class="ai-chip" onclick="window.timeplusRunPrompt('Tengo una reunión en Bogotá a las 4, calcula cuándo debo salir')">🚗 Calcular salida</button>
            <button class="ai-chip" onclick="window.timeplusRunPrompt('Hoy entrené pecho durante una hora')">🏋️ Registrar gimnasio</button>
            <button class="ai-chip" onclick="window.timeplusRunPrompt('¿Cuánto tiempo tengo libre?')">⏱️ Tiempo libre</button>
            <button class="ai-chip" onclick="window.timeplusRunPrompt('¿Qué tengo pendiente con Carlos?')">👤 Pendientes Carlos</button>
          </div>
        </div>
      </div>

      <!-- Alerta de Conflicto de Horario si existe (Visión 20) -->
      ${conflicts.length > 0 ? `
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: var(--radius-lg); padding: 1.25rem; margin-top: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">⚠️</span>
            <div>
              <strong style="color: #991B1B; font-size: 0.875rem;">Conflicto de Horario Detectado por IA</strong>
              <p style="color: #B91C1C; font-size: 0.75rem; margin-top: 0.15rem;">
                Tienes dos actividades a las ${conflicts[0].time}: "${conflicts[0].actA.title}" y "${conflicts[0].actB.title}".
                ${conflicts[0].proposal}
              </p>
            </div>
          </div>
          <button class="btn-primary" style="background: #DC2626;" onclick="window.timeplusResolveConflict('${conflicts[0].actB.id}')">
            Aplicar propuesta IA
          </button>
        </div>
      ` : ''}

      <!-- 4 KPI Metrics Cards Dinámicos -->
      <div class="grid-cols-4" style="margin-top: 1.5rem;">
        <div class="stat-card" onclick="window.timeplusRouter.navigate('agenda')">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: var(--cat-trabajo-bg); color: var(--cat-trabajo-text);">📅</div>
            <div class="stat-card-value" style="color: var(--cat-trabajo-text);">${acts.length}</div>
          </div>
          <div class="stat-card-title">Actividades de Hoy</div>
          <div class="stat-card-desc">${acts.length === 0 ? 'Sin eventos agendados' : 'Eventos, citas y trabajo'}</div>
        </div>

        <div class="stat-card" onclick="window.timeplusRouter.navigate('salud')">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: var(--cat-salud-bg); color: var(--cat-salud-text);">💊</div>
            <div class="stat-card-value" style="color: var(--cat-salud-text);">${meds.length === 0 ? '0' : `${medsTaken} / ${meds.length}`}</div>
          </div>
          <div class="stat-card-title">Salud & Medicamentos</div>
          <div class="stat-card-desc">${meds.length === 0 ? 'Sin tomas agendadas' : (medsTaken === meds.length ? 'Toma confirmada' : 'Tomas pendientes')}</div>
        </div>

        <div class="stat-card" onclick="window.timeplusRouter.navigate('fitness')">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: var(--cat-fitness-bg); color: var(--cat-fitness-text);">🏋️</div>
            <div class="stat-card-value" style="color: var(--cat-fitness-text);">${fit.weeklyWorkouts} / ${fit.targetWorkouts}</div>
          </div>
          <div class="stat-card-title">Días de Gimnasio</div>
          <div class="stat-card-desc">${fit.weeklyWorkouts === 0 ? 'Sin registros esta semana' : 'Meta semanal en progreso'}</div>
        </div>

        <div class="stat-card" onclick="window.timeplusRouter.navigate('lugares')">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: var(--cat-personal-bg); color: var(--cat-personal-text);">📍</div>
            <div class="stat-card-value" style="color: var(--cat-personal-text);">${places.length}</div>
          </div>
          <div class="stat-card-title">Sedes Frecuentes</div>
          <div class="stat-card-desc">${places.length === 0 ? 'Registra tus puntos clave' : 'Conteo de visitas activo'}</div>
        </div>
      </div>

      <!-- TARJETAS DE INTELIGENCIA DE INICIO: PRÓXIMO COMPROMISO + TIEMPO LIBRE + CRONÓMETRO -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:1rem;margin-top:1.25rem;">
        
        <!-- Tarjeta 1: Próximo Compromiso -->
        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:var(--radius-lg);padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;bottom:0;width:4px;background:linear-gradient(180deg,#6366F1,#8B5CF6);"></div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
            <div style="font-size:0.7rem;font-weight:800;color:#6366F1;letter-spacing:0.8px;text-transform:uppercase;">
              ⚡ Próximo Compromiso
            </div>
            <span style="font-size:0.75rem;padding:0.2rem 0.6rem;background:#EEF2FF;color:#4F46E5;border-radius:999px;font-weight:700;">
              ${nextAct ? nextAct.time : 'Libre'}
            </span>
          </div>

          ${nextAct ? `
            <h4 style="margin:0 0 0.4rem 0;font-size:1.05rem;color:#0F172A;font-weight:800;">${nextAct.title}</h4>
            <div style="font-size:0.8rem;color:#64748B;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.75rem;">
              <span>⏱️ Duración: <strong>${nextAct.duration || '30m'}</strong></span>
              ${nextAct.placeName ? `<span>📍 ${nextAct.placeName}</span>` : ''}
              ${nextAct.meetLink ? `<span>🔗 <a href="${nextAct.meetLink}" target="_blank" style="color:#6366F1;font-weight:700;">Meet</a></span>` : ''}
            </div>
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:0.6rem 0.85rem;font-size:0.75rem;color:#475569;display:flex;align-items:center;justify-content:space-between;">
              <span>🧠 Preparación IA recomendada: <strong>15 min antes</strong></span>
              <button onclick="window.timeplusAI.processCommand('Prepárame para mi próximo compromiso')" style="background:none;border:none;color:#6366F1;font-weight:700;cursor:pointer;font-size:0.75rem;">Ver checklist ›</button>
            </div>
          ` : `
            <h4 style="margin:0 0 0.35rem 0;font-size:1rem;color:#1E293B;">No tienes compromisos pendientes hoy</h4>
            <p style="margin:0 0 0.75rem 0;font-size:0.75rem;color:#64748B;">Tu agenda está despejada. Puedes aprovechar para estudiar, entrenar o descansar.</p>
            <button onclick="window.timeplusOpenNewActivityModal()" style="background:#EEF2FF;border:1px solid #C7D2FE;color:#4338CA;padding:0.4rem 0.8rem;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;">
              ＋ Planificar algo ahora
            </button>
          `}
        </div>

        <!-- Tarjeta 2: Tiempo Disponible & Sugerencia IA -->
        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:var(--radius-lg);padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;bottom:0;width:4px;background:linear-gradient(180deg,#10B981,#059669);"></div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
            <div style="font-size:0.7rem;font-weight:800;color:#059669;letter-spacing:0.8px;text-transform:uppercase;">
              ⏱️ Tiempo Disponible
            </div>
            <span style="font-size:0.75rem;padding:0.2rem 0.6rem;background:#ECFDF5;color:#047857;border-radius:999px;font-weight:700;">
              ${freeHours}h libres
            </span>
          </div>

          <h4 style="margin:0 0 0.4rem 0;font-size:1.05rem;color:#0F172A;font-weight:800;">
            ${freeHours > 0 ? `Tienes aprox. ${freeHours} horas libres hoy` : 'Agenda completa para hoy'}
          </h4>
          <p style="margin:0 0 0.75rem 0;font-size:0.75rem;color:#64748B;">
            La IA detecta tus ventanas de tiempo libre y te sugiere actividades productivas o de bienestar.
          </p>

          <!-- Sugerencia inteligente con 1 clic -->
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
            <button onclick="window.timeplusRunPrompt('Agendar 30 minutos de lectura o estudio en mi espacio libre')" style="background:#F0FDF4;border:1px solid #BBF7D0;color:#166534;padding:0.4rem 0.75rem;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;">
              📚 Bloquear 30m Estudio
            </button>
            <button onclick="window.timeplusRunPrompt('Agendar 45 minutos de ejercicio en mi espacio libre')" style="background:#FFF7ED;border:1px solid #FED7AA;color:#9A3412;padding:0.4rem 0.75rem;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;">
              🏋️ Bloquear Gym
            </button>
            <button onclick="window.timeplusRunPrompt('Bloquear 20 minutos de pausa activa')" style="background:#FAF5FF;border:1px solid #E9D5FF;color:#6B21A8;padding:0.4rem 0.75rem;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;">
              ☕ Pausa Activa
            </button>
          </div>
        </div>

        <!-- Tarjeta 3: Cronómetro / Temporizador Pomodoro "Mi Tiempo" -->
        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:var(--radius-lg);padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;bottom:0;width:4px;background:linear-gradient(180deg,#F59E0B,#D97706);"></div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
            <div style="font-size:0.7rem;font-weight:800;color:#D97706;letter-spacing:0.8px;text-transform:uppercase;">
              ⏱️ Mi Tiempo en Vivo (Stopwatch)
            </div>
            <span id="tp-stopwatch-status" style="font-size:0.7rem;padding:0.2rem 0.6rem;background:#FEF3C7;color:#92400E;border-radius:999px;font-weight:700;">
              En Pausa
            </span>
          </div>

          <div style="display:flex;align-items:baseline;justify-content:space-between;margin:0.25rem 0 0.6rem 0;">
            <div id="tp-stopwatch-display" style="font-size:1.85rem;font-weight:900;color:#0F172A;font-family:monospace;letter-spacing:1px;">
              00:00:00
            </div>
            <input id="tp-stopwatch-task" type="text" placeholder="¿Qué estás haciendo?" style="font-size:0.75rem;padding:0.35rem 0.65rem;border:1px solid #CBD5E1;border-radius:6px;width:140px;" />
          </div>

          <div style="display:flex;gap:0.5rem;">
            <button id="tp-stopwatch-btn" onclick="window.timeplusToggleStopwatch()" style="flex:1;background:#10B981;border:none;color:#fff;padding:0.5rem;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem;">
              ▶️ Iniciar Tiempo
            </button>
            <button onclick="window.timeplusResetStopwatch()" style="background:#F1F5F9;border:1px solid #CBD5E1;color:#64748B;padding:0.5rem 0.85rem;border-radius:8px;font-size:0.8rem;font-weight:600;cursor:pointer;">
              🔄 Reiniciar
            </button>
          </div>
        </div>

      </div>

      <!-- TIMELINE CRONOLÓGICO: TU DÍA (VISIÓN 2) -->
      <div class="timeline-card">
        <div class="timeline-header">
          <div>
            <h3 style="font-size: 1.125rem;">Tu Día en Tiempo Real</h3>
            <p style="font-size: 0.75rem;">Línea de tiempo continua conectada con IA</p>
          </div>
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary);">
            ● En Vivo
          </span>
        </div>

        <div class="timeline-list">
          ${acts.length === 0 ? `
            <div style="text-align:center; padding: 3rem 1.5rem; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: var(--radius-lg); margin-top: 0.5rem;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">✨</div>
              <h4 style="font-size: 1.1rem; font-weight: 900; color: #1E293B; margin-bottom: 0.35rem;">¡Tu agenda está libre y en blanco!</h4>
              <p style="font-size: 0.8125rem; color: #64748B; max-width: 26rem; margin: 0 auto 1.25rem;">
                No tienes actividades agendadas aún. Pídele a la IA de TIMEPLUS que organice tu día con voz o texto.
              </p>
              <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                <button class="btn-primary" onclick="window.timeplusOpenNewActivityModal()">
                  <span>＋</span> Agendar Primera Actividad
                </button>
                <button class="btn-secondary" onclick="window.timeplusAI.toggleVoice()">
                  🎙️ Hablar con la IA
                </button>
              </div>
            </div>
          ` : acts.map(a => renderTimelineItem(a)).join('')}
        </div>
      </div>
    `;
  }

  function renderTimelineItem(act) {
    const cat = window.TIMEPLUS_CONFIG.CATEGORIES[act.category] || window.TIMEPLUS_CONFIG.CATEGORIES.otros;

    return `
      <div class="timeline-item" style="position:relative;transition:all .2s;">
        <div class="timeline-time">${act.time}</div>
        <div class="timeline-badge" style="background: ${cat.bg}; color: ${cat.color}; border: 1px solid ${cat.border};">
          ${cat.icon} ${cat.name}
        </div>
        <div class="timeline-content" style="padding-right: 2.5rem;">
          <div class="timeline-title">${act.title}</div>
          <div class="timeline-sub">
            <span>⏱️ ${act.duration}</span>
            ${act.placeName ? `<span>📍 ${act.placeName}</span>` : ''}
            ${act.attendees ? `<span>👥 ${act.attendees.join(', ')}</span>` : ''}
            ${act.meetLink ? `<a href="${act.meetLink}" target="_blank" style="color: var(--primary); font-weight: bold;">🔗 Google Meet</a>` : ''}
          </div>

          <!-- Si es medicamento, mostrar estado de confirmación -->
          ${act.type === 'medicamento' ? `
            <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem;">
              <span style="color: #15803D; font-weight: bold;">
                ${act.confirmedTaken ? '✅ ' + (act.notes || 'Toma confirmada') : '⚠️ Pendiente de confirmación'}
              </span>
              ${!act.confirmedTaken ? `
                <button class="btn-confirm-yes" style="padding: 0.25rem 0.65rem;" onclick="window.timeplusConfirmMed('${act.id}')">
                  Confirmar Toma
                </button>
              ` : ''}
            </div>
          ` : ''}

          <!-- Si es cita presencial, mostrar caja de movilidad (Visión 3 & 5) -->
          ${act.recommendedDeparture ? `
            <div class="mobility-box">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>🚗</span>
                <span style="font-size: 0.75rem;">
                  Tráfico estimado: <strong>${act.travelTimeMin} min</strong> + ${act.prepTimeMin} min preparación.
                </span>
              </div>
              <div class="mobility-time-badge">
                Salir a las: ${act.recommendedDeparture}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Botón de Eliminar Actividad -->
        <button onclick="window.timeplusDeleteActivity('${act.id}')" 
                title="Eliminar actividad" 
                style="
                  position: absolute; right: 12px; top: 12px;
                  background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2);
                  color: #ef4444; width: 30px; height: 30px; border-radius: 8px;
                  display: flex; align-items: center; justify-content: center;
                  cursor: pointer; font-size: 0.85rem; transition: all .2s;
                "
                onmouseover="this.style.background='#ef4444';this.style.color='#fff';"
                onmouseout="this.style.background='rgba(239, 68, 68, 0.08)';this.style.color='#ef4444';">
          🗑️
        </button>
      </div>
    `;
  }

  // --- 4. CALENDARIO INTELIGENTE: VISTAS DÍA, SEMANA, MES & AGENDA (VISIÓN 4) ---
  let _agendaViewMode = 'dia'; // 'dia' | 'semana' | 'mes' | 'lista'
  let _agendaCategoryFilter = 'todas';

  window.timeplusSetAgendaView = (mode) => {
    _agendaViewMode = mode;
    renderAgenda();
  };

  window.timeplusFilterAgendaCat = (cat) => {
    _agendaCategoryFilter = cat;
    renderAgenda();
  };

  function renderAgenda() {
    let acts = store.getActivities();
    if (_agendaCategoryFilter !== 'todas') {
      acts = acts.filter(a => a.category === _agendaCategoryFilter);
    }

    contentEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;">
        <div>
          <h2>Calendario & Agenda Inteligente</h2>
          <p style="font-size:0.8125rem;">Visualiza y optimiza tu tiempo en múltiples perspectivas.</p>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <!-- Selector de Vistas: Día / Semana / Mes / Lista -->
          <div style="background:#F1F5F9;border-radius:10px;padding:3px;display:flex;gap:2px;">
            <button onclick="window.timeplusSetAgendaView('dia')" style="
              border:none;padding:0.4rem 0.8rem;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;
              background:${_agendaViewMode === 'dia' ? '#fff' : 'transparent'};
              color:${_agendaViewMode === 'dia' ? '#2563EB' : '#64748B'};
              box-shadow:${_agendaViewMode === 'dia' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};
            ">📆 Día</button>
            <button onclick="window.timeplusSetAgendaView('semana')" style="
              border:none;padding:0.4rem 0.8rem;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;
              background:${_agendaViewMode === 'semana' ? '#fff' : 'transparent'};
              color:${_agendaViewMode === 'semana' ? '#2563EB' : '#64748B'};
              box-shadow:${_agendaViewMode === 'semana' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};
            ">📊 Semana</button>
            <button onclick="window.timeplusSetAgendaView('mes')" style="
              border:none;padding:0.4rem 0.8rem;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;
              background:${_agendaViewMode === 'mes' ? '#fff' : 'transparent'};
              color:${_agendaViewMode === 'mes' ? '#2563EB' : '#64748B'};
              box-shadow:${_agendaViewMode === 'mes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};
            ">🗓️ Mes</button>
            <button onclick="window.timeplusSetAgendaView('lista')" style="
              border:none;padding:0.4rem 0.8rem;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;
              background:${_agendaViewMode === 'lista' ? '#fff' : 'transparent'};
              color:${_agendaViewMode === 'lista' ? '#2563EB' : '#64748B'};
              box-shadow:${_agendaViewMode === 'lista' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};
            ">📋 Lista</button>
          </div>
          <button class="btn-primary" onclick="window.timeplusOpenNewActivityModal()">＋ Nueva Actividad</button>
        </div>
      </div>

      <!-- Barra de Filtros por Categoría -->
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.25rem;">
        <button onclick="window.timeplusFilterAgendaCat('todas')" style="
          border:none;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.75rem;font-weight:700;cursor:pointer;
          background:${_agendaCategoryFilter === 'todas' ? '#1E293B' : '#F1F5F9'};
          color:${_agendaCategoryFilter === 'todas' ? '#fff' : '#475569'};
        ">
          ✨ Todas (${store.getActivities().length})
        </button>
        ${Object.keys(window.TIMEPLUS_CONFIG.CATEGORIES).map(k => {
          const c = window.TIMEPLUS_CONFIG.CATEGORIES[k];
          const active = _agendaCategoryFilter === k;
          return `
            <button onclick="window.timeplusFilterAgendaCat('${k}')" style="
              border:1px solid ${c.border};padding:0.25rem 0.75rem;border-radius:999px;font-size:0.75rem;font-weight:700;cursor:pointer;
              background:${active ? c.color : c.bg};
              color:${active ? '#fff' : c.color};
              transition:all .15s;
            ">
              ${c.icon} ${c.name}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Renderizado Dinámico de Vistas -->
      ${_agendaViewMode === 'dia' ? `
        <!-- VISTA DÍA / TIMELINE -->
        <div class="timeline-card">
          <div class="timeline-list">
            ${acts.length === 0 ? `
              <div style="text-align:center;padding:3rem 1.5rem;color:#64748B;">
                <div style="font-size:2rem;margin-bottom:0.5rem;">📅</div>
                <p style="font-weight:700;color:#1E293B;">No hay actividades registradas en esta vista.</p>
                <p style="font-size:0.8rem;margin-top:0.25rem;">Usa el botón superior "+ Nueva Actividad" para comenzar.</p>
              </div>
            ` : acts.map(a => renderTimelineItem(a)).join('')}
          </div>
        </div>
      ` : ''}

      ${_agendaViewMode === 'semana' ? `
        <!-- VISTA SEMANAL (7 DÍAS) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:0.75rem;">
          ${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((dia, idx) => {
            const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
            const dayActs = isToday ? acts : [];
            return `
              <div style="background:#fff;border:1px solid ${isToday ? '#6366F1' : '#E2E8F0'};border-radius:12px;padding:0.85rem;min-height:220px;display:flex;flex-direction:column;box-shadow:${isToday ? '0 0 0 1px #6366F1' : 'none'};">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F1F5F9;padding-bottom:0.5rem;margin-bottom:0.5rem;">
                  <strong style="font-size:0.8rem;color:${isToday ? '#4F46E5' : '#1E293B'};">${dia}</strong>
                  ${isToday ? '<span style="font-size:0.65rem;background:#EEF2FF;color:#4F46E5;padding:0.1rem 0.4rem;border-radius:999px;font-weight:800;">Hoy</span>' : ''}
                </div>
                <div style="flex:1;display:flex;flex-direction:column;gap:0.4rem;">
                  ${dayActs.length === 0 ? `
                    <span style="font-size:0.7rem;color:#94A3B8;margin-top:1rem;text-align:center;">Libre</span>
                  ` : dayActs.map(a => {
                    const c = window.TIMEPLUS_CONFIG.CATEGORIES[a.category] || window.TIMEPLUS_CONFIG.CATEGORIES.otros;
                    return `
                      <div style="background:${c.bg};border-left:3px solid ${c.color};padding:0.4rem 0.5rem;border-radius:6px;font-size:0.72rem;">
                        <span style="font-weight:800;color:${c.color};">${a.time}</span>
                        <div style="color:#1E293B;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.title}</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      ${_agendaViewMode === 'mes' ? `
        <!-- VISTA MENSUAL -->
        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:var(--radius-lg);padding:1.25rem;">
          <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:4px;text-align:center;font-weight:700;font-size:0.75rem;color:#64748B;margin-bottom:0.5rem;">
            <span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span><span>DOM</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:6px;">
            ${Array.from({length: 31}, (_, i) => i + 1).map(day => {
              const isToday = day === new Date().getDate();
              return `
                <div style="
                  height:64px;background:${isToday ? '#EEF2FF' : '#F8FAFC'};
                  border:1px solid ${isToday ? '#818CF8' : '#F1F5F9'};border-radius:8px;padding:4px 6px;
                  display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;
                " onclick="window.timeplusOpenNewActivityModal()">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:0.75rem;font-weight:${isToday ? '900' : '600'};color:${isToday ? '#4338CA' : '#475569'};">${day}</span>
                    ${isToday ? '<span style="width:6px;height:6px;background:#4F46E5;border-radius:50%;"></span>' : ''}
                  </div>
                  ${isToday && acts.length > 0 ? `
                    <span style="font-size:0.65rem;background:#4F46E5;color:#fff;border-radius:4px;padding:1px 3px;text-align:center;font-weight:700;">
                      ${acts.length} act.
                    </span>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      ${_agendaViewMode === 'lista' ? `
        <!-- VISTA LISTA COMPACTA DE AGENDA -->
        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:var(--radius-lg);overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:0.8125rem;">
            <thead>
              <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;text-align:left;color:#64748B;font-size:0.75rem;">
                <th style="padding:0.75rem 1rem;">Hora</th>
                <th style="padding:0.75rem 1rem;">Categoría</th>
                <th style="padding:0.75rem 1rem;">Actividad</th>
                <th style="padding:0.75rem 1rem;">Duración</th>
                <th style="padding:0.75rem 1rem;text-align:right;">Acción</th>
              </tr>
            </thead>
            <tbody>
              ${acts.length === 0 ? `
                <tr><td colspan="5" style="text-align:center;padding:2rem;color:#94A3B8;">No hay actividades registradas.</td></tr>
              ` : acts.map(a => {
                const c = window.TIMEPLUS_CONFIG.CATEGORIES[a.category] || window.TIMEPLUS_CONFIG.CATEGORIES.otros;
                return `
                  <tr style="border-bottom:1px solid #F1F5F9;">
                    <td style="padding:0.75rem 1rem;font-weight:700;color:#0F172A;">${a.time}</td>
                    <td style="padding:0.75rem 1rem;">
                      <span style="background:${c.bg};color:${c.color};padding:0.15rem 0.5rem;border-radius:999px;font-size:0.7rem;font-weight:700;">
                        ${c.icon} ${c.name}
                      </span>
                    </td>
                    <td style="padding:0.75rem 1rem;font-weight:600;color:#1E293B;">${a.title}</td>
                    <td style="padding:0.75rem 1rem;color:#64748B;">⏱️ ${a.duration}</td>
                    <td style="padding:0.75rem 1rem;text-align:right;">
                      <button onclick="window.timeplusDeleteActivity('${a.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:0.9rem;" title="Eliminar">🗑️</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;
  }

  // --- 8. SALUD & MEDICAMENTOS (VISIÓN 8) ---
  function renderHealth() {
    const medActs = store.getActivities().filter(a => a.type === 'medicamento');
    const trackedMeds = store.getMedications ? store.getMedications() : [];
    
    // Alertas de inventario bajo (quedan 3 días o menos o menos de 5 unidades)
    const lowStockMeds = trackedMeds.filter(m => {
      const stock = Number(m.currentStock) || 0;
      const dailyUsage = (Number(m.takesPerDay) || 1) * (Number(m.dosePerTake) || 1);
      const daysLeft = dailyUsage > 0 ? Math.floor(stock / dailyUsage) : 999;
      return daysLeft <= 4 || stock <= 3;
    });

    contentEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom: 1.5rem;">
        <div>
          <h2>Salud, Medicamentos & Dispensario</h2>
          <p style="font-size: 0.8125rem;">Control de tomas diarias, inventario de pastillas del mes y alertas de compra inteligente.</p>
        </div>
        <button onclick="window.timeplusOpenAddMedicationModal()" class="btn-primary" style="background:linear-gradient(135deg,#059669,#10b981);box-shadow:0 4px 12px rgba(16,185,129,0.35);display:flex;align-items:center;gap:0.5rem;font-weight:700;">
          <span>➕</span> Registrar Medicamento / Receta
        </button>
      </div>

      <!-- Banner de Alerta de Dispensario / Farmacia si hay stock bajo -->
      ${lowStockMeds.length > 0 ? `
        <div style="background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(245,158,11,0.12));border:1.5px solid #f87171;border-radius:var(--radius-lg);padding:1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
          <div style="display:flex;align-items:center;gap:1rem;">
            <div style="width:46px;height:46px;background:#fee2e2;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">
              🚨
            </div>
            <div>
              <h4 style="color:#b91c1c;margin:0;font-size:0.95rem;">¡Atención de Dispensario! Medicamentos por agotarse</h4>
              <p style="color:#7f1d1d;font-size:0.8125rem;margin:0.25rem 0 0 0;">
                Tienes <strong>${lowStockMeds.length}</strong> medicamento(s) que se agotarán en los próximos días: 
                <strong>${lowStockMeds.map(m => m.name).join(', ')}</strong>. ¡Hora de reabastecer o pedir cita con tu EPS/médico!
              </p>
            </div>
          </div>
          <button onclick="window.timeplusShowBuyReminder('${lowStockMeds[0].name}')" style="background:#dc2626;color:#fff;border:none;padding:0.6rem 1.1rem;border-radius:8px;font-weight:700;font-size:0.8125rem;cursor:pointer;box-shadow:0 2px 8px rgba(220,38,38,0.3);">
            🛒 Recordatorio de Compra
          </button>
        </div>
      ` : ''}

      <!-- Pestañas / Bloques: Tomas de Hoy vs Dispensario & Inventario -->
      <div style="margin-bottom:1.25rem;display:flex;gap:0.5rem;border-bottom:1px solid #E2E8F0;padding-bottom:0.75rem;">
        <span style="font-weight:700;font-size:0.9rem;color:#1E293B;display:flex;align-items:center;gap:0.4rem;">
          🕒 Tomas Programadas Hoy (${medActs.length})
        </span>
      </div>

      <!-- Cuadrícula de Tomas de Hoy -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        ${medActs.length === 0 ? `
          <div style="grid-column:1/-1;text-align:center;padding:2.5rem 1.5rem;background:#F8FAFC;border:1.5px dashed #CBD5E1;border-radius:var(--radius-lg);color:#64748B;">
            <div style="font-size:2rem;margin-bottom:0.5rem;">💊</div>
            <p style="font-weight:700;color:#1E293B;">No tienes tomas de medicamentos para hoy.</p>
            <p style="font-size:0.8rem;margin-top:0.25rem;">Registra tu receta en el botón de arriba o pide a la IA: <em>"Recuérdame tomar Losartán a las 8am"</em>.</p>
          </div>
        ` : medActs.map(m => `
          <div class="med-card" style="border-left:4px solid ${m.confirmedTaken ? '#10B981' : '#F59E0B'};">
            <div class="med-header">
              <span style="font-size: 1.5rem;">💊</span>
              <span style="font-size: 0.75rem; font-weight: 800; color: #A16207; background: #FEFCE8; padding: 0.2rem 0.5rem; border-radius: var(--radius-full);">
                ${m.time}
              </span>
            </div>
            <h4 style="font-size: 1rem; margin-top: 0.25rem;">${m.title}</h4>
            <p style="font-size: 0.75rem;">Dosis: <strong>${m.dosage || '1 dosis'}</strong></p>
            <p style="font-size: 0.6875rem; color: ${m.confirmedTaken ? '#10B981' : '#D97706'}; font-weight:600;">
              Estado: ${m.confirmedTaken ? '✅ Tomado hoy (' + (m.takenAt || 'confirmado') + ')' : '⏳ Pendiente por tomar'}
            </p>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 0.75rem; margin-top: 0.5rem;">
              <span style="font-size: 0.75rem; font-weight: bold; display: block; margin-bottom: 0.5rem;">¿Tomaste este medicamento hoy?</span>
              <div class="med-actions">
                <button class="btn-confirm-yes" onclick="window.timeplusConfirmMed('${m.id}', true)">✓ Sí, tomado (-1 dosis)</button>
                <button class="btn-confirm-no" onclick="window.timeplusConfirmMed('${m.id}', false)">Recordar después</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- SECCIÓN DISPENSARIO & CONTROL DE INVENTARIO DEL MES -->
      <div style="margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;border-bottom:1px solid #E2E8F0;padding-bottom:0.75rem;">
        <div>
          <h3 style="font-size:1.1rem;margin:0;display:flex;align-items:center;gap:0.5rem;">
            📦 Dispensario & Control de Stock del Mes
          </h3>
          <span style="font-size:0.75rem;color:#64748B;">
            La IA calcula automáticamente cuántos días de tratamiento te quedan y te avisa antes de que se acaben.
          </span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem;">
        ${trackedMeds.length === 0 ? `
          <div style="grid-column:1/-1;text-align:center;padding:2.5rem 1.5rem;background:#F8FAFC;border:1.5px dashed #CBD5E1;border-radius:var(--radius-lg);color:#64748B;">
            <div style="font-size:2rem;margin-bottom:0.5rem;">📦</div>
            <p style="font-weight:700;color:#1E293B;">Tu dispensario no tiene medicamentos en inventario.</p>
            <p style="font-size:0.8rem;margin-top:0.25rem;">
              Registra cuántas pastillas tienes (ej: caja de 30 unidades) y la IA calculará para cuántas semanas te alcanza.
            </p>
            <button onclick="window.timeplusOpenAddMedicationModal()" class="btn-primary" style="margin-top:0.75rem;font-size:0.8rem;padding:0.5rem 1rem;">
              + Agregar Medicamento al Dispensario
            </button>
          </div>
        ` : trackedMeds.map(med => {
          const stock = Number(med.currentStock) || 0;
          const initial = Number(med.initialStock) || 30;
          const takes = Number(med.takesPerDay) || 1;
          const dose = Number(med.dosePerTake) || 1;
          const dailyTotal = takes * dose;
          const daysLeft = dailyTotal > 0 ? Math.floor(stock / dailyTotal) : 0;
          const percent = Math.min(100, Math.round((stock / initial) * 100));
          const isCrit = daysLeft <= 4 || stock <= 3;
          const isWarning = daysLeft <= 7 && !isCrit;
          const barColor = isCrit ? '#EF4444' : (isWarning ? '#F59E0B' : '#10B981');

          return `
            <div style="background:#fff;border:1px solid ${isCrit ? '#FCA5A5' : '#E2E8F0'};border-radius:var(--radius-lg);padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.05);position:relative;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
                <div>
                  <span style="font-size:0.7rem;font-weight:700;color:${barColor};background:${isCrit ? '#FEF2F2' : '#F0FDF4'};padding:0.2rem 0.6rem;border-radius:999px;display:inline-block;margin-bottom:0.35rem;">
                    ${isCrit ? '🚨 AGOTÁNDOSE PRONTO' : (isWarning ? '⚠️ STOCK MEDIO' : '✅ STOCK ÓPTIMO')}
                  </span>
                  <h4 style="margin:0;font-size:1.05rem;color:#0F172A;">${med.name}</h4>
                  <div style="font-size:0.75rem;color:#64748B;margin-top:0.2rem;">
                    ${med.instructions || '1 dosis al día'}
                  </div>
                </div>
                <button onclick="window.timeplusDeleteMedication('${med.id}')" title="Eliminar" style="background:transparent;border:none;cursor:pointer;color:#94A3B8;font-size:1rem;">✕</button>
              </div>

              <!-- Medidor de días restantes -->
              <div style="background:#F8FAFC;border:1px solid #F1F5F9;border-radius:10px;padding:0.85rem;margin-bottom:1rem;">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.4rem;">
                  <span style="font-size:0.75rem;color:#475569;font-weight:600;">Disponibles:</span>
                  <span style="font-size:1.15rem;font-weight:800;color:${isCrit ? '#B91C1C' : '#0F172A'};">
                    ${stock} <span style="font-size:0.75rem;font-weight:500;color:#64748B;">${med.unit || 'pastillas'}</span>
                  </span>
                </div>

                <!-- Barra de progreso -->
                <div style="width:100%;height:8px;background:#E2E8F0;border-radius:999px;overflow:hidden;margin-bottom:0.5rem;">
                  <div style="width:${percent}%;height:100%;background:${barColor};border-radius:999px;transition:width .3s;"></div>
                </div>

                <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:#64748B;">
                  <span>Consumo: <strong>${dailyTotal} al día</strong></span>
                  <span style="font-weight:700;color:${barColor};">
                    ${daysLeft === 0 ? '⛔ ¡Agotado hoy!' : `⏳ Te alcanza para ${daysLeft} día(s)`}
                  </span>
                </div>
              </div>

              <!-- Acciones de Dispensario: Recargar o Pedir Recordatorio -->
              <div style="display:flex;gap:0.5rem;">
                <button onclick="window.timeplusRestockPrompt('${med.id}', '${med.name}')" style="flex:1;background:#F1F5F9;border:1px solid #CBD5E1;color:#1E293B;padding:0.5rem;border-radius:8px;font-size:0.75rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem;">
                  🔄 + Recargar Caja
                </button>
                <button onclick="window.timeplusShowBuyReminder('${med.name}')" style="background:${isCrit ? '#DC2626' : '#6366F1'};color:#fff;border:none;padding:0.5rem 0.85rem;border-radius:8px;font-size:0.75rem;font-weight:600;cursor:pointer;">
                  🛒 Comprar
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- 9. GIMNASIO & FITNESS (VISIÓN 9) ---
  function renderFitness() {
    const fit = store.getFitnessSummary();
    const workouts = store.getActivities().filter(a => a.category === 'fitness');

    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Fitness & Actividad Física</h2>
        <p style="font-size: 0.8125rem;">Registra tus entrenamientos por voz o revisa tus series y repeticiones.</p>
      </div>

      <div class="grid-cols-4">
        <div class="stat-card">
          <div class="stat-card-title">Días Entrenados</div>
          <div class="stat-card-value" style="color: #C2410C;">${fit.weeklyWorkouts} / ${fit.targetWorkouts}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Horas Activas</div>
          <div class="stat-card-value" style="color: #EA580C;">${fit.activeHours} h</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Calorías Estimadas</div>
          <div class="stat-card-value" style="color: #16A34A;">${fit.caloriesBurned} kcal</div>
        </div>
        <div class="stat-card" onclick="window.timeplusAI.processCommand('Hoy entrené')">
          <div class="stat-card-title">Registrar Hoy</div>
          <button class="btn-primary" style="margin-top: 0.5rem; width: 100%; justify-content: center;">
            🎙️ Dictar Rutina
          </button>
        </div>
      </div>

      <div class="timeline-card" style="margin-top: 1.5rem;">
        <h3 style="margin-bottom: 1rem;">Historial de Entrenamientos Recientes</h3>
        <div class="timeline-list">
          ${workouts.length === 0 ? `
            <div style="text-align:center;padding:2.5rem 1rem;color:#64748B;">
              <div style="font-size:2rem;margin-bottom:0.5rem;">🏋️</div>
              <p style="font-weight:700;color:#1E293B;">Sin entrenamientos registrados esta semana.</p>
              <p style="font-size:0.8rem;margin-top:0.25rem;">Usa el botón "🎙️ Dictar Rutina" para registrar tu sesión con IA.</p>
            </div>
          ` : workouts.map(w => `
            <div class="timeline-item">
              <div class="timeline-time">${w.time}</div>
              <div class="timeline-content">
                <div class="timeline-title">🏋️ ${w.title} (${w.duration})</div>
                ${w.exercises ? `
                  <ul style="margin-top: 0.5rem; font-size: 0.75rem; color: #475569; padding-left: 1.25rem;">
                    ${w.exercises.map(e => `<li><strong>${e.name}</strong>: ${e.sets} series × ${e.reps} reps (${e.weight})</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 6. CONTACTOS (VISIÓN 6) ---
  function renderContacts() {
    const contacts = store.getContacts();
    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Personas & Contactos Conectados</h2>
        <p style="font-size: 0.8125rem;">Relaciones, historial de reuniones y pendientes directos.</p>
      </div>

      <div class="grid-cols-2">
        ${contacts.length === 0 ? `
          <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1.5rem; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: var(--radius-lg); color: #64748B;">
            <div style="font-size: 2.25rem; margin-bottom: 0.5rem;">👥</div>
            <p style="font-weight: 700; color: #1E293B;">No tienes personas ni contactos registrados aún.</p>
            <p style="font-size: 0.8rem; margin-top: 0.25rem;">Al agendar reuniones con la IA, tus contactos se vincularán automáticamente.</p>
          </div>
        ` : contacts.map(c => `
          <div class="stat-card" style="cursor: default;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="stat-card-icon" style="background: var(--primary-light); color: var(--primary); font-weight: 900;">
                ${c.name.charAt(0)}
              </div>
              <div>
                <h4 style="font-size: 1rem;">${c.name}</h4>
                <p style="font-size: 0.75rem;">${c.role} — ${c.company}</p>
              </div>
            </div>
            <div style="margin-top: 1rem; font-size: 0.75rem; border-top: 1px solid #F1F5F9; padding-top: 0.75rem;">
              <p>📞 <strong>Tel:</strong> ${c.phone} | ✉️ <strong>Email:</strong> ${c.email}</p>
              <p style="margin-top: 0.25rem;">🕒 <strong>Último contacto:</strong> ${c.lastMeeting}</p>
              <div style="margin-top: 0.5rem; background: #F8FAFC; padding: 0.5rem; border-radius: var(--radius-sm);">
                <strong style="color: #1E293B;">Tareas pendientes:</strong>
                <ul style="padding-left: 1rem; margin-top: 0.25rem;">
                  ${c.pendingTasks.map(t => `<li>${t}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- 15. LUGARES FRECUENTES (VISIÓN 15) ---
  function renderPlaces() {
    const places = store.getPlaces();
    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Sedes & Lugares Frecuentes</h2>
        <p style="font-size: 0.8125rem;">Conteo automático de visitas y cálculo de tiempos de desplazamiento.</p>
      </div>

      <div class="grid-cols-4">
        ${places.length === 0 ? `
          <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1.5rem; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: var(--radius-lg); color: #64748B;">
            <div style="font-size: 2.25rem; margin-bottom: 0.5rem;">📍</div>
            <p style="font-weight: 700; color: #1E293B;">No tienes sedes ni lugares registrados aún.</p>
            <p style="font-size: 0.8rem; margin-top: 0.25rem;">Configura tu casa, trabajo y gimnasio en <a href="#/perfil" style="color:var(--primary);font-weight:700;">Mi Perfil</a> para activar el cálculo de rutas.</p>
          </div>
        ` : places.map(p => `
          <div class="stat-card">
            <div class="stat-card-top">
              <span style="font-size: 1.5rem;">📍</span>
              <span class="timeline-badge" style="background: var(--primary-light); color: var(--primary);">
                ${p.visitsCount} Visitas
              </span>
            </div>
            <div class="stat-card-title">${p.name}</div>
            <p style="font-size: 0.6875rem; margin-top: 0.25rem;">${p.address}</p>
            <div style="margin-top: 0.75rem; font-size: 0.6875rem; color: #64748B;">
              ⏱️ Desplazamiento promedio: <strong>${p.avgTravelTime}</strong>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- 7. PROYECTOS & TAREAS (VISIÓN 7) ---
  function renderProjects() {
    const user = store.getCurrentUser();
    const acts = store.getActivities().filter(a => a.category === 'trabajo' || (a.subtasks && a.subtasks.length > 0));

    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Proyectos & Entregables</h2>
        <p style="font-size: 0.8125rem;">Gestión de objetivos divididos en fases y subtareas.</p>
      </div>

      ${user && user.role === 'client' && acts.length === 0 ? `
        <div class="timeline-card" style="text-align: center; padding: 3rem 1.5rem; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: var(--radius-lg);">
          <div style="font-size: 2.25rem; margin-bottom: 0.5rem;">💼</div>
          <h4 style="font-size: 1.1rem; font-weight: 800; color: #1E293B; margin-bottom: 0.35rem;">No tienes proyectos ni entregables registrados</h4>
          <p style="font-size: 0.8125rem; color: #64748B; max-width: 26rem; margin: 0 auto 1.25rem;">
            Pídele a la IA de TIMEPLUS: <em>"Crea una entrega para mi proyecto con subtareas"</em> o agrega una nueva actividad.
          </p>
          <button class="btn-primary" onclick="window.timeplusOpenNewActivityModal()">
            <span>＋</span> Crear Tarea o Proyecto
          </button>
        </div>
      ` : `
        <div class="timeline-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3>Proyecto: Implementación AuditPlus 2026</h3>
            <span class="timeline-badge" style="background: #EFF6FF; color: #1D4ED8;">En progreso (60%)</span>
          </div>
          <p style="font-size: 0.75rem; margin-bottom: 1rem;">Entrega final programada para el 30 de septiembre.</p>

          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
              <input type="checkbox" checked disabled> <span>Reunión de alineación con cliente (Completado)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
              <input type="checkbox" checked disabled> <span>Enviar propuesta y cotización de módulo de salud</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
              <input type="checkbox"> <span>Revisar contrato marco legal con abogados</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
              <input type="checkbox"> <span>Entrega del informe de auditoría final</span>
            </label>
          </div>
        </div>
      `}
    `;
  }

  // --- 5. REUNIONES (VISIÓN 5) ---
  function renderMeetings() {
    const meetings = store.getActivities().filter(a => a.type && a.type.startsWith('reunion'));
    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Reuniones Virtuales y Presenciales</h2>
        <p style="font-size: 0.8125rem;">Enlaces a Google Meet, participantes y cálculo de desplazamiento.</p>
      </div>

      <div class="timeline-card">
        <div class="timeline-list">
          ${meetings.length === 0 ? `
            <div style="text-align:center;padding:3rem 1.5rem;color:#64748B;">
              <div style="font-size:2rem;margin-bottom:0.5rem;">💻</div>
              <p style="font-weight:700;color:#1E293B;">No tienes reuniones programadas.</p>
              <p style="font-size:0.8rem;margin-top:0.25rem;">Dile a la IA: <em>"Agéndame una reunión virtual con Juan a las 4"</em>.</p>
            </div>
          ` : meetings.map(m => renderTimelineItem(m)).join('')}
        </div>
      </div>
    `;
  }

  // --- 10. CITAS (VISIÓN 10) ---
  function renderAppointments() {
    const apps = store.getActivities().filter(a => a.type && a.type.startsWith('cita'));
    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Citas Universales</h2>
        <p style="font-size: 0.8125rem;">Citas médicas, barbería, trámites y consultorios.</p>
      </div>

      <div class="timeline-card">
        <div class="timeline-list">
          ${apps.length === 0 ? `
            <div style="text-align:center;padding:3rem 1.5rem;color:#64748B;">
              <div style="font-size:2rem;margin-bottom:0.5rem;">🩺</div>
              <p style="font-weight:700;color:#1E293B;">No tienes citas programadas.</p>
              <p style="font-size:0.8rem;margin-top:0.25rem;">Registra citas médicas o personales con hora y lugar para calcular tiempos de salida.</p>
            </div>
          ` : apps.map(a => renderTimelineItem(a)).join('')}
        </div>
      </div>
    `;
  }

  // --- 14. VIAJES (VISIÓN 14) ---
  function renderTravel() {
    const user = store.getCurrentUser();
    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Viajes & Itinerarios (Travel)</h2>
        <p style="font-size: 0.8125rem;">Itinerarios completos organizados por la IA: vuelos, hoteles y desplazamientos.</p>
      </div>

      ${user && user.role === 'client' ? `
        <div class="timeline-card" style="text-align: center; padding: 3rem 1.5rem; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: var(--radius-lg); color: #64748B;">
          <div style="font-size: 2.25rem; margin-bottom: 0.5rem;">✈️</div>
          <h4 style="font-size: 1.1rem; font-weight: 800; color: #1E293B; margin-bottom: 0.35rem;">No tienes viajes programados</h4>
          <p style="font-size: 0.8125rem; color: #64748B; max-width: 26rem; margin: 0 auto 1.25rem;">
            Dile a la IA: <em>"Viajo a Cartagena el próximo viernes a las 8am"</em> para estructurar tu itinerario.
          </p>
        </div>
      ` : `
        <div class="timeline-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3>✈️ Próximo Viaje: Medellín (Gira Empresarial)</h3>
            <span class="timeline-badge" style="background: #F3E8FF; color: #7E22CE;">18 - 21 Sep</span>
          </div>
          <p style="font-size: 0.75rem; margin-bottom: 1rem;">Itinerario sugerido por TIMEPLUS Travel AI.</p>

          <div class="timeline-list">
            <div class="timeline-item">
              <div class="timeline-time">05:30</div>
              <div class="timeline-badge" style="background: #EFF6FF; color: #2563EB;">✈️ Vuelo</div>
              <div class="timeline-content">
                <div class="timeline-title">Salida hacia el Aeropuerto El Dorado</div>
                <div class="timeline-sub"><span>🚗 Uber programado (40 min)</span></div>
              </div>
            </div>
            <div class="timeline-item">
              <div class="timeline-time">07:15</div>
              <div class="timeline-badge" style="background: #EFF6FF; color: #2563EB;">✈️ Vuelo</div>
              <div class="timeline-content">
                <div class="timeline-title">Vuelo AV9312 Bogotá ➔ Medellín (MDE)</div>
                <div class="timeline-sub"><span>Avianca · Asiento 12C</span></div>
              </div>
            </div>
          </div>
        </div>
      `}
    `;
  }

  // --- 18. BANDEJA DE ENTRADA IA (VISIÓN 18) ---
  function renderInbox() {
    const inbox = store.getInbox();
    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Bandeja de Entrada IA (Inbox)</h2>
        <p style="font-size: 0.8125rem;">Notas rápidas, correos y audios que la IA convierte en eventos de tu agenda.</p>
      </div>

      <div class="timeline-card">
        <div class="timeline-list">
          ${inbox.length === 0 ? `
            <div style="text-align:center;padding:3rem 1.5rem;color:#64748B;">
              <div style="font-size:2rem;margin-bottom:0.5rem;">📥</div>
              <p style="font-weight:700;color:#1E293B;">Bandeja limpia sin notas pendientes.</p>
              <p style="font-size:0.8rem;margin-top:0.25rem;">Envía notas de voz o escribe a la IA para capturar ideas rápidamente.</p>
            </div>
          ` : inbox.map(item => `
            <div class="timeline-item" style="justify-content: space-between; align-items: center;">
              <div>
                <span class="timeline-badge" style="background: #F1F5F9; color: #475569;">${item.source.toUpperCase()}</span>
                <span style="margin-left: 0.5rem; font-size: 0.875rem; font-weight: 600;">"${item.text}"</span>
              </div>
              <button class="btn-primary" style="padding: 0.35rem 0.75rem;" onclick="window.timeplusProcessInbox('${item.id}', '${item.text}')">
                Convertir a Agenda
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 22. ESTADÍSTICAS & BI (VISIÓN 22) ---
  function renderStats() {
    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Estadísticas & Productividad Semanal</h2>
        <p style="font-size: 0.8125rem;">Trazabilidad completa del uso de tu tiempo.</p>
      </div>

      <div class="grid-cols-4">
        <div class="stat-card">
          <div class="stat-card-title">Tiempo Trabajado</div>
          <div class="stat-card-value" style="color: #2563EB;">35 h</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">En Reuniones</div>
          <div class="stat-card-value" style="color: #4F46E5;">7 h</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Tareas Terminadas</div>
          <div class="stat-card-value" style="color: #16A34A;">18</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Horas de Ejercicio</div>
          <div class="stat-card-value" style="color: #EA580C;">5.5 h</div>
        </div>
      </div>
    `;
  }

  // --- 1. VISTA SUPERADMIN: CONTROLA TODO ---
  async function renderAdmin() {
    const user = store.getCurrentUser();
    if (!user || user.role !== 'admin') {
      renderLogin('admin');
      return;
    }

    contentEl.innerHTML = `
      <div class="admin-banner">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 800; color: #FBBF24;">
            <span>👑</span> <span>PANEL MAESTRO GENERAL</span>
            <span style="background: rgba(245, 158, 11, 0.2); color: #FDE68A; padding: 0.15rem 0.5rem; border-radius: 9999px;">SuperAdmin Activo</span>
          </div>
          <h2 style="font-size: 1.75rem; color: #fff; margin-top: 0.25rem;">Control Total de TIMEPLUS</h2>
          <p style="color: #94A3B8; font-size: 0.8125rem;">SuperAdmin: ${user.email} | Nube de Supabase Cloud en Vivo</p>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn-primary" style="background: #16A34A;" onclick="window.timeplusAddClientPrompt()">
            <span>➕</span> Registrar Cliente Manual
          </button>
          <button class="btn-primary" style="background: #4F46E5;" onclick="window.timeplusRouter.navigate('hoy')">
            Ver Centro de Control →
          </button>
        </div>
      </div>

      <!-- Métricas Globales de Control de Plataforma -->
      <div class="grid-cols-4" style="margin-top: 1.5rem;" id="admin-kpi-cards">
        <div class="stat-card">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: #EFF6FF; color: #1D4ED8;">👥</div>
            <div class="stat-card-value" id="kpi-total-clients" style="color: #1D4ED8;">-</div>
          </div>
          <div class="stat-card-title">Total Solicitudes</div>
          <div class="stat-card-desc">Clientes en Supabase Cloud</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: #DCFCE7; color: #15803D;">✅</div>
            <div class="stat-card-value" id="kpi-approved-clients" style="color: #15803D;">-</div>
          </div>
          <div class="stat-card-title">Clientes Aprobados</div>
          <div class="stat-card-desc">Con acceso activo al sistema</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: #FEF3C7; color: #B45309;">⏳</div>
            <div class="stat-card-value" id="kpi-pending-clients" style="color: #B45309;">-</div>
          </div>
          <div class="stat-card-title">Pendientes de Aprobación</div>
          <div class="stat-card-desc">Esperando tu confirmación</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: #FAF5FF; color: #7E22CE;">⚡</div>
            <div class="stat-card-value" style="color: #7E22CE;">100%</div>
          </div>
          <div class="stat-card-title">Estado Plataforma</div>
          <div class="stat-card-desc">Supabase en Tiempo Real</div>
        </div>
      </div>

      <!-- Tabla Maestra de Gestión de Clientes -->
      <div class="timeline-card" style="margin-top: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h3>Gestión y Control de Clientes</h3>
            <p style="font-size: 0.75rem; color: #64748B;">Aprueba o revoca el acceso de cualquier cliente con 1 clic.</p>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input type="text" id="admin-client-filter" placeholder="Buscar por nombre o correo..."
                   oninput="window.timeplusFilterAdminClients(this.value)"
                   style="padding: 0.45rem 0.75rem; border: 1px solid #E2E8F0; border-radius: var(--radius-md); font-size: 0.75rem; width: 14rem;">
            <button class="btn-secondary" onclick="window.timeplusRefreshAdmin()">🔄 Refrescar</button>
          </div>
        </div>

        <div id="admin-requests-table-container">
          <p style="font-size: 0.8125rem; color: #64748B;">Cargando solicitudes desde la nube de Supabase...</p>
        </div>
      </div>
    `;

    // Cargar datos de Supabase y calcular KPIs
    if (supabase) {
      const requests = await supabase.getClientRequests();
      window._allAdminRequests = requests;

      // Actualizar KPIs
      const approvedCount = requests.filter(r => (r.status || '').trim().toLowerCase() === 'aprobado').length;
      const pendingCount = requests.filter(r => (r.status || '').trim().toLowerCase() !== 'aprobado').length;

      const elTotal = document.getElementById('kpi-total-clients');
      const elApp = document.getElementById('kpi-approved-clients');
      const elPend = document.getElementById('kpi-pending-clients');
      if (elTotal) elTotal.innerText = requests.length;
      if (elApp) elApp.innerText = approvedCount;
      if (elPend) elPend.innerText = pendingCount;

      renderAdminTableRows(requests);
    }
  }

  function renderAdminTableRows(requests) {
    const container = document.getElementById('admin-requests-table-container');
    if (!container) return;

    if (!requests || requests.length === 0) {
      container.innerHTML = `<p style="font-size: 0.8125rem; color: #64748B; padding: 1.5rem 0; text-align: center;">No se encontraron solicitudes de clientes.</p>`;
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Email</th>
            <th>Plan</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Acciones de Control</th>
          </tr>
        </thead>
        <tbody>
          ${requests.map(r => {
            const isAprobado = (r.status || '').trim().toLowerCase() === 'aprobado';
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : 'Reciente';
            return `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <div style="width: 1.75rem; height: 1.75rem; border-radius: 50%; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.75rem;">
                    ${(r.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <strong>${r.name || 'Sin nombre'}</strong>
                </div>
              </td>
              <td>${r.email}</td>
              <td><span class="timeline-badge" style="background: #EFF6FF; color: #1D4ED8;">${r.plan || 'Connect Pro'}</span></td>
              <td style="font-size: 0.75rem; color: #64748B;">${dateStr}</td>
              <td>
                <span class="timeline-badge" style="background: ${isAprobado ? '#DCFCE7' : '#FEF3C7'}; color: ${isAprobado ? '#15803D' : '#B45309'}; font-weight: 800;">
                  ${isAprobado ? '✅ Aprobado' : '⏳ ' + (r.status || 'Pendiente')}
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 0.35rem; align-items: center;">
                  ${!isAprobado ? `
                    <button class="btn-primary" style="padding: 0.3rem 0.75rem; font-size: 0.6875rem; background: #16A34A;" onclick="window.timeplusApproveRequest('${r.id}')">
                      ✓ Aprobar Acceso
                    </button>
                  ` : `
                    <button class="btn-secondary" style="padding: 0.3rem 0.65rem; font-size: 0.6875rem; color: #DC2626; border-color: #FCA5A5;" onclick="window.timeplusRevokeRequest('${r.id}')">
                      Revocar
                    </button>
                  `}
                  <button class="btn-secondary" style="padding: 0.3rem 0.5rem; font-size: 0.6875rem;" onclick="window.timeplusInspectClient('${r.id}')" title="Ver detalles del cliente">
                    🔍 Detalle
                  </button>
                </div>
              </td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    `;
  }

  // --- 2. VISTA DE CLIENTE: MÓDULO DE CLIENTES (SOLO VEN SUS DATOS) ---
  function renderProfile() {
    const user = store.getCurrentUser();
    if (!user) {
      showLandingView();
      return;
    }

    // Calcular datos exclusivos de este cliente
    const acts = store.getActivities();
    const meds = acts.filter(a => a.type === 'medicamento');
    const workouts = acts.filter(a => a.category === 'fitness');
    const meetings = acts.filter(a => a.type && a.type.startsWith('reunion'));
    const allPlaces = store.getPlaces ? store.getPlaces() : [];
    const customPlaces = allPlaces.filter(p => !['plc-home', 'plc-work', 'plc-gym', 'plc-family'].includes(p.id));

    contentEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 800; color: #2563EB;">
            <span>👤</span> <span>MÓDULO DE CLIENTE</span>
          </div>
          <h2 style="font-size: 1.75rem; margin-top: 0.25rem;">Mi Perfil &amp; Mis Datos Privados</h2>
          <p style="font-size: 0.8125rem; color: #64748B;">
            Espacio seguro. Tu cuenta está aislada: únicamente tú tienes acceso a tus actividades, salud y datos.
          </p>
        </div>
        <div>
          <button class="btn-primary" onclick="window.timeplusOpenEditProfileModal()" style="display: flex; align-items: center; gap: 0.45rem; padding: 0.55rem 1.25rem; font-size: 0.8125rem; background: linear-gradient(135deg, #2563EB, #1D4ED8); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
            <span>✏️</span> <span>Editar Mi Información</span>
          </button>
        </div>
      </div>

      <!-- Tarjeta de Identidad del Cliente -->
      <div class="timeline-card" style="padding: 2rem;">
        <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;">
          <div style="width: 4.5rem; height: 4.5rem; border-radius: 50%; background: linear-gradient(135deg, #2563EB, #4F46E5); color: #fff; font-size: 2rem; font-weight: 900; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">
            ${(user.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <h3 style="font-size: 1.5rem; font-weight: 900;">${user.name || 'Cliente TIMEPLUS'}</h3>
              <span class="timeline-badge" style="background: #DCFCE7; color: #15803D; font-weight: 800;">
                ✅ Cuenta Aprobada por SuperAdmin
              </span>
            </div>
            <p style="color: #64748B; font-size: 0.875rem; margin-top: 0.25rem;">
              ✉️ <strong>Correo:</strong> ${user.email} &nbsp;|&nbsp; 📋 <strong>Plan:</strong> ${user.plan || 'TIMEPLUS Connect Pro'} &nbsp;|&nbsp; 🎓 <strong>Tipo:</strong> ${user.userType || 'Estudiante'}
            </p>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.65rem; font-size: 0.8125rem; color: #334155; background: #F8FAFC; padding: 0.65rem 1rem; border-radius: var(--radius-md); border: 1px solid #E2E8F0;">
              <div>📱 <strong>WhatsApp:</strong> ${user.phone || 'No registrado'}</div>
              <div>🪪 <strong>Doc:</strong> ${user.docType || 'CC'} ${user.docNumber || 'No registrado'}</div>
              <div>🎂 <strong>Nacimiento:</strong> ${user.birthDate || 'No registrada'}</div>
              <div>📍 <strong>Ciudad:</strong> ${user.city || 'No registrada'} (${user.country || 'Colombia'})</div>
            </div>
            <p style="font-size: 0.75rem; color: #94A3B8; margin-top: 0.4rem;">
              ID de Cliente: <code>${user.id || 'usr-active'}</code> &nbsp;|&nbsp; Rol: <strong>Cliente Autorizado</strong>
            </p>
          </div>
        </div>

        <!-- 4 Bloques Detallados del Expediente del Cliente (Con botón Editar) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 1.5rem;">
          
          <!-- Bloque 1: Datos Personales -->
          <div style="background: #ffffff; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <div style="font-weight: 800; font-size: 0.8125rem; color: #2563EB; display: flex; align-items: center; gap: 0.35rem;">
                <span>👤</span> <span>1. INFORMACIÓN PERSONAL</span>
              </div>
              <button class="btn-secondary" onclick="window.timeplusOpenEditProfileModal('personal')" style="padding: 0.2rem 0.55rem; font-size: 0.6875rem;">✏️ Editar</button>
            </div>
            <div style="font-size: 0.8125rem; display: flex; flex-direction: column; gap: 0.45rem; color: #334155;">
              <div><span style="color:#64748B;">Tipo de Persona:</span> <strong>${user.personType || 'Persona Natural'}</strong></div>
              <div><span style="color:#64748B;">Nombres y Apellidos:</span> <strong>${user.name || 'Cliente'}</strong></div>
              ${(user.firstName || user.lastName1) ? `
                <div style="font-size:0.75rem; color:#475569; background:#F8FAFC; padding:0.35rem 0.6rem; border-radius:4px; border:1px solid #E2E8F0; line-height:1.4;">
                  <div>• 1er Nombre: <strong>${user.firstName || '—'}</strong> | 2do: <strong>${user.secondName || '—'}</strong></div>
                  <div>• 1er Apellido: <strong>${user.lastName1 || user.lastName || '—'}</strong> | 2do: <strong>${user.lastName2 || '—'}</strong></div>
                </div>
              ` : ''}
              <div><span style="color:#64748B;">Documento:</span> <strong>${user.docType || 'CC'} ${user.docNumber || 'No especificado'}</strong></div>
              <div><span style="color:#64748B;">Fecha de Nacimiento:</span> <strong>${user.birthDate || 'No registrada'}</strong></div>
              <div><span style="color:#64748B;">Género:</span> <strong>${user.gender || 'No especificado'}</strong></div>
              <div><span style="color:#64748B;">País de Origen:</span> <strong>${user.country || 'Colombia'}</strong></div>
            </div>
          </div>

          <!-- Bloque 2: Información Académica / Profesional -->
          <div style="background: #ffffff; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <div style="font-weight: 800; font-size: 0.8125rem; color: #7C3AED; display: flex; align-items: center; gap: 0.35rem;">
                <span>🎓</span> <span>2. FICHA ACADÉMICA / PROFESIONAL</span>
              </div>
              <button class="btn-secondary" onclick="window.timeplusOpenEditProfileModal('academico')" style="padding: 0.2rem 0.55rem; font-size: 0.6875rem;">✏️ Editar</button>
            </div>
            <div style="font-size: 0.8125rem; display: flex; flex-direction: column; gap: 0.45rem; color: #334155;">
              <div><span style="color:#64748B;">Nivel Educativo:</span> <strong>${user.academicLevel || 'Universitario'}</strong></div>
              <div><span style="color:#64748B;">Institución:</span> <strong>${user.institution || 'No especificada'}</strong></div>
              <div><span style="color:#64748B;">Programa / Carrera:</span> <strong>${user.program || 'No especificado'}</strong></div>
              <div><span style="color:#64748B;">Semestre / Grado:</span> <strong>${user.semester || 'No especificado'}</strong></div>
              <div><span style="color:#64748B;">Áreas de Interés:</span> <strong>${user.interests || 'Inteligencia Artificial, Productividad'}</strong></div>
              <div><span style="color:#64748B;">Objetivo IA:</span> <em>${user.learningGoal || 'Organizar tiempos y rendimiento con TIMEPLUS'}</em></div>
            </div>
          </div>

          <!-- Bloque 3: Ubicaciones & Rutas de Movilidad IA -->
          <div style="background: #ffffff; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <div style="font-weight: 800; font-size: 0.8125rem; color: #059669; display: flex; align-items: center; gap: 0.35rem;">
                <span>🚗</span> <span>3. MOVILIDAD &amp; RUTAS FRECUENTES</span>
              </div>
              <button class="btn-secondary" onclick="window.timeplusOpenEditProfileModal('movilidad')" style="padding: 0.2rem 0.55rem; font-size: 0.6875rem;">✏️ Editar</button>
            </div>
            <div style="font-size: 0.8125rem; display: flex; flex-direction: column; gap: 0.45rem; color: #334155;">
              <div><span style="color:#64748B;">Ciudad Base:</span> <strong>${user.city || 'Bogotá, Colombia'}</strong></div>
              <div><span style="color:#64748B;">🏠 Residencia (Casa):</span> <strong>${user.addrHome || 'Registrada'}</strong></div>
              <div><span style="color:#64748B;">🏢 Trabajo / Estudio:</span> <strong>${user.addrWork || 'No registrada'}</strong></div>
              <div><span style="color:#64748B;">👨‍👩‍👧 Familiar / Alternativo:</span> <strong>${user.addrFamily || 'No registrada'}</strong></div>
              <div><span style="color:#64748B;">🏋️ Sede Gimnasio:</span> <strong>${user.addrGym || 'SmartFit / Sede Habitual'}</strong></div>

              ${customPlaces.length > 0 ? `
                <div style="margin-top: 0.4rem; border-top: 1px dashed #CBD5E1; padding-top: 0.4rem;">
                  <div style="font-weight: 700; color: #0F172A; font-size: 0.73rem; margin-bottom: 0.25rem;">📍 Sedes & Lugares Frecuentes Adicionales (${customPlaces.length}):</div>
                  <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                    ${customPlaces.map(cp => {
                      const icon = cp.category === 'amigo' ? '👥' : cp.category === 'familiar' ? '👨‍👩‍👦' : cp.category === 'cajero' ? '🏧' : cp.category === 'centro_comercial' ? '🛍️' : '📍';
                      return `<div style="font-size:0.72rem; color:#475569;">${icon} <strong>${cp.name}:</strong> ${cp.address}</div>`;
                    }).join('')}
                  </div>
                </div>
              ` : ''}
              
              <!-- Rutas IA Inteligentes -->
              <div style="margin-top: 0.5rem; padding: 0.5rem; background: #F0FDF4; border: 1px dashed #86EFAC; border-radius: 0.5rem; font-size: 0.75rem;">
                <div style="font-weight: 700; color: #166534; margin-bottom: 0.2rem;">🤖 Rutas monitoreadas por IA:</div>
                <div style="color: #15803D;">• Casa ➔ Gym: ~25-35 min</div>
                <div style="color: #15803D;">• Trabajo ➔ Gym: ~15-20 min</div>
                <div style="color: #15803D;">• Familiar ➔ Gym: ~30 min</div>
              </div>
            </div>
          </div>

          <!-- Bloque 4: Preferencias & Cuenta -->
          <div style="background: #ffffff; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <div style="font-weight: 800; font-size: 0.8125rem; color: #D97706; display: flex; align-items: center; gap: 0.35rem;">
                <span>⚙️</span> <span>4. PREFERENCIAS &amp; CUENTA</span>
              </div>
              <button class="btn-secondary" onclick="window.timeplusOpenEditProfileModal('preferencias')" style="padding: 0.2rem 0.55rem; font-size: 0.6875rem;">✏️ Editar</button>
            </div>
            <div style="font-size: 0.8125rem; display: flex; flex-direction: column; gap: 0.45rem; color: #334155;">
              <div><span style="color:#64748B;">Plan Activo:</span> <strong style="color:#2563EB;">${user.plan || 'TIMEPLUS Connect Pro'}</strong></div>
              <div><span style="color:#64748B;">Notificaciones:</span> <strong>${user.notifyPref || 'WhatsApp'}</strong></div>
              <div><span style="color:#64748B;">Disponibilidad:</span> <strong>${user.availability || 'Lunes a Viernes (Flexible)'}</strong></div>
              <div><span style="color:#64748B;">Zona Horaria:</span> <strong>${user.timezone || 'America/Bogota (COT -5)'}</strong></div>
              <div><span style="color:#64748B;">Estado de Cuenta:</span> <span style="background:#DCFCE7;color:#15803D;padding:0.1rem 0.4rem;border-radius:4px;font-weight:700;font-size:0.75rem;">ACTIVO</span></div>
            </div>
          </div>

        </div>

        <!-- Alerta de Aislamiento y Privacidad -->
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: var(--radius-md); padding: 1rem; margin-top: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.5rem;">🔒</span>
          <div style="font-size: 0.75rem; color: #166534;">
            <strong>Aislamiento de Datos Garantizado:</strong>
            Tu cuenta tiene partición de datos exclusiva. Ningún otro cliente puede visualizar tus actividades, medicamentos, proyectos ni historial.
          </div>
        </div>
      </div>

      <!-- Resumen de Datos Privados del Cliente -->
      <div style="margin-top: 1.5rem;">
        <h3 style="font-size: 1.125rem; margin-bottom: 0.75rem;">Resumen de Mis Datos en el Sistema</h3>
        <div class="grid-cols-4">
          <div class="stat-card" onclick="window.timeplusRouter.navigate('agenda')">
            <div class="stat-card-top">
              <div class="stat-card-icon" style="background: #EFF6FF; color: #1D4ED8;">📅</div>
              <div class="stat-card-value" style="color: #1D4ED8;">${acts.length}</div>
            </div>
            <div class="stat-card-title">Mis Actividades</div>
            <div class="stat-card-desc">Solo visibles por ti</div>
          </div>

          <div class="stat-card" onclick="window.timeplusRouter.navigate('salud')">
            <div class="stat-card-top">
              <div class="stat-card-icon" style="background: #FEFCE8; color: #A16207;">💊</div>
              <div class="stat-card-value" style="color: #A16207;">${meds.length}</div>
            </div>
            <div class="stat-card-title">Mis Medicamentos</div>
            <div class="stat-card-desc">Recordatorios activos</div>
          </div>

          <div class="stat-card" onclick="window.timeplusRouter.navigate('fitness')">
            <div class="stat-card-top">
              <div class="stat-card-icon" style="background: #FFF7ED; color: #C2410C;">🏋️</div>
              <div class="stat-card-value" style="color: #C2410C;">${workouts.length}</div>
            </div>
            <div class="stat-card-title">Mis Entrenamientos</div>
            <div class="stat-card-desc">Historial personal</div>
          </div>

          <div class="stat-card" onclick="window.timeplusRouter.navigate('reuniones')">
            <div class="stat-card-top">
              <div class="stat-card-icon" style="background: #F5F3FF; color: #7E22CE;">💻</div>
              <div class="stat-card-value" style="color: #7E22CE;">${meetings.length}</div>
            </div>
            <div class="stat-card-title">Mis Reuniones</div>
            <div class="stat-card-desc">Enlaces y agenda</div>
          </div>
        </div>
      </div>

      <!-- Acciones de Cuenta de Cliente -->
      <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap;">
        <button class="btn-primary" onclick="window.timeplusOpenEditProfileModal()" style="background: linear-gradient(135deg, #2563EB, #1D4ED8);">
          ✏️ Editar Mis Datos &amp; Rutas
        </button>
        <button class="btn-primary" style="background: #4F46E5;" onclick="window.timeplusRouter.navigate('hoy')">
          Ir a mi Centro de Control HOY →
        </button>
        <button class="btn-secondary" onclick="window.timeplusAI.toggleVoice()">
          🎙️ Dictar a la IA
        </button>
        <button class="btn-secondary" onclick="timeplusLogout()" style="color: #EF4444; border-color: #FCA5A5;">
          Cerrar Sesión Segura
        </button>
      </div>
    `;
  }

  // --- LOGIN / AUTENTICACIÓN ---
  function renderLogin(targetRole = 'client') {
    contentEl.innerHTML = `
      <div style="max-width: 26rem; margin: 3rem auto;" class="timeline-card">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div class="brand-icon" style="margin: 0 auto 0.75rem;">T+</div>
          <h2>Iniciar Sesión en TIMEPLUS</h2>
          <p style="font-size: 0.75rem;">Ingresa a tu Sistema Operativo de Organización</p>
        </div>

        <form onsubmit="event.preventDefault(); window.timeplusDoLogin();" style="display: flex; flex-direction: column; gap: 0.875rem;">
          <div>
            <label style="font-size: 0.75rem; font-weight: 700;">Correo Electrónico</label>
            <input type="email" id="login-email-input" required 
                   value="${targetRole === 'admin' ? 'ces.rodriguez200@gmail.com' : 'usuario@timeplus.ai'}"
                   style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-card); border-radius: var(--radius-md); font-size: 0.8125rem; margin-top: 0.25rem;">
          </div>
          <div>
            <label style="font-size: 0.75rem; font-weight: 700;">Contraseña</label>
            <input type="password" id="login-pass-input" required
                   value="${targetRole === 'admin' ? '16278465' : '123456'}"
                   style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-card); border-radius: var(--radius-md); font-size: 0.8125rem; margin-top: 0.25rem;">
          </div>
          <button type="submit" class="btn-primary" style="justify-content: center; margin-top: 0.5rem; padding: 0.75rem;">
            Ingresar al Sistema
          </button>
        </form>

        <div style="margin-top: 1rem; text-align: center; font-size: 0.75rem;">
          ${targetRole === 'admin' ? `
            <a href="#/login" style="color: var(--primary); font-weight: bold;">Acceder como Cliente Normal</a>
          ` : `
            <a href="#/admin" style="color: #A16207; font-weight: bold;">👑 Acceso Maestro SuperAdmin</a>
          `}
        </div>
      </div>
    `;
  }

  // --- Global Window Handlers ---
  window.timeplusSendAICommand = () => {
    const input = document.getElementById('ai-omni-input');
    if (input && input.value.trim()) {
      ai.processCommand(input.value.trim());
      input.value = '';
    }
  };

  window.timeplusRunPrompt = (promptText) => {
    ai.processCommand(promptText);
  };

  window.timeplusConfirmMed = (actId, taken = true) => {
    const res = store.confirmMedication(actId, taken);
    if (taken) {
      if (res && res.medication) {
        const med = res.medication;
        const daily = (Number(med.takesPerDay) || 1) * (Number(med.dosePerTake) || 1);
        const days = daily > 0 ? Math.floor(med.currentStock / daily) : 0;
        window.timeplusShowToast(`✅ Toma confirmada. Te quedan <strong>${med.currentStock}</strong> pastillas (${days} días de tratamiento).`);
      } else {
        window.timeplusShowToast('✅ Medicamento confirmado como tomado.');
      }
    } else {
      window.timeplusShowToast('⏳ Recordatorio de medicamento pospuesto.');
    }
    const hash = location.hash.replace('#','') || 'hoy';
    if (hash === 'salud') renderHealth();
    if (hash === 'hoy' || hash === 'today' || hash === '') renderToday();
  };

  // --- Cronómetro / Stopwatch de Mi Tiempo ---
  let _stopwatchInterval = null;
  let _stopwatchSeconds = 0;
  let _stopwatchRunning = false;

  window.timeplusToggleStopwatch = () => {
    const btn = document.getElementById('tp-stopwatch-btn');
    const status = document.getElementById('tp-stopwatch-status');
    const display = document.getElementById('tp-stopwatch-display');
    const taskInput = document.getElementById('tp-stopwatch-task');

    if (!_stopwatchRunning) {
      _stopwatchRunning = true;
      if (btn) {
        btn.innerHTML = '⏸️ Pausar y Guardar';
        btn.style.background = '#F59E0B';
      }
      if (status) {
        status.innerText = 'En Curso';
        status.style.background = '#ECFDF5';
        status.style.color = '#047857';
      }
      _stopwatchInterval = setInterval(() => {
        _stopwatchSeconds++;
        const hrs = String(Math.floor(_stopwatchSeconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((_stopwatchSeconds % 3600) / 60)).padStart(2, '0');
        const secs = String(_stopwatchSeconds % 60).padStart(2, '0');
        if (display) display.innerText = `${hrs}:${mins}:${secs}`;
      }, 1000);
    } else {
      _stopwatchRunning = false;
      clearInterval(_stopwatchInterval);
      if (btn) {
        btn.innerHTML = '▶️ Iniciar Tiempo';
        btn.style.background = '#10B981';
      }
      if (status) {
        status.innerText = 'En Pausa';
        status.style.background = '#FEF3C7';
        status.style.color = '#92400E';
      }

      // Guardar registro si corrió al menos 5 segundos
      if (_stopwatchSeconds >= 5) {
        const taskName = (taskInput && taskInput.value.trim()) || 'Sesión de Trabajo / Estudio';
        const mins = Math.max(1, Math.round(_stopwatchSeconds / 60));
        store.addActivity({
          title: `⏱️ ${taskName} (${mins} min)`,
          category: 'estudio',
          type: 'personal',
          duration: `${mins}m`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          notes: 'Registrado con el cronómetro de Mi Tiempo en Vivo'
        });
        window.timeplusShowToast(`✅ Se guardaron ${mins} minutos en tu agenda.`);
        renderToday();
      }
    }
  };

  window.timeplusResetStopwatch = () => {
    _stopwatchRunning = false;
    clearInterval(_stopwatchInterval);
    _stopwatchSeconds = 0;
    const btn = document.getElementById('tp-stopwatch-btn');
    const status = document.getElementById('tp-stopwatch-status');
    const display = document.getElementById('tp-stopwatch-display');
    if (display) display.innerText = '00:00:00';
    if (btn) {
      btn.innerHTML = '▶️ Iniciar Tiempo';
      btn.style.background = '#10B981';
    }
    if (status) {
      status.innerText = 'En Pausa';
      status.style.background = '#FEF3C7';
      status.style.color = '#92400E';
    }
  };

  window.timeplusDeleteActivity = (actId) => {
    if (confirm('¿Deseas eliminar esta actividad de tu día y agenda?')) {
      store.deleteActivity(actId);
      window.timeplusShowToast('🗑️ Actividad eliminada correctamente.');
      const hash = location.hash.replace('#','') || 'hoy';
      if (typeof updateUIForRole === 'function') updateUIForRole();
      if (typeof renderToday === 'function' && (hash === 'today' || hash === 'hoy' || hash === '')) renderToday();
      if (typeof renderAgenda === 'function' && hash === 'agenda') renderAgenda();
      if (typeof renderHealth === 'function' && hash === 'salud') renderHealth();
    }
  };

  window.timeplusDeleteMedication = (medId) => {
    if (confirm('¿Deseas eliminar este medicamento de tu dispensario y agenda?')) {
      store.deleteMedication(medId);
      window.timeplusShowToast('🗑️ Medicamento eliminado.');
      renderHealth();
    }
  };

  window.timeplusRestockPrompt = (medId, medName) => {
    const qtyStr = prompt(`¿Cuántas unidades adicionales vas a ingresar al dispensario para ${medName}? (Ej: 30 pastillas):`, '30');
    if (qtyStr && !isNaN(qtyStr) && Number(qtyStr) > 0) {
      store.restockMedication(medId, Number(qtyStr));
      window.timeplusShowToast(`📦 ¡Dispensario recargado con +${qtyStr} pastillas para ${medName}!`);
      renderHealth();
    }
  };

  window.timeplusShowBuyReminder = (medName) => {
    const promptMsg = `Comprar repuesto de ${medName} en farmacia / dispensario`;
    ai.processCommand(`Agendar recordatorio urgente: ${promptMsg} para mañana a las 9:00 AM`);
    window.timeplusShowToast(`🛒 ¡Recordatorio de compra creado con éxito para "${medName}"!`);
  };

  window.timeplusOpenAddMedicationModal = () => {
    if (document.getElementById('tp-add-med-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'tp-add-med-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(10,10,30,0.78);backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;padding:16px;
    `;

    overlay.innerHTML = `
      <div style="
        background:linear-gradient(145deg,#151c2e,#0d111e);
        border:1px solid rgba(16,185,129,0.35);
        border-radius:20px;width:100%;max-width:500px;
        box-shadow:0 25px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(16,185,129,0.1);
        overflow:hidden;animation:tpSlideUp .28s cubic-bezier(.34,1.56,.64,1);
      ">
        <!-- Header -->
        <div style="
          background:linear-gradient(135deg,#059669,#10b981);
          padding:18px 24px;display:flex;align-items:center;justify-content:space-between;
        ">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="
              width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:12px;
              display:flex;align-items:center;justify-content:center;font-size:20px;
            ">💊</div>
            <div>
              <div style="color:#fff;font-size:17px;font-weight:700;">Dispensario & Receta Médica</div>
              <div style="color:rgba(255,255,255,0.8);font-size:12px;">Control de stock y aviso antes de que se acaben</div>
            </div>
          </div>
          <button onclick="window.timeplusCloseAddMedicationModal()" style="
            background:rgba(255,255,255,0.15);border:none;color:#fff;
            width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:18px;
            display:flex;align-items:center;justify-content:center;
          ">✕</button>
        </div>

        <!-- Formulario -->
        <div style="padding:22px;display:flex;flex-direction:column;gap:14px;max-height:68vh;overflow-y:auto;">
          
          <div>
            <label style="color:#6ee7b7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:5px;">
              💊 Nombre del Medicamento / Tratamiento *
            </label>
            <input id="tp-med-name" type="text" placeholder="Ej: Losartán 50mg, Levotiroxina, Omeprazol..." class="login-panel-input" style="width:100%;box-sizing:border-box;" />
          </div>

          <!-- Cuadrícula: Stock Inicial + Unidad -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="color:#6ee7b7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:5px;">
                📦 Pastillas en Caja / Frasco *
              </label>
              <input id="tp-med-stock" type="number" value="30" min="1" class="login-panel-input" style="width:100%;box-sizing:border-box;" />
            </div>
            <div>
              <label style="color:#6ee7b7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:5px;">
                📏 Presentación
              </label>
              <select id="tp-med-unit" class="login-panel-input" style="width:100%;box-sizing:border-box;">
                <option value="pastillas">Pastillas / Tabletas</option>
                <option value="cápsulas">Cápsulas</option>
                <option value="gotas">Gotas</option>
                <option value="sobres">Sobres</option>
                <option value="inyecciones">Inyecciones</option>
              </select>
            </div>
          </div>

          <!-- Cuadrícula: Frecuencia de Toma -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="color:#6ee7b7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:5px;">
                ⏰ Dosis por cada toma
              </label>
              <input id="tp-med-dose-take" type="number" value="1" min="1" class="login-panel-input" style="width:100%;box-sizing:border-box;" />
            </div>
            <div>
              <label style="color:#6ee7b7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:5px;">
                🔁 Tomas al día
              </label>
              <select id="tp-med-takes-day" class="login-panel-input" style="width:100%;box-sizing:border-box;">
                <option value="1">1 vez al día</option>
                <option value="2">2 veces al día (cada 12h)</option>
                <option value="3">3 veces al día (cada 8h)</option>
                <option value="4">4 veces al día (cada 6h)</option>
              </select>
            </div>
          </div>

          <!-- Hora principal de la toma -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="color:#6ee7b7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:5px;">
                🕐 Hora de la toma principal
              </label>
              <input id="tp-med-time" type="time" value="08:00" class="login-panel-input" style="width:100%;box-sizing:border-box;" />
            </div>
            <div>
              <label style="color:#6ee7b7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:5px;">
                🚨 Alerta de Repuesto
              </label>
              <div style="padding:10px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;font-size:11px;color:#fcd34d;">
                Avisarme cuando queden <strong>4 días</strong> o menos.
              </div>
            </div>
          </div>

          <!-- Instrucciones del médico -->
          <div>
            <label style="color:#6ee7b7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:5px;">
              📝 Indicaciones Médicas
            </label>
            <input id="tp-med-instructions" type="text" placeholder="Ej: Tomar en ayunas con abundante agua" class="login-panel-input" style="width:100%;box-sizing:border-box;" />
          </div>

        </div>

        <!-- Footer -->
        <div style="
          padding:16px 24px;border-top:1px solid rgba(16,185,129,0.2);
          display:flex;gap:12px;justify-content:flex-end;
          background:rgba(0,0,0,0.25);
        ">
          <button onclick="window.timeplusCloseAddMedicationModal()" style="
            background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
            color:#94a3b8;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:14px;
          ">
            ✕ Cancelar
          </button>
          <button onclick="window.timeplusSaveNewMedication()" style="
            background:linear-gradient(135deg,#059669,#10b981);
            border:none;color:#fff;padding:10px 22px;border-radius:10px;cursor:pointer;
            font-size:14px;font-weight:600;
            box-shadow:0 4px 15px rgba(16,185,129,0.4);
          ">
            💾 Guardar en Dispensario
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) window.timeplusCloseAddMedicationModal(); });
    setTimeout(() => document.getElementById('tp-med-name')?.focus(), 100);
  };

  window.timeplusCloseAddMedicationModal = () => {
    const el = document.getElementById('tp-add-med-overlay');
    if (el) el.remove();
  };

  window.timeplusSaveNewMedication = () => {
    const name = (document.getElementById('tp-med-name')?.value || '').trim();
    if (!name) {
      alert('Por favor indica el nombre del medicamento.');
      document.getElementById('tp-med-name')?.focus();
      return;
    }

    const stock = Number(document.getElementById('tp-med-stock')?.value) || 30;
    const unit = document.getElementById('tp-med-unit')?.value || 'pastillas';
    const dosePerTake = Number(document.getElementById('tp-med-dose-take')?.value) || 1;
    const takesPerDay = Number(document.getElementById('tp-med-takes-day')?.value) || 1;
    const time = document.getElementById('tp-med-time')?.value || '08:00';
    const instructions = document.getElementById('tp-med-instructions')?.value || '';

    const newMed = {
      name,
      initialStock: stock,
      currentStock: stock,
      unit,
      dosePerTake,
      takesPerDay,
      time,
      instructions
    };

    store.addMedication(newMed);
    window.timeplusCloseAddMedicationModal();
    window.timeplusShowToast(`💊 "${name}" registrado en dispensario (${stock} unidades).`);
    renderHealth();
  };

  window.timeplusResolveConflict = (actId) => {
    const nextSlot = '17:00';
    store.updateActivity(actId, { time: nextSlot });
    window.timeplusShowToast(`✓ Conflicto resuelto. Actividad reprogramada para las ${nextSlot}.`);
  };

  window.timeplusOrganizeMyDay = () => {
    ai.processCommand('Organízame el día');
  };

  window.timeplusProcessInbox = (id, text) => {
    ai.processCommand(text);
    store.removeInboxItem(id);
    window.timeplusShowToast('✓ Mensaje convertido en actividad de agenda.');
  };

  window.timeplusDoLogin = async () => {
    const email = document.getElementById('login-email-input').value.trim();
    const pass = document.getElementById('login-pass-input').value;
    window.timeplusShowToast('Verificando autorización en Supabase Cloud...');

    const result = await store.loginWithApproval(email, pass);
    if (result.success) {
      window.timeplusShowToast(`¡Bienvenido, ${result.user.name}! 👋`);
      router.navigate(result.user.role === 'admin' ? 'admin' : 'hoy');
    } else {
      alert(`⛔ ACCESO DENEGADO:\n\n${result.reason}`);
      window.timeplusShowToast(`⛔ ${result.reason}`);
    }
  };

  window.timeplusApproveRequest = async (id) => {
    if (supabase) {
      const ok = await supabase.updateRequestStatus(id, 'aprobado');
      if (ok) {
        window.timeplusShowToast('✅ Solicitud aprobada con éxito en Supabase Cloud.');
        renderAdmin();
      }
    }
  };

  window.timeplusRevokeRequest = async (id) => {
    if (supabase) {
      const ok = await supabase.updateRequestStatus(id, 'pendiente');
      if (ok) {
        window.timeplusShowToast('⚠️ Acceso revocado a estado PENDIENTE.');
        renderAdmin();
      }
    }
  };

  window.timeplusRefreshAdmin = () => {
    renderAdmin();
  };

  window.timeplusShowToast = (msg) => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  window.timeplusOpenNewActivityModal = () => {
    if (document.getElementById('tp-new-activity-overlay')) return;

    const user = store.state.user || {};
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

    const overlay = document.createElement('div');
    overlay.id = 'tp-new-activity-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(10,10,30,0.75);backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;padding:16px;
    `;

    overlay.innerHTML = `
      <div id="tp-activity-modal" style="
        background:linear-gradient(145deg,#1a1a3e,#0f0f2d);
        border:1px solid rgba(99,102,241,0.35);
        border-radius:20px;width:100%;max-width:520px;
        box-shadow:0 25px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(99,102,241,0.1);
        overflow:hidden;animation:tpSlideUp .28s cubic-bezier(.34,1.56,.64,1);
      ">
        <!-- Header -->
        <div style="
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          padding:20px 24px;display:flex;align-items:center;justify-content:space-between;
        ">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="
              width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:12px;
              display:flex;align-items:center;justify-content:center;font-size:18px;
            ">📅</div>
            <div>
              <div style="color:#fff;font-size:17px;font-weight:700;letter-spacing:.3px;">Nueva Actividad</div>
              <div style="color:rgba(255,255,255,0.7);font-size:12px;">Agrega un evento a tu agenda</div>
            </div>
          </div>
          <button onclick="window.timeplusCloseNewActivityModal()" style="
            background:rgba(255,255,255,0.15);border:none;color:#fff;
            width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:18px;
            display:flex;align-items:center;justify-content:center;transition:background .2s;
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">✕</button>
        </div>

        <!-- Body -->
        <div style="padding:24px;display:flex;flex-direction:column;gap:16px;max-height:65vh;overflow-y:auto;">

          <!-- Título -->
          <div>
            <label style="color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">
              📝 Título de la actividad *
            </label>
            <input id="tp-act-title" type="text" placeholder="Ej: Reunión con el equipo..." class="login-panel-input" style="width:100%;box-sizing:border-box;" />
          </div>

          <!-- Categoría + Tipo en grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">
                🏷️ Categoría
              </label>
              <select id="tp-act-category" class="login-panel-input" style="width:100%;box-sizing:border-box;" onchange="window.timeplusActivityCategoryChange()">
                <option value="trabajo">💼 Trabajo</option>
                <option value="personal">🌱 Personal</option>
                <option value="salud">💊 Salud</option>
                <option value="estudio">📚 Estudio</option>
                <option value="fitness">🏋️ Fitness</option>
                <option value="urgente">🚨 Urgente</option>
                <option value="otros">📌 Otros</option>
              </select>
            </div>
            <div>
              <label style="color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">
                📋 Tipo
              </label>
              <select id="tp-act-type" class="login-panel-input" style="width:100%;box-sizing:border-box;">
                <option value="personal">Personal</option>
                <option value="reunion_virtual">Reunión Virtual</option>
                <option value="cita_presencial">Cita Presencial</option>
                <option value="medicamento">Medicamento</option>
                <option value="fitness">Fitness / Deporte</option>
                <option value="entrega_trabajo">Entrega / Tarea</option>
              </select>
            </div>
          </div>

          <!-- Fecha + Hora + Duración en grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div>
              <label style="color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">
                📆 Fecha
              </label>
              <input id="tp-act-date" type="date" value="${todayStr}" class="login-panel-input" style="width:100%;box-sizing:border-box;" />
            </div>
            <div>
              <label style="color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">
                🕐 Hora
              </label>
              <input id="tp-act-time" type="time" value="${timeStr}" class="login-panel-input" style="width:100%;box-sizing:border-box;" />
            </div>
            <div>
              <label style="color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">
                ⏱️ Duración
              </label>
              <select id="tp-act-duration" class="login-panel-input" style="width:100%;box-sizing:border-box;">
                <option value="15min">15 min</option>
                <option value="30min">30 min</option>
                <option value="45min">45 min</option>
                <option value="1h" selected>1 hora</option>
                <option value="1.5h">1.5 horas</option>
                <option value="2h">2 horas</option>
                <option value="todo_el_dia">Todo el día</option>
              </select>
            </div>
          </div>

          <!-- Campo condicional: Dosis (salud/medicamento) -->
          <div id="tp-act-dosis-wrap" style="display:none;">
            <label style="color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">
              💊 Dosis / Medicamento
            </label>
            <input id="tp-act-dosis" type="text" placeholder="Ej: Losartán 50mg — 1 comprimido" class="login-panel-input" style="width:100%;box-sizing:border-box;" />
          </div>

          <!-- Campo condicional: Enlace reunión -->
          <div id="tp-act-meetlink-wrap" style="display:none;">
            <label style="color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">
              🔗 Enlace de reunión
            </label>
            <input id="tp-act-meetlink" type="url" placeholder="https://meet.google.com/..." class="login-panel-input" style="width:100%;box-sizing:border-box;" />
          </div>

          <!-- Campo condicional: Ejercicios fitness -->
          <div id="tp-act-fitness-wrap" style="display:none;">
            <label style="color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">
              🏋️ Ejercicios / Rutina
            </label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
              ${['🏃 Cardio','💪 Fuerza','🧘 Yoga','🚴 Ciclismo','🏊 Natación','⚽ Deporte'].map(e=>`
                <button onclick="this.style.background=this.style.background.includes('6366f1')?'rgba(255,255,255,0.05)':'rgba(99,102,241,0.4)';this.style.borderColor=this.style.borderColor.includes('6366f1')?'rgba(255,255,255,0.15)':'#6366f1';document.getElementById('tp-act-fitness-text').value=(document.getElementById('tp-act-fitness-text').value?document.getElementById('tp-act-fitness-text').value+', ':'')+this.textContent.trim()" style="
                  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);
                  color:#e2e8f0;border-radius:20px;padding:5px 12px;cursor:pointer;font-size:12px;transition:all .2s;
                ">${e}</button>
              `).join('')}
            </div>
            <input id="tp-act-fitness-text" type="text" placeholder="O describe tu rutina..." class="login-panel-input" style="width:100%;box-sizing:border-box;" />
          </div>

          <!-- Notas -->
          <div>
            <label style="color:#a5b4fc;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">
              📝 Notas / Descripción
            </label>
            <textarea id="tp-act-notes" rows="3" placeholder="Detalles adicionales... (opcional)" class="login-panel-input" style="width:100%;box-sizing:border-box;resize:vertical;"></textarea>
          </div>

        </div>

        <!-- Footer -->
        <div style="
          padding:16px 24px;border-top:1px solid rgba(99,102,241,0.2);
          display:flex;gap:12px;justify-content:flex-end;
          background:rgba(0,0,0,0.2);
        ">
          <button onclick="window.timeplusCloseNewActivityModal()" style="
            background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
            color:#94a3b8;padding:10px 20px;border-radius:10px;cursor:pointer;font-size:14px;
            transition:all .2s;
          " onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.07)'">
            ✕ Cancelar
          </button>
          <button onclick="window.timeplusSaveNewActivity()" style="
            background:linear-gradient(135deg,#6366f1,#8b5cf6);
            border:none;color:#fff;padding:10px 24px;border-radius:10px;cursor:pointer;
            font-size:14px;font-weight:600;
            box-shadow:0 4px 15px rgba(99,102,241,0.4);
            transition:all .2s;
          " onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 20px rgba(99,102,241,0.55)'"
             onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 15px rgba(99,102,241,0.4)'">
            💾 Agendar Actividad
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) window.timeplusCloseNewActivityModal(); });
    setTimeout(() => document.getElementById('tp-act-title')?.focus(), 100);
  };

  window.timeplusActivityCategoryChange = () => {
    const cat = document.getElementById('tp-act-category')?.value || '';
    const typeEl = document.getElementById('tp-act-type');
    document.getElementById('tp-act-dosis-wrap').style.display = (cat === 'salud') ? 'block' : 'none';
    document.getElementById('tp-act-meetlink-wrap').style.display = (cat === 'trabajo') ? 'block' : 'none';
    document.getElementById('tp-act-fitness-wrap').style.display = (cat === 'fitness') ? 'block' : 'none';
    if (cat === 'salud' && typeEl) typeEl.value = 'medicamento';
    if (cat === 'fitness' && typeEl) typeEl.value = 'fitness';
    if (cat === 'trabajo' && typeEl) typeEl.value = 'reunion_virtual';
  };

  window.timeplusCloseNewActivityModal = () => {
    const el = document.getElementById('tp-new-activity-overlay');
    if (el) el.remove();
  };

  window.timeplusSaveNewActivity = () => {
    const title = (document.getElementById('tp-act-title')?.value || '').trim();
    if (!title) {
      const inp = document.getElementById('tp-act-title');
      if (inp) { inp.style.borderColor = '#ef4444'; inp.focus(); }
      timeplusShowToast('⚠️ El título es obligatorio');
      return;
    }

    const user = store.state.user || {};
    const category = document.getElementById('tp-act-category')?.value || 'personal';
    const type = document.getElementById('tp-act-type')?.value || 'personal';
    const date = document.getElementById('tp-act-date')?.value || new Date().toISOString().slice(0,10);
    const time = document.getElementById('tp-act-time')?.value || '08:00';
    const duration = document.getElementById('tp-act-duration')?.value || '1h';
    const notes = document.getElementById('tp-act-notes')?.value || '';
    const dosis = document.getElementById('tp-act-dosis')?.value || '';
    const meetLink = document.getElementById('tp-act-meetlink')?.value || '';
    const fitnessText = document.getElementById('tp-act-fitness-text')?.value || '';

    const newActivity = {
      id: 'act-' + Date.now(),
      title,
      category,
      type,
      time,
      date,
      duration,
      notes: [notes, dosis ? '💊 ' + dosis : '', fitnessText ? '🏋️ ' + fitnessText : ''].filter(Boolean).join(' | '),
      meetLink,
      userEmail: user.email || '',
      userId: user.id || '',
      userName: user.name || '',
      confirmedTaken: false,
      attendees: [],
      exercises: fitnessText ? fitnessText.split(',').map(s => s.trim()).filter(Boolean) : [],
      subtasks: [],
      travelTimeMin: 0,
    };

    const act = store.addActivity(newActivity);

    // Si es medicamento y se especificó dosis, asegurar que exista en el dispensario con stock mensual
    if (category === 'salud' || type === 'medicamento') {
      if (store.addMedication) {
        store.addMedication({
          name: title.replace(/^Medicamento\s*[—–-]\s*/i, ''),
          initialStock: 30,
          currentStock: 30,
          unit: 'pastillas',
          dosePerTake: 1,
          takesPerDay: 1,
          time: time,
          instructions: dosis || notes || 'Tomar 1 pastilla al día'
        });
      }
    }

    window.timeplusCloseNewActivityModal();
    timeplusShowToast('✅ Actividad agendada correctamente');

    // Refresh current view
    const hash = location.hash.replace('#','') || 'today';
    if (typeof updateUIForRole === 'function') updateUIForRole();
    if (typeof renderToday === 'function' && (hash === 'today' || hash === 'hoy' || hash === '')) renderToday();
    if (typeof renderAgenda === 'function' && hash === 'agenda') renderAgenda();
    if (typeof renderHealth === 'function' && hash === 'salud') renderHealth();
  };

  window.timeplusFilterAdminClients = (query) => {
    const q = (query || '').trim().toLowerCase();
    const all = window._allAdminRequests || [];
    if (!q) {
      renderAdminTableRows(all);
      return;
    }
    const filtered = all.filter(r => 
      (r.name || '').toLowerCase().includes(q) || 
      (r.email || '').toLowerCase().includes(q) ||
      (r.plan || '').toLowerCase().includes(q)
    );
    renderAdminTableRows(filtered);
  };

  window.timeplusInspectClient = (id) => {
    const all = window._allAdminRequests || [];
    const client = all.find(r => r.id === id);
    if (!client) return;

    let extra = {};
    if (client.notes) {
      try { extra = JSON.parse(client.notes); } catch(e) { extra = { notes: client.notes }; }
    }

    const phone = client.phone || extra.phone || 'No registrado';
    const birth = client.birth_date || extra.birthDate || 'No registrada';
    const city  = client.city || extra.city || 'No registrada';
    const isApp = (client.status || '').trim().toLowerCase() === 'aprobado';

    const dossier = 
      `📋 EXPEDIENTE MAESTRO DE CLIENTE (Supabase Cloud)\n` +
      `══════════════════════════════════════════════════\n\n` +
      `🔐 1. DATOS DE CUENTA & ACCESO:\n` +
      `• Tipo de Usuario: ${extra.userType || 'Estudiante'}\n` +
      `• Correo de Acceso: ${client.email}\n` +
      `• Teléfono / WhatsApp: ${phone}\n` +
      `• ID de Registro: ${client.id}\n` +
      `• Fecha de Registro: ${client.created_at ? new Date(client.created_at).toLocaleString() : 'Reciente'}\n\n` +
      `👤 2. DATOS PERSONALES:\n` +
      `• Nombre Completo: ${client.name || 'Sin nombre'}\n` +
      `• Tipo de Persona: ${extra.personType || 'Natural'}\n` +
      `• Documento: ${extra.docType || 'CC'} ${extra.docNumber || 'No registrado'}\n` +
      `• Fecha de Nacimiento: ${birth}\n` +
      `• Género: ${extra.gender || 'No especificado'}\n` +
      `• País / Ciudad: ${extra.country || 'Colombia'} — ${city}\n\n` +
      `🎓 3. FICHA ACADÉMICA / PROFESIONAL:\n` +
      `• Nivel Educativo: ${extra.academicLevel || 'No especificado'}\n` +
      `• Institución: ${extra.institution || 'No especificada'}\n` +
      `• Carrera / Programa: ${extra.program || 'No especificado'}\n` +
      `• Semestre / Grado: ${extra.semester || 'No especificado'}\n` +
      `• Áreas de Interés: ${extra.interests || 'No especificadas'}\n` +
      `• Objetivo de Aprendizaje: ${extra.learningGoal || 'Organizar tiempos de estudio con IA'}\n\n` +
      `📍 4. UBICACIONES & RUTAS FRECUENTES (MOVILIDAD IA):\n` +
      `• 🏠 Residencia (Casa): ${extra.addrHome || 'No registrada'}\n` +
      `• 🏢 Trabajo / Estudio: ${extra.addrWork || 'No registrada'}\n` +
      `• 👨‍👩‍👧 Familiar / Alternativo: ${extra.addrFamily || 'No registrada'}\n` +
      `• 🏋️ Gimnasio / Sede Habitual: ${extra.addrGym || 'No registrada'}\n` +
      `• Monitoreo de Rutas IA: Casa ➔ Gym | Trabajo ➔ Gym | Familiar ➔ Gym\n\n` +
      `⚙️ 5. PREFERENCIAS & PLAN:\n` +
      `• Plan Elegido: ${client.plan || 'TIMEPLUS Connect Pro'}\n` +
      `• Disponibilidad Horaria: ${extra.availability || 'Flexible'}\n` +
      `• Canal Notificaciones: ${extra.notifyPref || 'WhatsApp'}\n` +
      `• Zona Horaria: ${extra.timezone || 'America/Bogota'}\n\n` +
      `══════════════════════════════════════════════════\n` +
      `ESTADO ACTUAL: ${isApp ? '✅ APROBADO (Acceso Activo)' : '⏳ PENDIENTE DE APROBACIÓN'}\n` +
      (isApp 
        ? `ℹ️ Este cliente solo puede ver sus propios datos privados.` 
        : `⚠️ Para habilitar el acceso a este cliente, haz clic en "Aprobar Acceso".`);

    alert(dossier);
  };

  window.timeplusAddClientPrompt = async () => {
    const name = prompt('Nombre del nuevo cliente:');
    if (!name || !name.trim()) return;
    const email = prompt('Correo electrónico del cliente:');
    if (!email || !email.trim()) return;
    const plan = prompt('Plan del cliente (Presiona Enter para TIMEPLUS Connect Pro):') || 'TIMEPLUS Connect Pro';

    if (supabase) {
      window.timeplusShowToast('Registrando cliente en Supabase Cloud...');
      const res = await supabase.registerClientRequest(name.trim(), email.trim(), plan);
      if (res.ok) {
        window.timeplusShowToast('✅ Cliente registrado en Supabase Cloud.');
        renderAdmin();
      } else {
        alert('Error: ' + res.error);
      }
    }
  };

  // --- MODAL DE EDICIÓN DE PERFIL DE CLIENTE ---
  window.timeplusOpenEditProfileModal = (sectionToFocus = '') => {
    const user = store.getCurrentUser();
    if (!user) return;

    let modal = document.getElementById('profile-edit-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'profile-edit-modal';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.background = 'rgba(15, 23, 42, 0.65)';
      modal.style.backdropFilter = 'blur(4px)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '9999';
      modal.style.padding = '1rem';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:#fff;border-radius:1.25rem;width:100%;max-width:38rem;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);position:relative;padding:1.75rem;">
        <button onclick="window.timeplusCloseEditProfileModal()" style="position:absolute;top:1rem;right:1rem;border:none;background:none;font-size:1.25rem;cursor:pointer;color:#94A3B8;">✕</button>

        <div style="margin-bottom:1.25rem;">
          <div style="font-size:0.75rem;font-weight:800;color:#2563EB;">EDITAR PERFIL &amp; RUTAS</div>
          <h2 style="font-size:1.35rem;font-weight:900;margin-top:0.2rem;">Actualizar Mis Datos Privados</h2>
          <p style="font-size:0.75rem;color:#64748B;">Modifica tus datos y rutas. Se sincronizarán automáticamente con tu cuenta y la nube de Supabase.</p>
        </div>

        <form onsubmit="event.preventDefault(); window.timeplusSaveProfileChanges();" style="display:flex;flex-direction:column;gap:1rem;">
          
          <!-- Bloque 1: Personal (Con 2 Nombres + 2 Apellidos y Código de País Automático) -->
          <div id="section-personal" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:0.75rem;padding:1rem;">
            <div style="font-size:0.75rem;font-weight:800;color:#2563EB;margin-bottom:0.6rem;display:flex;align-items:center;gap:0.35rem;">
              <span>👤</span> <span>1. INFORMACIÓN PERSONAL</span>
            </div>

            <!-- 2 Nombres + 2 Apellidos -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Primer Nombre *</label>
                <input type="text" id="edit-firstname" value="${user.firstName || (user.name ? user.name.split(' ')[0] : '')}" class="login-panel-input" placeholder="Ej: Rafael" required oninput="window.timeplusSyncFullName()">
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Segundo Nombre</label>
                <input type="text" id="edit-secondname" value="${user.secondName || (user.name ? (user.name.split(' ')[2] ? user.name.split(' ')[1] : '') : '')}" class="login-panel-input" placeholder="Ej: Antonio (opcional)" oninput="window.timeplusSyncFullName()">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Primer Apellido *</label>
                <input type="text" id="edit-lastname1" value="${user.lastName1 || (user.name ? (user.name.split(' ').length > 1 ? user.name.split(' ').slice(-2, -1)[0] || user.name.split(' ')[1] : '') : '')}" class="login-panel-input" placeholder="Ej: Carvajal" required oninput="window.timeplusSyncFullName()">
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Segundo Apellido</label>
                <input type="text" id="edit-lastname2" value="${user.lastName2 || (user.name ? (user.name.split(' ').length > 2 ? user.name.split(' ').slice(-1)[0] : '') : '')}" class="login-panel-input" placeholder="Ej: Gómez (opcional)" oninput="window.timeplusSyncFullName()">
              </div>
            </div>

            <input type="hidden" id="edit-name" value="${user.name || ''}">

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Tipo de Persona</label>
                <select id="edit-persontype" class="login-panel-input" style="background:#fff;">
                  <option value="Natural" ${user.personType === 'Natural' ? 'selected' : ''}>Persona Natural</option>
                  <option value="Jurídica" ${user.personType === 'Jurídica' ? 'selected' : ''}>Persona Jurídica</option>
                </select>
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Tipo de Documento</label>
                <select id="edit-doctype" class="login-panel-input" style="background:#fff;">
                  <option value="CC" ${user.docType === 'CC' ? 'selected' : ''}>CC — Cédula de Ciudadanía</option>
                  <option value="TI" ${user.docType === 'TI' ? 'selected' : ''}>TI — Tarjeta de Identidad</option>
                  <option value="CE" ${user.docType === 'CE' ? 'selected' : ''}>CE — Cédula de Extranjería</option>
                  <option value="Pasaporte" ${user.docType === 'Pasaporte' ? 'selected' : ''}>Pasaporte</option>
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Número de Documento</label>
                <input type="text" id="edit-docnum" value="${user.docNumber || ''}" class="login-panel-input" placeholder="Ej: 1012345678">
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Fecha de Nacimiento</label>
                <input type="date" id="edit-birthdate" value="${user.birthDate || ''}" class="login-panel-input">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Género</label>
                <select id="edit-gender" class="login-panel-input" style="background:#fff;">
                  <option value="" ${!user.gender ? 'selected' : ''}>— Prefiero no decir —</option>
                  <option value="Masculino" ${user.gender === 'Masculino' ? 'selected' : ''}>Masculino</option>
                  <option value="Femenino" ${user.gender === 'Femenino' ? 'selected' : ''}>Femenino</option>
                  <option value="No binario" ${user.gender === 'No binario' ? 'selected' : ''}>No binario</option>
                  <option value="Otro" ${user.gender === 'Otro' ? 'selected' : ''}>Otro</option>
                </select>
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">País de Residencia</label>
                <select id="edit-country" class="login-panel-input" style="background:#fff;" onchange="window.timeplusOnCountryChange(this.value)">
                  <option value="Colombia" ${(user.country === 'Colombia' || !user.country) ? 'selected' : ''}>🇨🇴 Colombia (+57)</option>
                  <option value="México" ${user.country === 'México' ? 'selected' : ''}>🇲🇽 México (+52)</option>
                  <option value="Perú" ${user.country === 'Perú' ? 'selected' : ''}>🇵🇪 Perú (+51)</option>
                  <option value="Chile" ${user.country === 'Chile' ? 'selected' : ''}>🇨🇱 Chile (+56)</option>
                  <option value="Argentina" ${user.country === 'Argentina' ? 'selected' : ''}>🇦🇷 Argentina (+54)</option>
                  <option value="España" ${user.country === 'España' ? 'selected' : ''}>🇪🇸 España (+34)</option>
                  <option value="Estados Unidos" ${user.country === 'Estados Unidos' ? 'selected' : ''}>🇺🇸 Estados Unidos (+1)</option>
                  <option value="Ecuador" ${user.country === 'Ecuador' ? 'selected' : ''}>🇪🇨 Ecuador (+593)</option>
                  <option value="Panamá" ${user.country === 'Panamá' ? 'selected' : ''}>🇵🇦 Panamá (+507)</option>
                  <option value="Venezuela" ${user.country === 'Venezuela' ? 'selected' : ''}>🇻🇪 Venezuela (+58)</option>
                </select>
              </div>
            </div>

            <div>
              <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Celular / WhatsApp (con código de país automático)</label>
              <input type="tel" id="edit-phone" value="${user.phone || '+57 '}" class="login-panel-input" placeholder="+57 310 123 4567">
            </div>
          </div>

          <!-- Bloque 2: Académico -->
          <div id="section-academico" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:0.75rem;padding:1rem;">
            <div style="font-size:0.75rem;font-weight:800;color:#7C3AED;margin-bottom:0.6rem;display:flex;align-items:center;gap:0.35rem;">
              <span>🎓</span> <span>2. INFORMACIÓN ACADÉMICA / PROFESIONAL</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Nivel Educativo</label>
                <select id="edit-acadlevel" class="login-panel-input" style="background:#fff;">
                  <option value="Primaria" ${user.academicLevel === 'Primaria' ? 'selected' : ''}>Primaria</option>
                  <option value="Secundaria" ${user.academicLevel === 'Secundaria' ? 'selected' : ''}>Secundaria / Bachillerato</option>
                  <option value="Técnico" ${user.academicLevel === 'Técnico' ? 'selected' : ''}>Técnico / Tecnólogo</option>
                  <option value="Universitario" ${user.academicLevel === 'Universitario' || !user.academicLevel ? 'selected' : ''}>Universitario</option>
                  <option value="Posgrado" ${user.academicLevel === 'Posgrado' ? 'selected' : ''}>Posgrado / Maestría</option>
                  <option value="Doctorado" ${user.academicLevel === 'Doctorado' ? 'selected' : ''}>Doctorado</option>
                </select>
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Institución / Universidad</label>
                <input type="text" id="edit-institution" value="${user.institution || ''}" class="login-panel-input" placeholder="Ej: Universidad XYZ">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Programa / Carrera</label>
                <input type="text" id="edit-program" value="${user.program || ''}" class="login-panel-input" placeholder="Ej: Ingeniería de Sistemas">
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Semestre / Grado</label>
                <input type="text" id="edit-semester" value="${user.semester || ''}" class="login-panel-input" placeholder="Ej: 4.° semestre">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Áreas / Materias de Interés</label>
                <input type="text" id="edit-interests" value="${user.interests || ''}" class="login-panel-input" placeholder="Ej: Inteligencia Artificial, Negocios">
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Objetivo de Aprendizaje</label>
                <input type="text" id="edit-goal" value="${user.learningGoal || ''}" class="login-panel-input" placeholder="Ej: Organizar tiempos con IA">
              </div>
            </div>
          </div>

          <!-- Bloque 3: Ubicaciones & Rutas Movilidad IA (Lista Desplegable y Puntos Múltiples) -->
          <div id="section-movilidad" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:0.75rem;padding:1rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
              <div style="font-size:0.75rem;font-weight:800;color:#059669;display:flex;align-items:center;gap:0.35rem;">
                <span>🚗</span> <span>3. UBICACIONES &amp; RUTAS DE MOVILIDAD IA</span>
              </div>
              <button type="button" onclick="window.timeplusToggleCustomPlacesAccordion()" style="background:none;border:none;color:#059669;font-weight:700;font-size:0.75rem;cursor:pointer;">
                ▼ Ver / Agregar Más Sedes
              </button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">🌆 Ciudad Base</label>
                <input type="text" id="edit-city" value="${user.city || ''}" class="login-panel-input" placeholder="Ej: Bogotá, Colombia">
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">🏠 Dirección Casa / Residencia</label>
                <input type="text" id="edit-addr-home" value="${user.addrHome || ''}" class="login-panel-input" placeholder="Ej: Cra 7 # 45-20">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">🏢 Dirección Trabajo / Estudio</label>
                <input type="text" id="edit-addr-work" value="${user.addrWork || ''}" class="login-panel-input" placeholder="Dirección de trabajo o campus">
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">👨‍👩‍👧 Dirección Familiar Principal</label>
                <input type="text" id="edit-addr-family" value="${user.addrFamily || ''}" class="login-panel-input" placeholder="Dirección familiar">
              </div>
            </div>

            <div style="margin-bottom:0.75rem;">
              <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">🏋️ Sede Gimnasio Habitual</label>
              <input type="text" id="edit-addr-gym" value="${user.addrGym || ''}" class="login-panel-input" placeholder="Ej: SmartFit Calle 100, Bogotá">
            </div>

            <!-- ACORDEÓN DESPLEGABLE: AGREGAR VARIOS FAMILIARES, AMIGOS, CAJEROS, CENTROS COMERCIALES -->
            <div id="tp-custom-places-accordion" style="background:#ffffff;border:1px dashed #10B981;border-radius:0.5rem;padding:0.85rem;margin-top:0.5rem;">
              <div style="font-size:0.75rem;font-weight:800;color:#065F46;margin-bottom:0.4rem;display:flex;justify-content:space-between;align-items:center;">
                <span>📍 Sedes Adicionales (Amigos, Cajeros, Centros Comerciales)</span>
                <span style="font-size:0.68rem;color:#059669;font-weight:600;">Monitoreadas por IA</span>
              </div>

              <!-- Formulario rápido para añadir ubicación -->
              <div style="display:grid;grid-template-columns:1fr 1.2fr 1fr auto;gap:0.4rem;align-items:center;margin-bottom:0.6rem;">
                <select id="tp-new-place-cat" class="login-panel-input" style="font-size:0.7rem;padding:0.35rem;">
                  <option value="amigo">👥 Casa de Amigo(a)</option>
                  <option value="familiar">👨‍👩‍👧 Casa Familiar</option>
                  <option value="cajero">🏧 Cajero Automático</option>
                  <option value="centro_comercial">🛍️ Centro Comercial</option>
                  <option value="otro">📌 Otro Lugar</option>
                </select>
                <input type="text" id="tp-new-place-name" placeholder="Nombre (ej: Titán Plaza, Mamá, Cajero Bancolombia)" class="login-panel-input" style="font-size:0.7rem;padding:0.35rem;">
                <input type="text" id="tp-new-place-address" placeholder="Dirección exacta" class="login-panel-input" style="font-size:0.7rem;padding:0.35rem;">
                <button type="button" onclick="window.timeplusAddCustomPlaceFromModal()" style="background:#10B981;color:#fff;border:none;padding:0.4rem 0.75rem;border-radius:6px;font-size:0.72rem;font-weight:700;cursor:pointer;">
                  ＋ Añadir
                </button>
              </div>

              <!-- Lista de lugares registrados -->
              <div id="tp-custom-places-list" style="display:flex;flex-direction:column;gap:0.35rem;max-height:160px;overflow-y:auto;">
                ${(store.getPlaces ? store.getPlaces() : []).map(p => `
                  <div style="display:flex;justify-content:space-between;align-items:center;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:0.4rem 0.6rem;font-size:0.72rem;">
                    <div>
                      <strong>${p.name}</strong> 
                      <span style="color:#64748B;">(${p.address || 'Sin dirección'})</span>
                    </div>
                    <button type="button" onclick="window.timeplusRemoveCustomPlace('${p.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:0.8rem;" title="Eliminar">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Bloque 4: Preferencias -->
          <div id="section-preferencias" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:0.75rem;padding:1rem;">
            <div style="font-size:0.75rem;font-weight:800;color:#D97706;margin-bottom:0.6rem;display:flex;align-items:center;gap:0.35rem;">
              <span>⚙️</span> <span>4. PREFERENCIAS &amp; CUENTA</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Disponibilidad Horaria</label>
                <input type="text" id="edit-availability" value="${user.availability || ''}" class="login-panel-input" placeholder="Ej: Lunes a Viernes 6pm-9pm">
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Notificaciones</label>
                <select id="edit-notify" class="login-panel-input" style="background:#fff;">
                  <option value="WhatsApp" ${user.notifyPref === 'WhatsApp' ? 'selected' : ''}>📱 WhatsApp</option>
                  <option value="App" ${user.notifyPref === 'App' ? 'selected' : ''}>🔔 Notificaciones App</option>
                  <option value="Correo" ${user.notifyPref === 'Correo' ? 'selected' : ''}>✉️ Correo Electrónico</option>
                </select>
              </div>
            </div>
            <div>
              <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Zona Horaria</label>
              <select id="edit-timezone" class="login-panel-input" style="background:#fff;">
                <option value="America/Bogota" ${user.timezone === 'America/Bogota' || !user.timezone ? 'selected' : ''}>America/Bogota (COT -5)</option>
                <option value="America/Mexico_City" ${user.timezone === 'America/Mexico_City' ? 'selected' : ''}>America/Mexico_City (CST -6)</option>
                <option value="America/Lima" ${user.timezone === 'America/Lima' ? 'selected' : ''}>America/Lima (PET -5)</option>
                <option value="America/Santiago" ${user.timezone === 'America/Santiago' ? 'selected' : ''}>America/Santiago (CLT -3)</option>
                <option value="America/Buenos_Aires" ${user.timezone === 'America/Buenos_Aires' ? 'selected' : ''}>America/Buenos_Aires (ART -3)</option>
                <option value="Europe/Madrid" ${user.timezone === 'Europe/Madrid' ? 'selected' : ''}>Europe/Madrid (CET +1)</option>
              </select>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:0.5rem;">
            <button type="button" class="btn-secondary" onclick="window.timeplusCloseEditProfileModal()">Cancelar</button>
            <button type="submit" id="btn-save-profile" class="btn-primary" style="background:linear-gradient(135deg,#16A34A,#15803D);padding:0.6rem 1.5rem;">
              💾 Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    `;
    modal.style.display = 'flex';

    if (sectionToFocus) {
      setTimeout(() => {
        const sec = document.getElementById('section-' + sectionToFocus);
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  window.timeplusCloseEditProfileModal = () => {
    const modal = document.getElementById('profile-edit-modal');
    if (modal) modal.style.display = 'none';
  };

  window.timeplusSaveProfileChanges = async () => {
    const btn = document.getElementById('btn-save-profile');
    if (btn) { btn.innerText = 'Guardando en Supabase...'; btn.disabled = true; }

    const firstName = (document.getElementById('edit-firstname')?.value || '').trim();
    const secondName = (document.getElementById('edit-secondname')?.value || '').trim();
    const lastName1 = (document.getElementById('edit-lastname1')?.value || '').trim();
    const lastName2 = (document.getElementById('edit-lastname2')?.value || '').trim();
    const fullName = [firstName, secondName, lastName1, lastName2].filter(Boolean).join(' ');

    const updated = {
      name: fullName || document.getElementById('edit-name').value.trim(),
      firstName,
      secondName,
      lastName1,
      lastName2,
      personType: document.getElementById('edit-persontype').value,
      docType: document.getElementById('edit-doctype').value,
      docNumber: document.getElementById('edit-docnum').value.trim(),
      birthDate: document.getElementById('edit-birthdate').value,
      gender: document.getElementById('edit-gender').value,
      phone: document.getElementById('edit-phone').value.trim(),
      country: document.getElementById('edit-country').value.trim(),
      academicLevel: document.getElementById('edit-acadlevel').value,
      institution: document.getElementById('edit-institution').value.trim(),
      program: document.getElementById('edit-program').value.trim(),
      semester: document.getElementById('edit-semester').value.trim(),
      interests: document.getElementById('edit-interests').value.trim(),
      learningGoal: document.getElementById('edit-goal').value.trim(),
      city: document.getElementById('edit-city').value.trim(),
      addrHome: document.getElementById('edit-addr-home').value.trim(),
      addrWork: document.getElementById('edit-addr-work').value.trim(),
      addrFamily: document.getElementById('edit-addr-family').value.trim(),
      addrGym: document.getElementById('edit-addr-gym').value.trim(),
      availability: document.getElementById('edit-availability').value.trim(),
      notifyPref: document.getElementById('edit-notify').value,
      timezone: document.getElementById('edit-timezone').value
    };

    try {
      await store.updateUserProfile(updated);
      window.timeplusCloseEditProfileModal();
      if (window.timeplusShowToast) window.timeplusShowToast('✅ ¡Perfil y rutas actualizados con éxito!');
      updateUIForRole();
      renderProfile();
    } catch(e) {
      if (btn) { btn.innerText = '💾 Guardar Cambios'; btn.disabled = false; }
      alert('Error guardando cambios: ' + e.message);
    }
  };

  // Sincronizador de 2 nombres + 2 apellidos
  window.timeplusSyncFullName = () => {
    const fn1 = (document.getElementById('edit-firstname')?.value || '').trim();
    const fn2 = (document.getElementById('edit-secondname')?.value || '').trim();
    const ln1 = (document.getElementById('edit-lastname1')?.value || '').trim();
    const ln2 = (document.getElementById('edit-lastname2')?.value || '').trim();
    const nameEl = document.getElementById('edit-name');
    if (nameEl) {
      nameEl.value = [fn1, fn2, ln1, ln2].filter(Boolean).join(' ');
    }
  };

  // Selector automático de indicativo según país
  window.timeplusOnCountryChange = (countryName) => {
    const phoneInput = document.getElementById('edit-phone');
    if (!phoneInput) return;
    const codes = {
      'Colombia': '+57',
      'México': '+52',
      'Perú': '+51',
      'Chile': '+56',
      'Argentina': '+54',
      'España': '+34',
      'Estados Unidos': '+1',
      'Ecuador': '+593',
      'Panamá': '+507',
      'Venezuela': '+58'
    };
    const code = codes[countryName] || '+57';
    let current = phoneInput.value.trim();
    // Reemplazar código anterior si existe
    current = current.replace(/^\+\d{1,4}\s*/, '');
    phoneInput.value = `${code} ${current}`.trim();
  };

  // Acordeón de sedes adicionales
  window.timeplusToggleCustomPlacesAccordion = () => {
    const acc = document.getElementById('tp-custom-places-accordion');
    if (acc) {
      acc.style.display = (acc.style.display === 'none') ? 'block' : 'none';
    }
  };

  // Agregar sede personalizada desde el modal (Amigos, Cajeros, Centros Comerciales)
  window.timeplusAddCustomPlaceFromModal = () => {
    const name = (document.getElementById('tp-new-place-name')?.value || '').trim();
    const address = (document.getElementById('tp-new-place-address')?.value || '').trim();
    const cat = document.getElementById('tp-new-place-cat')?.value || 'otro';

    if (!name) {
      alert('Por favor indica un nombre para el lugar (ej: Titán Plaza, Mamá, Cajero Bancolombia).');
      return;
    }

    const icons = {
      amigo: '👥',
      familiar: '👨‍👩‍👧',
      cajero: '🏧',
      centro_comercial: '🛍️',
      otro: '📍'
    };

    const newPlace = {
      name: `${icons[cat] || '📍'} ${name}`,
      address: address || 'Ubicación frecuente',
      category: cat,
      visitsCount: 1,
      avgTravelTime: '~15-25 min'
    };

    store.addPlace(newPlace);

    // Limpiar inputs
    document.getElementById('tp-new-place-name').value = '';
    document.getElementById('tp-new-place-address').value = '';

    // Actualizar lista en el modal
    const list = document.getElementById('tp-custom-places-list');
    if (list) {
      const places = store.getPlaces();
      list.innerHTML = places.map(p => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:0.4rem 0.6rem;font-size:0.72rem;">
          <div>
            <strong>${p.name}</strong> 
            <span style="color:#64748B;">(${p.address || 'Sin dirección'})</span>
          </div>
          <button type="button" onclick="window.timeplusRemoveCustomPlace('${p.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:0.8rem;" title="Eliminar">✕</button>
        </div>
      `).join('');
    }

    window.timeplusShowToast(`📍 Sede "${name}" añadida a tus rutas de movilidad IA.`);
  };

  window.timeplusRemoveCustomPlace = (placeId) => {
    store.deletePlace(placeId);
    const list = document.getElementById('tp-custom-places-list');
    if (list) {
      const places = store.getPlaces();
      list.innerHTML = places.map(p => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:0.4rem 0.6rem;font-size:0.72rem;">
          <div>
            <strong>${p.name}</strong> 
            <span style="color:#64748B;">(${p.address || 'Sin dirección'})</span>
          </div>
          <button type="button" onclick="window.timeplusRemoveCustomPlace('${p.id}')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:0.8rem;" title="Eliminar">✕</button>
        </div>
      `).join('');
    }
  };

  // Mobile menu toggle
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('app-sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
});
