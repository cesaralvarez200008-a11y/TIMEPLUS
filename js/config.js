/**
 * TIMEPLUS OS — Configuration & Initial Dataset
 * Fulfilling the 30-point System Vision
 */

window.TIMEPLUS_CONFIG = {
  VERSION: '2.0.0_OS',
  SUPABASE_URL: 'https://bkrmrwbsmntrmxtdhoqo.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_1jKVPMpxJ7m5U4VuXFW0wQ_izCTcRlf',
  
  SUPERADMIN_EMAIL: 'ces.rodriguez200@gmail.com',
  SUPERADMIN_PASS: '16278465',

  CATEGORIES: {
    trabajo: { name: 'Trabajo', color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', icon: '💼' },
    personal: { name: 'Personal', color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC', icon: '🌱' },
    salud: { name: 'Salud', color: '#A16207', bg: '#FEFCE8', border: '#FDE047', icon: '💊' },
    estudio: { name: 'Estudio', color: '#7E22CE', bg: '#FAF5FF', border: '#D8B4FE', icon: '📚' },
    urgente: { name: 'Urgente', color: '#B91C1C', bg: '#FEF2F2', border: '#FCA5A5', icon: '🚨' },
    fitness: { name: 'Ejercicio', color: '#C2410C', bg: '#FFF7ED', border: '#FDBA74', icon: '🏋️' },
    otros: { name: 'Otros', color: '#475569', bg: '#F8FAFC', border: '#CBD5E1', icon: '📌' }
  },

  INITIAL_DATA: {
    user: {
      id: 'usr-1',
      name: 'Rafael Carvajal',
      email: 'usuario@timeplus.ai',
      role: 'client', // 'client' | 'admin'
      plan: 'TIMEPLUS Connect Pro'
    },
    activities: [
      {
        id: 'act-1',
        title: 'Medicamento — Losartán 50mg',
        category: 'salud',
        time: '08:00',
        date: 'today',
        duration: '15m',
        type: 'medicamento',
        dosage: '1 pastilla con agua',
        confirmedTaken: true,
        notes: 'Confirmado a las 8:02 a.m.'
      },
      {
        id: 'act-2',
        title: 'Reunión virtual con Carlos Pérez',
        category: 'trabajo',
        time: '10:00',
        date: 'today',
        duration: '45m',
        type: 'reunion_virtual',
        attendees: ['Carlos Pérez'],
        meetLink: 'https://meet.google.com/tmp-meet-carlos',
        notes: 'Revisión del sprint de AuditPlus y presupuesto.'
      },
      {
        id: 'act-3',
        title: 'Almuerzo ejecutivo',
        category: 'personal',
        time: '12:30',
        date: 'today',
        duration: '1h',
        type: 'personal',
        notes: 'Restaurante Central'
      },
      {
        id: 'act-4',
        title: 'Desarrollo de Proyecto AuditPlus',
        category: 'trabajo',
        time: '15:00',
        date: 'today',
        duration: '1h',
        type: 'entrega_trabajo',
        subtasks: [
          { id: 'st-1', text: 'Revisar matriz de riesgos', done: true },
          { id: 'st-2', text: 'Enviar informe final a clientes', done: false }
        ]
      },
      {
        id: 'act-5',
        title: 'Cita Médica — Control Cardiólogo',
        category: 'salud',
        time: '16:00',
        date: 'today',
        duration: '45m',
        type: 'cita_presencial',
        placeId: 'plc-med',
        placeName: 'Centro Médico Santa Fe (Bogotá)',
        travelTimeMin: 35,
        prepTimeMin: 15,
        recommendedDeparture: '15:10',
        notes: 'Llevar exámenes de laboratorio impresos.'
      },
      {
        id: 'act-6',
        title: 'Entrenamiento Gimnasio (Pecho y Tríceps)',
        category: 'fitness',
        time: '18:00',
        date: 'today',
        duration: '1h',
        type: 'fitness',
        placeId: 'plc-gym',
        placeName: 'SmartFit Calle 100',
        exercises: [
          { name: 'Press de Banca Plano', sets: 4, reps: '10', weight: '70 kg' },
          { name: 'Press Inclinado con Mancuernas', sets: 4, reps: '12', weight: '24 kg' },
          { name: 'Fondos en Paralelas', sets: 3, reps: '12', weight: 'Corporal' }
        ]
      },
      {
        id: 'act-7',
        title: 'Cena familiar',
        category: 'personal',
        time: '20:00',
        date: 'today',
        duration: '1h 30m',
        type: 'personal'
      }
    ],
    contacts: [
      {
        id: 'cnt-1',
        name: 'Carlos Pérez',
        role: 'Director de Operaciones',
        company: 'AuditPlus Corp',
        email: 'carlos.perez@auditplus.com',
        phone: '+57 300 123 4567',
        lastMeeting: 'Hoy a las 10:00 a.m.',
        pendingTasks: ['Enviar cotización módulo salud', 'Revisar contrato marco'],
        notes: 'Prefiere reuniones virtuales los martes en la mañana.'
      },
      {
        id: 'cnt-2',
        name: 'Dra. Elena Gómez',
        role: 'Médico Cardióloga',
        company: 'Centro Médico Santa Fe',
        email: 'elena.gomez@santafemed.com',
        phone: '+57 315 987 6543',
        lastMeeting: 'Hace 3 meses',
        pendingTasks: ['Entregar exámenes de sangre'],
        notes: 'Consultorio 402, piso 4.'
      }
    ],
    places: [
      { id: 'plc-med', name: 'Centro Médico Santa Fe', address: 'Calle 116 # 9-02, Bogotá', visitsCount: 8, avgTravelTime: '35 min' },
      { id: 'plc-gym', name: 'SmartFit Calle 100', address: 'Cra 15 # 99-30, Bogotá', visitsCount: 16, avgTravelTime: '15 min' },
      { id: 'plc-office', name: 'Oficina Central TIMEPLUS', address: 'Cra 7 # 71-21, Bogotá', visitsCount: 22, avgTravelTime: '20 min' }
    ],
    fitnessSummary: {
      weeklyWorkouts: 4,
      targetWorkouts: 5,
      activeHours: 5.5,
      caloriesBurned: 2450
    },
    inbox: [
      { id: 'inb-1', text: 'Reunión con cliente el jueves a las 3:00 p.m.', source: 'email', date: 'Hoy' },
      { id: 'inb-2', text: 'Nota de voz: Recordarme comprar suplemento de magnesio', source: 'audio', date: 'Hoy' }
    ]
  }
};
