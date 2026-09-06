// TIMEPLUS — Intelligent AI Engine & Natural Language Understanding (Spanish)
// Supports multi-intent extraction, place querying, voice recognition & synthesis

class TimeplusAIEngine {
  constructor(store) {
    this.store = store;
    this.isListening = false;
    this.recognition = null;
    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
  }

  startListening(onResultCallback, onEndCallback) {
    if (!this.recognition) {
      alert('Tu navegador no soporta la Web Speech API para reconocimiento de voz. Puedes escribir tu orden directamente.');
      if (onEndCallback) onEndCallback();
      return;
    }

    this.isListening = true;

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResultCallback) onResultCallback(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (onEndCallback) onEndCallback();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEndCallback) onEndCallback();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition already started:', e);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  // --- Natural Language Processor (NLP) ---
  processInput(rawText) {
    const text = rawText.trim();
    const lower = text.toLowerCase();

    // 1. Check if user is asking about Place History / Statistics
    // Example: "Muéstrame todas las veces que fui a la clínica este año" or "cuántas visitas tengo a la oficina"
    const placeQuery = this.matchPlaceQuery(lower);
    if (placeQuery) {
      return placeQuery;
    }

    // 2. Check if user asks for today's summary
    // Example: "¿Qué tengo hoy?", "¿Cuál es mi agenda?"
    if (lower.includes('que tengo hoy') || lower.includes('agenda de hoy') || lower.includes('actividades de hoy') || lower === 'hoy') {
      const acts = this.store.getActivities('2026-09-04');
      const pending = acts.filter(a => !a.completed);
      return {
        type: 'query_today',
        text: `Hoy tienes ${acts.length} actividades programadas (${pending.length} pendientes). Comienzas a las 08:00 con Medicamento y terminas a las 19:00 con Salida.`,
        activities: acts
      };
    }

    // 3. Multi-event creation detection (e.g. "Mañana tengo reunión con Carlos a las 10 en la oficina y después debo entregar el informe.")
    const compoundParts = this.splitCompoundSentences(text);
    const createdActivities = [];

    compoundParts.forEach((part, index) => {
      const parsed = this.parseActivityIntent(part, index > 0 ? createdActivities[0] : null);
      if (parsed) {
        const created = this.store.addActivity(parsed);
        createdActivities.push(created);
      }
    });

    if (createdActivities.length > 0) {
      const names = createdActivities.map(a => `"${a.title}" a las ${a.time}`).join(' y ');
      return {
        type: 'create_success',
        count: createdActivities.length,
        createdActivities,
        text: createdActivities.length > 1
          ? `He detectado 2 actividades relacionadas y las he creado en tu agenda: ${names}. Todo ha quedado conectado con su lugar y recordatorios.`
          : `He creado la actividad ${names} en tu agenda.`
      };
    }

    // Fallback: General assistant response or generic activity creation
    const genericAct = this.parseActivityIntent(text);
    if (genericAct) {
      const created = this.store.addActivity(genericAct);
      return {
        type: 'create_success',
        count: 1,
        createdActivities: [created],
        text: `He añadido "${created.title}" a tu agenda para el ${created.date} a las ${created.time}.`
      };
    }

    return {
      type: 'generic_response',
      text: `Entendido. Puedes decirme cosas como: "Mañana tengo reunión con Carlos a las 10 en la oficina y después debo entregar el informe" o "Muéstrame todas las veces que fui a la clínica este año".`
    };
  }

  // --- Place Query Analyzer ---
  matchPlaceQuery(lower) {
    const places = this.store.getPlaces();
    const isAskingVisits = lower.includes('veces') || lower.includes('visita') || lower.includes('visité') || lower.includes('fui a') || lower.includes('cuanto') || lower.includes('historial');

    for (const p of places) {
      const pName = p.shortName.toLowerCase();
      if (lower.includes(pName) && isAskingVisits) {
        const summary = p.historySummary;
        let summaryText = '';
        if (summary) {
          const parts = [];
          for (const [key, val] of Object.entries(summary)) {
            parts.push(`${val} ${key}`);
          }
          if (parts.length > 0) {
            summaryText = ` (${parts.join(', ')})`;
          }
        }

        return {
          type: 'place_history_answer',
          place: p,
          visitsCount: p.visitsCount,
          lastVisit: p.lastVisit,
          nextVisit: p.nextVisit,
          text: `Has registrado un total de ${p.visitsCount} visitas a ${p.shortName}${summaryText}. Tu última visita fue el ${p.lastVisit} y tu próxima visita agendada es el ${p.nextVisit}.`,
          action: 'open_place',
          placeId: p.id
        };
      }
    }
    return null;
  }

  // --- Sentence Splitting for Compound Intents ---
  splitCompoundSentences(text) {
    // Look for conjunctions: " y después ", " y luego ", " y más tarde ", " y a continuación ", " y después de eso "
    const regex = /\s+(?:y\s+despu[eé]s(?:\s+de\s+(?:eso|la\s+reuni[oó]n))?|y\s+luego|luego|y\s+m[aá]s\s+tarde)\s+/i;
    if (regex.test(text)) {
      return text.split(regex).filter(s => s.trim().length > 3);
    }
    return [text];
  }

