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
    showAppView();
    viewFn();
  }

  // --- Router Registration con Guardia de Seguridad Estricta ---
  router.register('hoy', () => requireAuth(renderToday));
  router.register('inicio', () => renderLanding());
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
    router.handleRouting();
  });

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
              Tu Centro de Control personal impulsado por Inteligencia Artificial.
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

      <!-- 4 KPI Metrics Cards -->
      <div class="grid-cols-4" style="margin-top: 1.5rem;">
        <div class="stat-card" onclick="window.timeplusRouter.navigate('agenda')">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: var(--cat-trabajo-bg); color: var(--cat-trabajo-text);">📅</div>
            <div class="stat-card-value" style="color: var(--cat-trabajo-text);">${acts.length}</div>
          </div>
          <div class="stat-card-title">Actividades de Hoy</div>
          <div class="stat-card-desc">Eventos, citas y trabajo</div>
        </div>

        <div class="stat-card" onclick="window.timeplusRouter.navigate('salud')">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: var(--cat-salud-bg); color: var(--cat-salud-text);">💊</div>
            <div class="stat-card-value" style="color: var(--cat-salud-text);">1 / 1</div>
          </div>
          <div class="stat-card-title">Salud & Medicamentos</div>
          <div class="stat-card-desc">Toma confirmada</div>
        </div>

        <div class="stat-card" onclick="window.timeplusRouter.navigate('fitness')">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: var(--cat-fitness-bg); color: var(--cat-fitness-text);">🏋️</div>
            <div class="stat-card-value" style="color: var(--cat-fitness-text);">4 / 5</div>
          </div>
          <div class="stat-card-title">Días de Gimnasio</div>
          <div class="stat-card-desc">Meta semanal casi lista</div>
        </div>

        <div class="stat-card" onclick="window.timeplusRouter.navigate('lugares')">
          <div class="stat-card-top">
            <div class="stat-card-icon" style="background: var(--cat-personal-bg); color: var(--cat-personal-text);">📍</div>
            <div class="stat-card-value" style="color: var(--cat-personal-text);">3</div>
          </div>
          <div class="stat-card-title">Sedes Frecuentes</div>
          <div class="stat-card-desc">Conteo de visitas activo</div>
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
          ${acts.map(a => renderTimelineItem(a)).join('')}
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
          ${acts.map(a => renderTimelineItem(a)).join('')}
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
        ${meds.map(m => `
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
          ${workouts.map(w => `
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
        ${contacts.map(c => `
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
        ${places.map(p => `
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
    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Proyectos & Entregables</h2>
        <p style="font-size: 0.8125rem;">Gestión de objetivos divididos en fases y subtareas.</p>
      </div>

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
          ${meetings.map(m => renderTimelineItem(m)).join('')}
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
          ${apps.map(a => renderTimelineItem(a)).join('')}
        </div>
      </div>
    `;
  }

  // --- 14. VIAJES (VISIÓN 14) ---
  function renderTravel() {
    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Viajes & Itinerarios (Travel)</h2>
        <p style="font-size: 0.8125rem;">Itinerarios completos organizados por la IA: vuelos, hoteles y desplazamientos.</p>
      </div>

      <div class="timeline-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3>✈️ Próximo Viaje: Medellín (Gira Empresarial)</h3>
          <span class="timeline-badge" style="background: #EFF6FF; color: #1D4ED8;">Viernes 11 de Septiembre</span>
        </div>
        <div style="font-size: 0.8125rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <p>🛫 <strong>Vuelo Avianca AV9342:</strong> BOG → MDE (Salida: 07:15 a. m.)</p>
          <p>🏨 <strong>Hotel:</strong> The Click Clack Hotel Medellín (Check-in 14:00)</p>
          <p>💼 <strong>Reunión Clave:</strong> 15:30 con Junta Directiva en El Poblado</p>
        </div>
      </div>
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
          ${inbox.map(item => `
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

  // --- PANEL SUPERADMIN MAESTRO (SUPABASE CLOUD LIVE) ---
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
          </div>
          <h2 style="font-size: 1.75rem; color: #fff; margin-top: 0.25rem;">Control Total de TIMEPLUS</h2>
          <p style="color: #94A3B8; font-size: 0.8125rem;">SuperAdmin: ${user.email} | Supabase Cloud en Vivo</p>
        </div>
        <button class="btn-primary" style="background: #4F46E5;" onclick="window.timeplusRouter.navigate('hoy')">
          Ver Centro de Control Personal →
        </button>
      </div>

      <div class="timeline-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h3>Solicitudes de Clientes en Supabase Cloud</h3>
          <button class="btn-secondary" onclick="window.timeplusRefreshAdmin()">🔄 Actualizar</button>
        </div>

        <div id="admin-requests-table-container">
          <p style="font-size: 0.8125rem; color: #64748B;">Cargando solicitudes desde la nube de Supabase...</p>
        </div>
      </div>
    `;

    // Cargar datos reales de Supabase
    if (supabase) {
      const requests = await supabase.getClientRequests();
      const container = document.getElementById('admin-requests-table-container');
      if (!container) return;

      if (requests.length === 0) {
        container.innerHTML = `<p style="font-size: 0.8125rem; color: #64748B;">No hay solicitudes pendientes en este momento.</p>`;
        return;
      }

      container.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${requests.map(r => {
              const isAprobado = (r.status || '').trim().toLowerCase() === 'aprobado';
              return `
              <tr>
                <td><strong>${r.name || 'Sin nombre'}</strong></td>
                <td>${r.email}</td>
                <td><span class="timeline-badge" style="background: #EFF6FF; color: #1D4ED8;">${r.plan || 'Free'}</span></td>
                <td>
                  <span class="timeline-badge" style="background: ${isAprobado ? '#DCFCE7' : '#FEF3C7'}; color: ${isAprobado ? '#15803D' : '#B45309'}; font-weight: 800;">
                    ${isAprobado ? 'Aprobado' : (r.status || 'Pendiente')}
                  </span>
                </td>
                <td>
                  ${!isAprobado ? `
                    <button class="btn-primary" style="padding: 0.25rem 0.65rem; font-size: 0.6875rem;" onclick="window.timeplusApproveRequest('${r.id}')">
                      ✓ Aprobar
                    </button>
                  ` : `
                    <button class="btn-secondary" style="padding: 0.25rem 0.65rem; font-size: 0.6875rem; color: #DC2626; border-color: #FCA5A5;" onclick="window.timeplusRevokeRequest('${r.id}')">
                      Revocar acceso
                    </button>
                  `}
                </td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
      `;
    }
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
    const title = prompt('¿Qué actividad deseas agendar? (Ej: "Reunión con Juan a las 5:00 p. m."):');
    if (title && title.trim()) {
      ai.processCommand(title.trim());
    }
  };

  // Mobile menu toggle
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('app-sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
});
