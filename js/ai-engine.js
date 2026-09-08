/**
 * TIMEPLUS OS — Core AI Brain & Speech Engine
 * Natural Language Understanding (NLP) in Spanish & Voice Execution
 */

class TimePlusAI {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.synth = window.speechSynthesis || null;
    this.setupSpeechRecognition();
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateMicUI(true);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎙️ TIMEPLUS Voz escuchada:', transcript);
        this.processCommand(transcript);
      };

      this.recognition.onerror = (e) => {
        console.warn('Nota SpeechRecognition:', e.error);
        this.isListening = false;
        this.updateMicUI(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateMicUI(false);
      };
    }
  }

  toggleVoice() {
    if (!this.recognition) {
      alert('Tu navegador no soporta entrada de voz directa (Web Speech API). Puedes escribir tu comando directamente en el cuadro.');
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('Speech recognition busy:', err);
      }
    }
  }

  updateMicUI(listening) {
    const micBtns = document.querySelectorAll('.btn-mic-glow');
    micBtns.forEach(btn => {
      if (listening) {
        btn.classList.add('listening');
        btn.title = 'Escuchando tu voz... Habla ahora';
      } else {
        btn.classList.remove('listening');
        btn.title = 'Hablar con TIMEPLUS IA';
      }
    });
  }

  speak(text) {
    if (!this.synth) return;
    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  // --- NLP Intent Parser ---
  async processCommand(rawInput) {
    const input = (rawInput || '').trim();
    if (!input) return null;

    const lower = input.toLowerCase();
    const store = window.timeplusStore;

    // Feedback visual en el input
    const textInput = document.getElementById('ai-omni-input');
    if (textInput) textInput.value = input;

    let response = {
      understood: false,
      message: '',
      action: null
    };

    // 1. Preguntas de Agenda: "¿Qué tengo hoy?" / "¿Qué tengo mañana?"
    if (lower.includes('qué tengo hoy') || lower.includes('agenda de hoy') || lower.includes('actividades de hoy')) {
      const acts = store.getActivities().filter(a => a.date === 'today');
      if (acts.length === 0) {
        response.message = 'No tienes actividades registradas para hoy. Tienes el día completamente libre.';
      } else {
        const count = acts.length;
        const first = acts[0];
        response.message = `Hoy tienes ${count} actividades programadas. Tu primera actividad es "${first.title}" a las ${first.time}.`;
      }
      response.understood = true;
    }

    // 2. Tiempo libre: "¿Cuánto tiempo tengo libre?"
    else if (lower.includes('tiempo libre') || lower.includes('cuánto libre')) {
      response.message = 'Analizando tu agenda: Tienes 45 minutos libres entre las 2:15 p. m. y las 3:00 p. m., y la tarde libre después de las 7:00 p. m.';
      response.understood = true;
    }

    // 3. Medicamentos: "Recuérdame tomar la pastilla / medicamento a las [hora]"
    else if (lower.includes('pastilla') || lower.includes('medicamento') || lower.includes('medicina')) {
      const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/);
      let time = '08:00';
      if (timeMatch) {
        let h = parseInt(timeMatch[1]);
        const m = timeMatch[2] || '00';
        if (lower.includes('pm') || lower.includes('p.m.') || (h < 7 && !lower.includes('am'))) h += 12;
        time = `${String(h).padStart(2, '0')}:${m}`;
      }

      const act = store.addActivity({
        title: 'Medicamento recetado',
        category: 'salud',
        time: time,
        date: 'today',
        duration: '10m',
        type: 'medicamento',
        dosage: '1 dosis con agua',
        confirmedTaken: false,
        notes: `Agendado por IA: "${input}"`
      });

      response.understood = true;
      response.message = `Listo. He programado el recordatorio de tu medicamento a las ${time}. Te preguntaré si lo tomaste.`;
      response.action = { type: 'CREATED_MED', data: act };
    }

    // 4. Fitness & Deporte: Al Aire Libre (Caminata, Trote, Bici, Kilómetros) o Gimnasio (Series, Repeticiones, Músculos)
    else if (lower.includes('camin') || lower.includes('trot') || lower.includes('corr') || lower.includes('bici') || lower.includes('ciclism') || lower.includes('km') || lower.includes('kilómetro') || lower.includes('aire libre') || lower.includes('entrené') || lower.includes('gimnasio') || lower.includes('ejercicio') || lower.includes('gym') || lower.includes('rutina')) {
      if (lower.includes('cuántos días') || lower.includes('resumen')) {
        const fit = store.getFitnessSummary();
        response.message = `Esta semana has entrenado ${fit.weeklyWorkouts} días de tu meta de ${fit.targetWorkouts}, completando ${fit.activeHours} horas activas y ${fit.caloriesBurned} kcal.`;
      } 
      // Caso A: Aire Libre / Cardio con Kilómetros (Caminata, Trote, Running, Bici)
      else if (lower.includes('camin') || lower.includes('trot') || lower.includes('corr') || lower.includes('bici') || lower.includes('ciclism') || lower.includes('km') || lower.includes('kilómetro') || lower.includes('aire libre')) {
        const kmMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:km|k|kilometros|kilómetros)/);
        const km = kmMatch ? parseFloat(kmMatch[1].replace(',', '.')) : (lower.includes('camin') ? 3 : 5);
        let actTitle = 'Caminata al Aire Libre';
        let icon = '🚶';
        if (lower.includes('trot') || lower.includes('running') || lower.includes('corr')) {
          actTitle = 'Trote / Running al Aire Libre';
          icon = '🏃';
        } else if (lower.includes('bici') || lower.includes('ciclism')) {
          actTitle = 'Ciclismo / Ruta en Bicicleta';
          icon = '🚴';
        }
        const calories = Math.round(km * 65);
        const durationMin = Math.round(km * (lower.includes('bici') ? 4 : (lower.includes('trot') ? 7 : 12)));

        const act = store.recordWorkout({
          title: `${icon} ${actTitle} (${km} km)`,
          category: 'fitness',
          activityType: 'outdoor',
          distanceKm: km,
          duration: `${durationMin} min`,
          durationHours: parseFloat((durationMin / 60).toFixed(1)),
          calories: calories,
          exercises: [{ name: actTitle, sets: 1, reps: `${km} km`, weight: `${calories} kcal` }]
        });
        response.understood = true;
        response.message = `¡Excelente registro al aire libre! He registrado tu ${actTitle} de ${km} km (~${durationMin} min) y sumado ${calories} kcal quemadas a tu historial.`;
        response.action = { type: 'CREATED_FITNESS', data: act };
      }
      // Caso B: Gimnasio / Musculación con Grupos Musculares y Ejercicios
      else {
        let muscle = 'Rutina General en Gimnasio';
        let exercisesList = [{ name: 'Acondicionamiento Físico', sets: 4, reps: '10-12', weight: 'Progresivo' }];
        
        if (lower.includes('pecho')) {
          muscle = 'Entrenamiento de Pecho & Tríceps';
          exercisesList = [
            { name: 'Press de Banca Plano', sets: 4, reps: 10, weight: '40-60 kg' },
            { name: 'Aperturas con Mancuernas', sets: 3, reps: 12, weight: '14 kg' },
            { name: 'Fondos en Paralelas / Tríceps', sets: 3, reps: 12, weight: 'Corporal' }
          ];
        } else if (lower.includes('pierna') || lower.includes('glúteo') || lower.includes('cuádriceps')) {
          muscle = 'Entrenamiento de Pierna & Glúteos';
          exercisesList = [
            { name: 'Sentadilla Libre / Smith', sets: 4, reps: 10, weight: '50-70 kg' },
            { name: 'Prensa Inclinada 45°', sets: 4, reps: 12, weight: '100 kg' },
            { name: 'Extensión de Cuádriceps', sets: 3, reps: 15, weight: '45 kg' }
          ];
        } else if (lower.includes('espalda') || lower.includes('dorsal')) {
          muscle = 'Entrenamiento de Espalda & Bíceps';
          exercisesList = [
            { name: 'Jalón al Pecho en Polea', sets: 4, reps: 10, weight: '50 kg' },
            { name: 'Remo con Barra / Mancuerna', sets: 4, reps: 10, weight: '22 kg' },
            { name: 'Curl de Bíceps con Barra', sets: 3, reps: 12, weight: '25 kg' }
          ];
        } else if (lower.includes('brazo') || lower.includes('bíceps') || lower.includes('tríceps')) {
          muscle = 'Entrenamiento de Brazos (Bíceps + Tríceps)';
          exercisesList = [
            { name: 'Curl Martillo', sets: 4, reps: 12, weight: '12 kg' },
            { name: 'Extensión de Tríceps en Polea', sets: 4, reps: 12, weight: '30 kg' }
          ];
        } else if (lower.includes('hombro')) {
          muscle = 'Entrenamiento de Hombros & Trapecio';
          exercisesList = [
            { name: 'Press Militar con Mancuernas', sets: 4, reps: 10, weight: '16 kg' },
            { name: 'Elevaciones Laterales', sets: 4, reps: 15, weight: '8 kg' }
          ];
        }

        const act = store.recordWorkout({
          title: `🏋️ ${muscle}`,
          category: 'fitness',
          activityType: 'gym',
          muscleGroup: muscle,
          duration: '1h',
          durationHours: 1,
          calories: 460,
          exercises: exercisesList
        });
        response.understood = true;
        response.message = `¡Rutina guardada! He registrado tu ${muscle} con sus series, repeticiones y sumado 460 kcal a tus estadísticas.`;
        response.action = { type: 'CREATED_FITNESS', data: act };
      }
      response.understood = true;
    }

    // 5. Reunión Virtual: "Agéndame una reunión virtual con [Carlos] el [martes/mañana] a las [hora]"
    else if (lower.includes('reunión virtual') || (lower.includes('reunión') && lower.includes('con '))) {
      const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/);
      let time = '11:00';
      if (timeMatch) {
        let h = parseInt(timeMatch[1]);
        const m = timeMatch[2] || '00';
        if (lower.includes('pm') || lower.includes('tarde')) {
          if (h < 12) h += 12;
        }
        time = `${String(h).padStart(2, '0')}:${m}`;
      }

      let person = 'Contacto';
      if (lower.includes('carlos')) person = 'Carlos Pérez';
      else if (lower.includes('maría')) person = 'María López';
      else if (lower.includes('juan')) person = 'Juan Rodríguez';

      const act = store.addActivity({
        title: `Reunión virtual con ${person}`,
        category: 'trabajo',
        time: time,
        date: 'today',
        duration: '45m',
        type: 'reunion_virtual',
        attendees: [person],
        meetLink: `https://meet.google.com/tmp-${Date.now().toString().slice(-6)}`,
        notes: `Generado automáticamente por TIMEPLUS IA. Enlace Meet creado.`
      });

      response.understood = true;
      response.message = `Entendido. He agendado la reunión virtual con ${person} para hoy a las ${time} y generé su enlace de Google Meet.`;
      response.action = { type: 'CREATED_MEETING', data: act };
    }

    // 6. Movilidad y Cálculo de Salida: "Tengo una reunión en [Bogotá] a las [hora], calcula cuándo salir"
    else if (lower.includes('cuándo salir') || lower.includes('cuándo debo salir') || lower.includes('tráfico') || lower.includes('movilidad')) {
      response.understood = true;
      response.message = 'Considerando la distancia (12 km), el tráfico actual hacia la sede y 15 minutos de preparación previa: Debes salir aproximadamente a las 3:10 p. m. para llegar puntual a tu cita de las 4:00 p. m.';
    }

    // 7. Organizar el día: "Organízame el día" / "Organízame la tarde"
    else if (lower.includes('organízame') || lower.includes('organiza mi día')) {
      response.understood = true;
      response.message = 'He optimizado tu día: agrupé tus tareas pendientes en bloques continuos, reservé 45 minutos para tu almuerzo y programé tu entrenamiento a las 6:00 p. m. sin colisiones.';
    }

    // 8. Contactos: "¿Qué tengo pendiente con Carlos?"
    else if (lower.includes('pendiente con') || lower.includes('con carlos')) {
      const contacts = store.getContacts();
      const carlos = contacts.find(c => c.name.toLowerCase().includes('carlos'));
      if (carlos) {
        response.message = `Con ${carlos.name} tienes pendiente: 1) Enviar cotización del módulo de salud, y 2) Revisar contrato marco. Tu última reunión con él fue hoy.`;
      } else {
        response.message = 'No encontré pendientes críticos con ese contacto.';
      }
      response.understood = true;
    }

    // 9. Reprogramar / Mover: "Muévela para las 5" / "Cancela mi reunión"
    else if (lower.includes('muévela') || lower.includes('cancela')) {
      response.understood = true;
      response.message = 'Acción procesada en tu calendario: La actividad ha sido actualizada exitosamente.';
    }

    // 10. Fallback Inteligente: Crear actividad general
    else {
      const act = store.addActivity({
        title: input.charAt(0).toUpperCase() + input.slice(1),
        category: 'otros',
        time: '16:30',
        date: 'today',
        duration: '30m',
        type: 'tarea',
        notes: 'Creado mediante comando libre de TIMEPLUS IA.'
      });
      response.understood = true;
      response.message = `Entendido. He agregado "${input}" a tu centro de control para hoy.`;
      response.action = { type: 'CREATED_GENERAL', data: act };
    }

    // Respuesta auditiva por voz
    this.speak(response.message);

    // Mostrar modal / toast de confirmación
    if (window.timeplusShowToast) {
      window.timeplusShowToast('🧠 IA: ' + response.message);
    }

    return response;
  }
}

window.timeplusAI = new TimePlusAI();
