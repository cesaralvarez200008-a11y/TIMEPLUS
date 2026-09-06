-- ============================================================
-- TIMEPLUS -- PARTE 1: TABLAS E INDICES
-- SIN EMOJIS (compatibilidad con Supabase SQL Editor)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpieza previa
DROP TABLE IF EXISTS public.admin_metrics_log   CASCADE;
DROP TABLE IF EXISTS public.activity_stats      CASCADE;
DROP TABLE IF EXISTS public.ai_queries          CASCADE;
DROP TABLE IF EXISTS public.attachments         CASCADE;
DROP TABLE IF EXISTS public.reminders           CASCADE;
DROP TABLE IF EXISTS public.checklist_items     CASCADE;
DROP TABLE IF EXISTS public.place_visits        CASCADE;
DROP TABLE IF EXISTS public.activities          CASCADE;
DROP TABLE IF EXISTS public.places              CASCADE;
DROP TABLE IF EXISTS public.activity_categories CASCADE;
DROP TABLE IF EXISTS public.plans               CASCADE;
DROP TABLE IF EXISTS public.profiles            CASCADE;

-- -----------------------------------------------
-- TABLA 1: PROFILES
-- -----------------------------------------------
CREATE TABLE public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT        UNIQUE NOT NULL,
  full_name       TEXT        NOT NULL DEFAULT 'Usuario TIMEPLUS',
  avatar_initials TEXT        DEFAULT 'TP',
  role            TEXT        NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
  plan            TEXT        NOT NULL DEFAULT 'TIMEPLUS Free',
  plan_status     TEXT        NOT NULL DEFAULT 'activo' CHECK (plan_status IN ('activo','inactivo','suspendido','trial')),
  acquired_date   DATE        DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- TABLA 2: PLANS
