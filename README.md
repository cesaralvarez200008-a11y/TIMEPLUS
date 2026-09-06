# 📱 TIMEPLUS — La Agenda Conectada Definitiva

> **"Literalmente una agenda de toda la vida, no simplemente otro calendario."**  
> Agenda + Calendario + Recordatorios + Tareas + Reuniones + Citas + Clases + Eventos + Lugares + Historial + Estadísticas + Inteligencia Artificial. **Y algo fundamental: todo queda conectado.**

---

## 🌟 La Filosofía: Todo Queda Conectado

En las aplicaciones tradicionales, un calendario es una cuadrícula aislada y una lista de tareas es un bloque de texto plano. En **TIMEPLUS**:

- 🏥 **Una cita tiene un lugar.**
- 📍 **El lugar acumula visitas y genera historial.**
- 📄 **La actividad puede tener documentos y checklist.**
- ⏰ **El documento tiene fecha de entrega con recordatorios escalonados.**
- 👥 **La reunión tiene participantes y notas.**
- 🎓 **La clase es recurrente.**
- 🧠 **La IA entiende tu lenguaje natural:** si dices *"Mañana tengo reunión con Carlos a las 10 en la oficina y después debo entregar el informe"*, TIMEPLUS reconoce dos actividades encadenadas, las vincula a la Oficina y programa sus horarios en la agenda.

---

## 🚀 Módulos y Pantallas de la Aplicación

### 1. 📱 Pantalla Principal (Dashboard)
- **Saludo dinámico:** `☀️ Buenos días — Viernes, 4 de septiembre`.
- **Barra de IA y Voz:** `🔍 ¿Qué necesitas organizar? 🎙️ Escribe o habla...` con soporte para reconocimiento por micrófono (Web Speech API).
- **Contadores Rápidos:** `[ 8 Actividad ] [ 3 Pendiente ]`.
- **Agenda HOY interactiva:**
  - `08:00 💊 Medicamento ✓`
  - `09:30 💻 Reunión virtual`
  - `11:00 🩺 Cita médica`
  - `14:00 🎓 Clase`
  - `16:00 📄 Entrega informe`
  - `19:00 🍽️ Salida`
- Botón destacado: `＋ NUEVA ACTIVIDAD`.
- **Barra de navegación inferior:** Inicio, Agenda, Crear, Mis Lugares, Mi Actividad.

### 2. ➕ Selector de 14 Actividades
Al tocar `＋ NUEVA ACTIVIDAD` o el botón central `➕`, se despliega un menú categorizado con sus iconos específicos:
1. 💻 **Reunión virtual**
2. 🤝 **Reunión presencial**
3. 🩺 **Cita médica**
4. 💊 **Medicamento**
5. 🎓 **Clase**
6. 📄 **Entrega de trabajo**
7. 📑 **Informe**
8. 🎉 **Evento**
9. 🍽️ **Salida**
10. ✈️ **Viaje**
11. ✅ **Tarea**
12. 📌 **Recordatorio**
13. 📍 **Visita a lugar**
14. ➕ **Otro**

### 3. 📍 Módulo Estrella: "Mis Lugares"
Conexión espacial de todas las actividades:
- **Búsqueda y ⭐ Favoritos:**
  - 🏢 **Oficina:** 43 visitas (31 reuniones · 5 entregas · 7 capacitaciones)
  - 🏥 **Clínica:** 18 visitas (12 citas · 4 reuniones · 2 actividades)
  - 🎓 **Universidad:** 86 visitas (72 clases · 8 exámenes · 6 entregas)
  - 🍽️ **Restaurante:** 12 visitas (8 salidas · 4 reuniones)
- **Ficha de Detalle de Lugar:**
  - Contador de visitas históricas.
  - Desglose por tipo de actividad realizada allí.
  - Fechas clave: **Última visita** (ej: 3 septiembre) y **Próxima visita** (ej: 15 septiembre).
  - Botón interactivo: `🗺️ NAVEGAR` (con enlace a navegación satelital/Google Maps).
  - Listado cronológico de actividades programadas en ese lugar.