  // --- Single Activity Intent Parser ---
  parseActivityIntent(sentence, previousContext = null) {
    const lower = sentence.toLowerCase();

    // 1. Category and Icon detection
    let category = 'tarea';
    let categoryLabel = 'Tarea';
    let icon = '✅';

    if (lower.includes('reunión') || lower.includes('reunion') || lower.includes('meet') || lower.includes('llamada')) {
      if (lower.includes('virtual') || lower.includes('meet') || lower.includes('zoom')) {
        category = 'reunion_virtual';
        categoryLabel = 'Reunión virtual';
        icon = '💻';
      } else {
        category = 'reunion_presencial';
        categoryLabel = 'Reunión presencial';
        icon = '🤝';
      }
    } else if (lower.includes('cita') || lower.includes('médic') || lower.includes('doctor') || lower.includes('doctora') || lower.includes('odontólogo')) {
      category = 'cita_medica';
      categoryLabel = 'Cita médica';
      icon = '🩺';
    } else if (lower.includes('medicamento') || lower.includes('pastilla') || lower.includes('remedio') || lower.includes('dosis')) {
      category = 'medicamento';
      categoryLabel = 'Medicamento';
      icon = '💊';
    } else if (lower.includes('clase') || lower.includes('universidad') || lower.includes('curso') || lower.includes('lección')) {
      category = 'clase';
      categoryLabel = 'Clase';
      icon = '🎓';
    } else if (lower.includes('entrega') || lower.includes('entregar')) {
      category = 'entrega_trabajo';
      categoryLabel = 'Entrega de trabajo';
      icon = '📄';
    } else if (lower.includes('informe') || lower.includes('reporte') || lower.includes('auditoría')) {
      category = 'informe';
      categoryLabel = 'Informe';
      icon = '📑';
    } else if (lower.includes('cena') || lower.includes('almuerzo') || lower.includes('restaurante') || lower.includes('salida') || lower.includes('tomar algo')) {
      category = 'salida';
      categoryLabel = 'Salida';
      icon = '🍽️';
    } else if (lower.includes('evento') || lower.includes('fiesta') || lower.includes('celebración')) {
      category = 'evento';
      categoryLabel = 'Evento';
      icon = '🎉';
    } else if (lower.includes('viaje') || lower.includes('vuelo') || lower.includes('hotel')) {
      category = 'viaje';
      categoryLabel = 'Viaje';
      icon = '✈️';
    } else if (lower.includes('recordar') || lower.includes('recordatorio')) {
      category = 'recordatorio';
      categoryLabel = 'Recordatorio';
      icon = '📌';
    }

    // 2. Date parsing
    let date = '2026-09-04'; // default base date
    if (lower.includes('mañana')) {
      date = '2026-09-05';
    } else if (lower.includes('pasado mañana')) {
      date = '2026-09-06';
    } else if (lower.includes('lunes')) {
      date = '2026-09-07';
    } else if (lower.includes('martes')) {
      date = '2026-09-08';
    } else if (lower.includes('miércoles') || lower.includes('miercoles')) {
      date = '2026-09-09';
    } else if (lower.includes('jueves')) {
      date = '2026-09-10';
    } else if (previousContext) {
      date = previousContext.date;
    }

    // 3. Time parsing
    let time = '12:00';
    const timeMatch = lower.match(/(?:a\s+las?|alas?)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.\s*m\.|p\.\s*m\.)?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? timeMatch[2] : '00';
      const meridiem = timeMatch[3] ? timeMatch[3].replace(/\./g, '').trim() : '';

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      time = `${hours.toString().padStart(2, '0')}:${minutes}`;
    } else if (previousContext) {
      // If chained after another event, calculate 1.5 hours later
      const [prevH, prevM] = previousContext.time.split(':').map(Number);
      const nextH = Math.min(23, prevH + 1);
      const nextM = prevM === 0 ? '30' : '00';
      time = `${nextH.toString().padStart(2, '0')}:${nextM}`;
    }

    // 4. Place Association
    let placeId = null;
    let placeName = '';
    const places = this.store.getPlaces();

    for (const p of places) {
      if (lower.includes(p.shortName.toLowerCase())) {
        placeId = p.id;
        placeName = p.name;
        break;
      }
    }

    // Inherit place from previous context if not explicitly mentioned
    if (!placeId && previousContext && previousContext.placeId) {
      placeId = previousContext.placeId;
      placeName = previousContext.placeName;
    }

    // 5. Title synthesis
    let title = sentence.trim();
    // Clean common prefixes
    title = title.replace(/^(mañana\s+tengo\s+|tengo\s+|debo\s+|hay\s+que\s+|recordar\s+)/i, '');
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // If it's an "entrega de trabajo" or "informe", add standard checklist
    const checklist = [];
    if (category === 'entrega_trabajo' || category === 'informe') {
      checklist.push(
        { id: 'chk-' + Math.random(), text: 'Investigar', done: true },
        { id: 'chk-' + Math.random(), text: 'Elaborar', done: false },
        { id: 'chk-' + Math.random(), text: 'Revisar', done: false },
        { id: 'chk-' + Math.random(), text: 'Entregar', done: false }
      );
    }

    return {
      title,
      category,
      categoryLabel,
      icon,
      date,
      time,
      displayTime: time,
      completed: false,
      placeId,
      placeName: placeName || 'Por definir',
      responsible: 'Yo',
      statusLabel: 'En proceso',
      details: `Generado inteligentemente por TIMEPLUS IA`,
      checklist,
      reminders: ['1 hora antes', '1 día antes']
    };
  }
}

// Global singleton instance
window.timeplusAI = new TimeplusAIEngine(window.timeplusStore);