-- -----------------------------------------------
CREATE TABLE public.plans (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT        UNIQUE NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  price_usd   NUMERIC(8,2) DEFAULT 0,
  features    JSONB        DEFAULT '[]',
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO public.plans (code, name, description, price_usd, features) VALUES
  ('free',        'TIMEPLUS Free',           'Plan basico gratuito.',                              0.00,  '["Agenda basica","Recordatorios","5 lugares"]'),
  ('connect_pro', 'TIMEPLUS Connect Pro',    'Agenda conectada con IA y lugares ilimitados.',      9.99,  '["Lugares ilimitados","Asistente IA","Estadisticas","Adjuntos"]'),
  ('medico',      'TIMEPLUS Medico y Citas', 'Optimizado para citas medicas.',                     14.99, '["Modulo pacientes","Recordatorios medicamentos","Historial clinico"]'),
  ('corporativo', 'TIMEPLUS Corporativo',    'Para empresas con reportes y multi-usuario.',        29.99, '["Multi-usuario","Reportes","Soporte prioritario"]'),
  ('academico',   'TIMEPLUS Academico',      'Para estudiantes: clases, entregas y examenes.',     4.99,  '["Calendario academico","Entregas","IA agenda universitaria"]');

-- -----------------------------------------------
-- TABLA 3: ACTIVITY_CATEGORIES
-- -----------------------------------------------
CREATE TABLE public.activity_categories (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       TEXT    UNIQUE NOT NULL,
  label      TEXT    NOT NULL,
  icon_text  TEXT    NOT NULL DEFAULT 'item',
  color_hex  TEXT    DEFAULT '#2563EB',
  sort_order INTEGER DEFAULT 0
);

INSERT INTO public.activity_categories (code, label, icon_text, color_hex, sort_order) VALUES
  ('reunion_virtual',    'Reunion virtual',    'videocam',    '#3B82F6', 1),
  ('reunion_presencial', 'Reunion presencial', 'handshake',   '#6366F1', 2),
  ('cita_medica',        'Cita medica',        'medical',     '#EF4444', 3),
  ('medicamento',        'Medicamento',        'pill',        '#14B8A6', 4),
  ('clase',              'Clase',              'school',      '#8B5CF6', 5),
  ('entrega_trabajo',    'Entrega de trabajo', 'document',    '#F59E0B', 6),
  ('informe',            'Informe',            'report',      '#6366F1', 7),
  ('evento',             'Evento',             'event',       '#EC4899', 8),
  ('salida',             'Salida',             'restaurant',  '#10B981', 9),
  ('viaje',              'Viaje',              'flight',      '#0EA5E9', 10),
  ('tarea',              'Tarea',              'check',       '#22C55E', 11),
  ('recordatorio',       'Recordatorio',       'pin',         '#F97316', 12),
  ('visita_lugar',       'Visita a lugar',     'place',       '#84CC16', 13),
  ('otro',               'Otro',               'add',         '#94A3B8', 14);

-- -----------------------------------------------
-- TABLA 4: PLACES
-- -----------------------------------------------
CREATE TABLE public.places (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  short_name      TEXT,
  icon_text       TEXT        DEFAULT 'place',
  address         TEXT,
  city            TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  is_favorite     BOOLEAN     DEFAULT FALSE,
  visits_count    INTEGER     DEFAULT 0,
  history_summary JSONB       DEFAULT '{}',
  last_visit_date DATE,
  next_visit_date DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- TABLA 5: ACTIVITIES
-- -----------------------------------------------
CREATE TABLE public.activities (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  place_id        UUID        REFERENCES public.places(id) ON DELETE SET NULL,
  category_code   TEXT        NOT NULL REFERENCES public.activity_categories(code),
  title           TEXT        NOT NULL,
  details         TEXT,
  responsible     TEXT        DEFAULT 'Yo',
  activity_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  activity_time   TIME,
  display_time    TEXT,
  completed       BOOLEAN     DEFAULT FALSE,
  status_label    TEXT        DEFAULT 'Pendiente',
  status_color    TEXT        DEFAULT 'blue' CHECK (status_color IN ('blue','yellow','green','red')),
  meeting_link    TEXT,
  is_recurring    BOOLEAN     DEFAULT FALSE,
  recurrence_rule TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- TABLA 6: CHECKLIST_ITEMS
-- -----------------------------------------------
CREATE TABLE public.checklist_items (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID        NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  text        TEXT        NOT NULL,
  done        BOOLEAN     DEFAULT FALSE,
  sort_order  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- TABLA 7: REMINDERS
-- -----------------------------------------------
CREATE TABLE public.reminders (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id    UUID        NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  label          TEXT        NOT NULL,
  remind_at      TIMESTAMPTZ,
  offset_minutes INTEGER,
  is_sent        BOOLEAN     DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- TABLA 8: ATTACHMENTS
-- -----------------------------------------------
CREATE TABLE public.attachments (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id  UUID        NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  filename     TEXT        NOT NULL,
  file_url     TEXT,
  file_type    TEXT,
  file_size_kb INTEGER,
  storage_path TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- TABLA 9: PLACE_VISITS
-- -----------------------------------------------
CREATE TABLE public.place_visits (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id    UUID        NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  activity_id UUID        REFERENCES public.activities(id) ON DELETE SET NULL,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visited_at  DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- TABLA 10: ACTIVITY_STATS
-- -----------------------------------------------
CREATE TABLE public.activity_stats (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_type   TEXT        NOT NULL CHECK (period_type IN ('hoy','semana','mes','anio')),
  period_label  TEXT        NOT NULL,
  period_start  DATE        NOT NULL,
  period_end    DATE        NOT NULL,
  total_count   INTEGER     DEFAULT 0,
  breakdown     JSONB       DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- TABLA 11: AI_QUERIES
-- -----------------------------------------------
CREATE TABLE public.ai_queries (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  input_text         TEXT        NOT NULL,
  response_text      TEXT,
  intent_type        TEXT,
  was_voice          BOOLEAN     DEFAULT FALSE,
  activities_created INTEGER     DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- TABLA 12: ADMIN_METRICS_LOG
-- -----------------------------------------------
CREATE TABLE public.admin_metrics_log (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_clients          INTEGER     DEFAULT 0,
  active_licenses_pct    NUMERIC(5,2) DEFAULT 0,
  monthly_revenue_usd    NUMERIC(10,2) DEFAULT 0,
  total_places_connected INTEGER     DEFAULT 0,
  ai_queries_today       INTEGER     DEFAULT 0,
  new_clients_this_month INTEGER     DEFAULT 0,
  snapshot_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.admin_metrics_log
  (total_clients, active_licenses_pct, monthly_revenue_usd,
   total_places_connected, ai_queries_today, new_clients_this_month, snapshot_date)
VALUES
  (1420, 98.40, 14200.00, 8650, 3840, 18, CURRENT_DATE);

-- -----------------------------------------------
-- INDICES
-- -----------------------------------------------
CREATE INDEX idx_activities_user_date ON public.activities (user_id, activity_date);
CREATE INDEX idx_activities_place     ON public.activities (place_id);
CREATE INDEX idx_activities_category  ON public.activities (category_code);
CREATE INDEX idx_activities_completed ON public.activities (completed);
CREATE INDEX idx_place_visits_place   ON public.place_visits (place_id);
CREATE INDEX idx_place_visits_user    ON public.place_visits (user_id, visited_at);
CREATE INDEX idx_checklist_activity   ON public.checklist_items (activity_id);
CREATE INDEX idx_reminders_activity   ON public.reminders (activity_id);
CREATE INDEX idx_reminders_sent       ON public.reminders (is_sent, remind_at);
CREATE INDEX idx_ai_queries_user      ON public.ai_queries (user_id, created_at);
CREATE INDEX idx_profiles_role        ON public.profiles (role);
CREATE INDEX idx_places_user_fav      ON public.places (user_id, is_favorite);

-- VERIFICACION
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