### 4. 📊 Módulo "Mi Actividad" (Analítica de Productividad)
- **Gran contador mensual:** `MI ACTIVIDAD — SEPTIEMBRE (147 actividades)`.
- **Filtros dinámicos:** `HOY | SEMANA | MES | AÑO`.
- **Desglose gráfico y porcentual:**
  - 💻 Reuniones: 32
  - 🎓 Clases: 18
  - 📄 Entregas: 9
  - 🩺 Citas: 7
  - 🎉 Eventos: 12
  - 🍽️ Salidas: 15
  - 📑 Informes: 8
  - 💊 Recordatorios: 46

### 5. 📄 Detalle de Entrega de Trabajos e Informes
No es una simple alerta, es un centro de control del entregable:
- **Título:** Informe de auditoría
- **Metadatos:** 📅 10 septiembre · ⏰ 5:00 p. m. · 📍 Oficina · 👤 Responsable: Yo
- **Estado:** 🟡 En proceso / 🟢 Completado
- **Subtareas / Checklist Interactivo:**
  - ☑️ Investigar
  - ☑️ Elaborar
  - ☐ Revisar
  - ☐ Entregar
- **Recordatorios Escalonados:** 3 días antes, 1 día antes, 1 hora antes.
- **Adjuntos:** Archivos enlazados con posibilidad de previsualizar.

### 6. 🗓️ Agenda con Vista 🧭 Línea de Tiempo
- Permite alternar entre la cuadrícula clásica (`Día`, `Semana`, `Mes`, `Año`) y la innovadora vista **🧭 Línea de Tiempo**:
  ```
  08:00  💊 Medicamento (Completado)
     ↓
  09:30  💻 Reunión
     ↓
  11:00  🩺 Cita médica
     ↓
  14:00  🎓 Clase
     ↓
  16:00  📄 Entrega
     ↓
  19:00  🍽️ Salida
  ```

### 7. 🧠 Asistente de IA y Voz
- **Reconocimiento de voz nativo:** Reconoce dictado por micrófono en español con animación en tiempo real.
- **Procesamiento de oraciones compuestas:**
  - Entrada: *"Mañana tengo reunión con Carlos a las 10 en la oficina y después debo entregar el informe."*
  - Salida: Detecta y crea ambas actividades relacionadas en la agenda con sus recordatorios.
- **Consultas históricas de lugares:**
  - Pregunta: *"Muéstrame todas las veces que fui a la clínica este año."*
  - Respuesta: *"Has registrado un total de 18 visitas a Clínica (12 citas, 4 reuniones, 2 actividades)..."* con acceso directo a la ficha del lugar.
- **Síntesis de voz (Text-to-Speech)** en español.

---

## 💻 Instrucciones para Ejecutar Localmente

No requiere Node.js, compiladores ni dependencias pesadas:
1. Abre directamente el archivo `index.html` en cualquier navegador web moderno (Google Chrome, Edge, Safari, Firefox).
2. Puedes alternar entre la **Vista Móvil** (marco iPhone 16 Pro con Dynamic Island) y la **Vista Pantalla Completa** utilizando el botón superior.
3. Para reiniciar los datos de ejemplo en cualquier momento, presiona el botón **🔄 Reiniciar**.

---

## 📦 Publicación en GitHub

Para subir este proyecto al repositorio de GitHub correspondiente:

```bash
# 1. Inicializar repositorio
git init

# 2. Agregar todos los archivos
git add .

# 3. Primer commit
git commit -m "feat: Lanzamiento inicial de TIMEPLUS MVP completo y conectado"

# 4. Establecer rama principal
git branch -M main

# 5. Conectar repositorio remoto
git remote add origin https://github.com/cesaralvarez200008-a11y/TIMEPLUS.git

# 6. Enviar cambios
git push -u origin main
```

---

## 🛠️ Estructura del Código

```
TIMEPLUS/
├── index.html          # Interfaz principal, marco móvil, vistas y modales
├── css/
│   └── styles.css      # Animaciones, línea de tiempo, glassmorphism y diseño iOS
├── js/
│   ├── store.js        # Estado reactivo, persistencia LocalStorage y datos iniciales
│   ├── ai-engine.js    # Motor IA NLP en español, reconocimiento de voz y consultas
│   └── app.js          # Enrutador de vistas, controladores de eventos e interactividad
├── .gitignore          # Archivos ignorados por Git
└── README.md           # Documentación completa del proyecto
```
