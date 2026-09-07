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
      <div class="timeline-item">
        <div class="timeline-time">${act.time}</div>
        <div class="timeline-badge" style="background: ${cat.bg}; color: ${cat.color}; border: 1px solid ${cat.border};">
          ${cat.icon} ${cat.name}
        </div>
        <div class="timeline-content">
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
      </div>
    `;
  }

  // --- 4. CALENDARIO INTELIGENTE (VISIÓN 4) ---
  function renderAgenda() {
    const acts = store.getActivities();
    contentEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div>
          <h2>Agenda Inteligente & Categorías</h2>
          <p style="font-size: 0.8125rem;">Visualiza y organiza tus bloques de tiempo por color.</p>
        </div>
        <button class="btn-primary" onclick="window.timeplusOpenNewActivityModal()">＋ Nueva Actividad</button>
      </div>

      <!-- Barra de Categorías Visuales (Visión 4) -->
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
        ${Object.keys(window.TIMEPLUS_CONFIG.CATEGORIES).map(k => {
          const c = window.TIMEPLUS_CONFIG.CATEGORIES[k];
          return `
            <span style="background: ${c.bg}; color: ${c.color}; border: 1px solid ${c.border}; padding: 0.25rem 0.65rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700;">
              ${c.icon} ${c.name}
            </span>
          `;
        }).join('')}
      </div>

      <div class="timeline-card">
        <div class="timeline-list">
          ${acts.length === 0 ? `
            <div style="text-align:center;padding:3rem 1.5rem;color:#64748B;">
              <div style="font-size:2rem;margin-bottom:0.5rem;">📅</div>
              <p style="font-weight:700;color:#1E293B;">No tienes actividades registradas en tu agenda.</p>
              <p style="font-size:0.8rem;margin-top:0.25rem;">Usa el botón superior "+ Nueva Actividad" para comenzar.</p>
            </div>
          ` : acts.map(a => renderTimelineItem(a)).join('')}
        </div>
      </div>
    `;
  }

  // --- 8. SALUD & MEDICAMENTOS (VISIÓN 8) ---
  function renderHealth() {
    const meds = store.getActivities().filter(a => a.type === 'medicamento');
    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Salud & Bienestar — Medicamentos</h2>
        <p style="font-size: 0.8125rem;">Registro de tomas, dosis y horarios con verificación activa de la IA.</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
        ${meds.length === 0 ? `
          <div style="grid-column:1/-1;text-align:center;padding:3rem 1.5rem;background:#F8FAFC;border:1.5px dashed #CBD5E1;border-radius:var(--radius-lg);color:#64748B;">
            <div style="font-size:2rem;margin-bottom:0.5rem;">💊</div>
            <p style="font-weight:700;color:#1E293B;">No tienes medicamentos programados.</p>
            <p style="font-size:0.8rem;margin-top:0.25rem;">Dile a la IA: <em>"Recuérdame tomar mi medicamento a las 8"</em> o agrégalo en tu agenda.</p>
          </div>
        ` : meds.map(m => `
          <div class="med-card">
            <div class="med-header">
              <span style="font-size: 1.5rem;">💊</span>
              <span style="font-size: 0.75rem; font-weight: 800; color: #A16207; background: #FEFCE8; padding: 0.2rem 0.5rem; border-radius: var(--radius-full);">
                ${m.time}
              </span>
            </div>
            <h4 style="font-size: 1rem; margin-top: 0.25rem;">${m.title}</h4>
            <p style="font-size: 0.75rem;">Dosis: <strong>${m.dosage || '1 dosis'}</strong></p>
            <p style="font-size: 0.6875rem; color: #64748B;">Estado: ${m.confirmedTaken ? '✅ Tomado hoy' : '⏳ Pendiente'}</p>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 0.75rem; margin-top: 0.25rem;">
              <span style="font-size: 0.75rem; font-weight: bold; display: block; margin-bottom: 0.5rem;">¿Tomaste este medicamento hoy?</span>
              <div class="med-actions">
                <button class="btn-confirm-yes" onclick="window.timeplusConfirmMed('${m.id}', true)">✓ Sí, tomado</button>
                <button class="btn-confirm-no" onclick="window.timeplusConfirmMed('${m.id}', false)">Recordar después</button>
              </div>
            </div>
          </div>
        `).join('')}
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
    store.confirmMedication(actId, taken);
    window.timeplusShowToast(taken ? '✅ Medicamento confirmado como tomado.' : '⏳ Recordatorio pospuesto.');
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

    store.addActivity(newActivity);
    window.timeplusCloseNewActivityModal();
    timeplusShowToast('✅ Actividad agendada correctamente');

    // Refresh current view
    const hash = location.hash.replace('#','') || 'today';
    if (typeof updateUIForRole === 'function') updateUIForRole();
    if (typeof renderToday === 'function' && (hash === 'today' || hash === '')) renderToday();
    if (typeof renderAgenda === 'function' && hash === 'agenda') renderAgenda();
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
          
          <!-- Bloque 1: Personal -->
          <div id="section-personal" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:0.75rem;padding:1rem;">
            <div style="font-size:0.75rem;font-weight:800;color:#2563EB;margin-bottom:0.6rem;display:flex;align-items:center;gap:0.35rem;">
              <span>👤</span> <span>1. INFORMACIÓN PERSONAL</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Nombre Completo</label>
                <input type="text" id="edit-name" value="${user.name || ''}" class="login-panel-input" required>
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Tipo de Persona</label>
                <select id="edit-persontype" class="login-panel-input" style="background:#fff;">
                  <option value="Natural" ${user.personType === 'Natural' ? 'selected' : ''}>Persona Natural</option>
                  <option value="Jurídica" ${user.personType === 'Jurídica' ? 'selected' : ''}>Persona Jurídica</option>
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Tipo de Documento</label>
                <select id="edit-doctype" class="login-panel-input" style="background:#fff;">
                  <option value="CC" ${user.docType === 'CC' ? 'selected' : ''}>CC — Cédula de Ciudadanía</option>
                  <option value="TI" ${user.docType === 'TI' ? 'selected' : ''}>TI — Tarjeta de Identidad</option>
                  <option value="CE" ${user.docType === 'CE' ? 'selected' : ''}>CE — Cédula de Extranjería</option>
                  <option value="Pasaporte" ${user.docType === 'Pasaporte' ? 'selected' : ''}>Pasaporte</option>
                </select>
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Número de Documento</label>
                <input type="text" id="edit-docnum" value="${user.docNumber || ''}" class="login-panel-input" placeholder="Ej: 1012345678">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Fecha de Nacimiento</label>
                <input type="date" id="edit-birthdate" value="${user.birthDate || ''}" class="login-panel-input">
              </div>
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
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Celular / WhatsApp</label>
                <input type="tel" id="edit-phone" value="${user.phone || ''}" class="login-panel-input" placeholder="+57 310 123 4567">
              </div>
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">País</label>
                <input type="text" id="edit-country" value="${user.country || 'Colombia'}" class="login-panel-input">
              </div>
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

          <!-- Bloque 3: Ubicaciones & Rutas Movilidad -->
          <div id="section-movilidad" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:0.75rem;padding:1rem;">
            <div style="font-size:0.75rem;font-weight:800;color:#059669;margin-bottom:0.6rem;display:flex;align-items:center;gap:0.35rem;">
              <span>🚗</span> <span>3. UBICACIONES &amp; RUTAS DE MOVILIDAD IA</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <div>
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">Ciudad Base</label>
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
                <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">👨‍👩‍👧 Dirección Familiar / Alternativo</label>
                <input type="text" id="edit-addr-family" value="${user.addrFamily || ''}" class="login-panel-input" placeholder="Dirección familiar">
              </div>
            </div>

            <div>
              <label style="font-size:0.7rem;font-weight:700;display:block;margin-bottom:0.2rem;">🏋️ Sede Gimnasio Habitual</label>
              <input type="text" id="edit-addr-gym" value="${user.addrGym || ''}" class="login-panel-input" placeholder="Ej: SmartFit Calle 100, Bogotá">
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

    const updated = {
      name: document.getElementById('edit-name').value.trim(),
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

  // Mobile menu toggle
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('app-sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
});
