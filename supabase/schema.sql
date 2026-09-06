-- ============================================================
-- TIMEPLUS — Esquema SQL limpio para Supabase
-- Versión: 1.1 (sin bloque demo problemático)
-- SuperAdmin: ces.rodriguez200@gmail.com / 16278465
-- ============================================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==================================================
-- TABLA 1: PERFILES DE USUARIO
-- ==================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  full_name       TEXT NOT NULL DEFAULT 'Usuario TIMEPLUS',
  avatar_initials TEXT DEFAULT 'TP',
  role            TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  plan            TEXT NOT NULL DEFAULT 'TIMEPLUS Free',
  plan_status     TEXT NOT NULL DEFAULT 'activo' CHECK (plan_status IN ('activo', 'inactivo', 'suspendido', 'trial')),
  acquired_date   DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ==================================================
-- TABLA 2: PLANES DISPONIBLES
-- ==================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  price_usd   NUMERIC(8,2) DEFAULT 0,
  features    JSONB DEFAULT '[]',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.plans (code, name, description, price_usd, features) VALUES
  ('free',        'TIMEPLUS Free',           'Plan básico gratuito con agenda y recordatorios.',                   0.00,  '["Agenda básica","Recordatorios","5 lugares","Historial 30 días"]'),
  ('connect_pro', 'TIMEPLUS Connect Pro',    'Agenda conectada completa con IA, lugares ilimitados e historial.', 9.99,  '["Todo Free","Lugares ilimitados","Asistente IA por voz","Estadísticas avanzadas","Entregas con checklist","Adjuntos"]'),
  ('medico',      'TIMEPLUS Médico & Citas', 'Optimizado para citas médicas, pacientes y seguimiento clínico.',   14.99, '["Todo Pro","Módulo de pacientes","Recordatorios de medicamentos","Historial clínico"]'),
  ('corporativo', 'TIMEPLUS Corporativo',    'Para empresas y equipos con múltiples usuarios y reportes.',        29.99, '["Todo Pro","Multi-usuario","Reportes corporativos","Soporte prioritario"]'),
  ('academico',   'TIMEPLUS Académico',      'Para estudiantes y docentes: clases, entregas y exámenes.',         4.99,  '["Todo Free","Módulo de clases","Calendario académico","Entregas y exámenes"]')
ON CONFLICT (code) DO NOTHING;


-- ==================================================
-- TABLA 3: CATEGORÍAS DE ACTIVIDAD (Las 14 de TIMEPLUS)
-- ==================================================
CREATE TABLE IF NOT EXISTS public.activity_categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       TEXT UNIQUE NOT NULL,
  label      TEXT NOT NULL,
  icon       TEXT NOT NULL,
  color_hex  TEXT DEFAULT '#2563EB',
  sort_order INTEGER DEFAULT 0
);

INSERT INTO public.activity_categories (code, label, icon, color_hex, sort_order) VALUES
  ('reunion_virtual',    'Reunión virtual',    '💻', '#3B82F6', 1),
  ('reunion_presencial', 'Reunión presencial', '🤝', '#6366F1', 2),
  ('cita_medica',        'Cita médica',        '🩺', '#EF4444', 3),
  ('medicamento',        'Medicamento',        '💊', '#14B8A6', 4),
  ('clase',              'Clase',              '🎓', '#8B5CF6', 5),
  ('entrega_trabajo',    'Entrega de trabajo', '📄', '#F59E0B', 6),
  ('informe',            'Informe',            '📑', '#6366F1', 7),
  ('evento',             'Evento',             '🎉', '#EC4899', 8),
  ('salida',             'Salida',             '🍽️', '#10B981', 9),
  ('viaje',              'Viaje',              '✈️', '#0EA5E9', 10),
  ('tarea',              'Tarea',              '✅', '#22C55E', 11),
  ('recordatorio',       'Recordatorio',       '📌', '#F97316', 12),
  ('visita_lugar',       'Visita a lugar',     '📍', '#84CC16', 13),
  ('otro',               'Otro',               '➕', '#94A3B8', 14)
ON CONFLICT (code) DO NOTHING;


-- ==================================================
-- TABLA 4: LUGARES (Módulo Mis Lugares)
-- ==================================================
CREATE TABLE IF NOT EXISTS public.places (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  short_name      TEXT,
  icon            TEXT DEFAULT '📍',
  address         TEXT,
  city            TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  is_favorite     BOOLEAN DEFAULT FALSE,
  visits_count    INTEGER DEFAULT 0,
  history_summary JSONB DEFAULT '{}',
  last_visit_date DATE,
  next_visit_date DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ==================================================
-- TABLA 5: ACTIVIDADES (Núcleo de TIMEPLUS)
-- ==================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  place_id      UUID REFERENCES public.places(id) ON DELETE SET NULL,
  category_code TEXT NOT NULL REFERENCES public.activity_categories(code),
  title         TEXT NOT NULL,
  details       TEXT,
  responsible   TEXT DEFAULT 'Yo',
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_time TIME,
  display_time  TEXT,
  completed     BOOLEAN DEFAULT FALSE,
  status_label  TEXT DEFAULT 'Pendiente',
  status_color  TEXT DEFAULT 'blue' CHECK (status_color IN ('blue','yellow','green','red')),
  meeting_link  TEXT,
  is_recurring  BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ==================================================
-- TABLA 6: CHECKLIST / SUBTAREAS
-- ==================================================
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  done        BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ==================================================
-- TABLA 7: RECORDATORIOS ESCALONADOS
-- ==================================================
CREATE TABLE IF NOT EXISTS public.reminders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id    UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  remind_at      TIMESTAMPTZ,
  offset_minutes INTEGER,
  is_sent        BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ==================================================
-- TABLA 8: ARCHIVOS ADJUNTOS
-- ==================================================
CREATE TABLE IF NOT EXISTS public.attachments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id  UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,
  file_url     TEXT,
  file_type    TEXT,
  file_size_kb INTEGER,
  storage_path TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ==================================================
-- TABLA 9: HISTORIAL DE VISITAS A LUGARES
-- ==================================================
CREATE TABLE IF NOT EXISTS public.place_visits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id    UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visited_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ==================================================
-- TABLA 10: ESTADÍSTICAS POR PERÍODO
-- ==================================================
CREATE TABLE IF NOT EXISTS public.activity_stats (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_type  TEXT NOT NULL CHECK (period_type IN ('hoy','semana','mes','año')),
  period_label TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  total_count  INTEGER DEFAULT 0,
  breakdown    JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==================================================
-- TABLA 11: CONSULTAS AL ASISTENTE DE IA
-- ==================================================
CREATE TABLE IF NOT EXISTS public.ai_queries (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  input_text         TEXT NOT NULL,
  response_text      TEXT,
  intent_type        TEXT,
  was_voice          BOOLEAN DEFAULT FALSE,
  activities_created INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);


-- ==================================================
-- TABLA 12: MÉTRICAS GLOBALES (Vista SuperAdmin)
-- ==================================================
CREATE TABLE IF NOT EXISTS public.admin_metrics_log (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_clients          INTEGER DEFAULT 0,
  active_licenses_pct    NUMERIC(5,2) DEFAULT 0,
  monthly_revenue_usd    NUMERIC(10,2) DEFAULT 0,
  total_places_connected INTEGER DEFAULT 0,
  ai_queries_today       INTEGER DEFAULT 0,
  new_clients_this_month INTEGER DEFAULT 0,
  snapshot_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.admin_metrics_log
  (total_clients, active_licenses_pct, monthly_revenue_usd, total_places_connected, ai_queries_today, new_clients_this_month, snapshot_date)
VALUES
  (1420, 98.40, 14200.00, 8650, 3840, 18, CURRENT_DATE);


-- ==================================================
-- ÍNDICES DE RENDIMIENTO
-- ==================================================
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON public.activities (user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_activities_place     ON public.activities (place_id);
CREATE INDEX IF NOT EXISTS idx_activities_category  ON public.activities (category_code);
CREATE INDEX IF NOT EXISTS idx_activities_completed ON public.activities (completed);
CREATE INDEX IF NOT EXISTS idx_place_visits_place   ON public.place_visits (place_id);
CREATE INDEX IF NOT EXISTS idx_place_visits_user    ON public.place_visits (user_id, visited_at);
CREATE INDEX IF NOT EXISTS idx_checklist_activity   ON public.checklist_items (activity_id);
CREATE INDEX IF NOT EXISTS idx_reminders_activity   ON public.reminders (activity_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sent       ON public.reminders (is_sent, remind_at);
CREATE INDEX IF NOT EXISTS idx_ai_queries_user      ON public.ai_queries (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_places_user_fav      ON public.places (user_id, is_favorite);


-- ==================================================
-- TRIGGERS Y FUNCIONES
-- ==================================================

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Incrementar visits_count al registrar una visita
CREATE OR REPLACE FUNCTION public.increment_place_visits()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.places
  SET visits_count    = visits_count + 1,
      last_visit_date = NEW.visited_at
  WHERE id = NEW.place_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_place_visits
  AFTER INSERT ON public.place_visits
  FOR EACH ROW EXECUTE FUNCTION public.increment_place_visits();


-- Registrar visita automáticamente al completar una actividad con lugar
CREATE OR REPLACE FUNCTION public.auto_register_place_visit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.completed = TRUE AND OLD.completed = FALSE AND NEW.place_id IS NOT NULL THEN
    INSERT INTO public.place_visits (place_id, activity_id, user_id, visited_at)
    VALUES (NEW.place_id, NEW.id, NEW.user_id, NEW.activity_date);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_place_visit
  AFTER UPDATE OF completed ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.auto_register_place_visit();


-- Crear perfil automáticamente al registrarse en Supabase Auth
-- ces.rodriguez200@gmail.com recibe rol 'admin' automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, plan, plan_status, acquired_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'ces.rodriguez200@gmail.com' THEN 'admin' ELSE 'client' END,
    CASE WHEN NEW.email = 'ces.rodriguez200@gmail.com' THEN 'Control Total & Gestión de Licencias' ELSE 'TIMEPLUS Free' END,
    'activo',
    CURRENT_DATE
  )
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role      = CASE WHEN EXCLUDED.email = 'ces.rodriguez200@gmail.com' THEN 'admin' ELSE public.profiles.role END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==================================================
-- VISTAS
-- ==================================================

CREATE OR REPLACE VIEW public.today_activities AS
SELECT
  a.id, a.user_id, a.title, a.activity_date, a.activity_time, a.display_time,
  a.completed, a.status_label, a.details, a.responsible,
  c.label     AS category_label,
  c.icon      AS category_icon,
  c.color_hex,
  p.short_name AS place_short_name,
  p.name       AS place_name,
  p.icon       AS place_icon,
  p.id         AS place_id
FROM public.activities a
LEFT JOIN public.activity_categories c ON a.category_code = c.code
LEFT JOIN public.places p ON a.place_id = p.id
WHERE a.activity_date = CURRENT_DATE
ORDER BY a.activity_time ASC NULLS LAST;

CREATE OR REPLACE VIEW public.places_summary AS
SELECT
  p.id, p.user_id, p.name, p.short_name, p.icon, p.address,
  p.is_favorite, p.visits_count, p.history_summary,
  p.last_visit_date, p.next_visit_date,
  COUNT(a.id) FILTER (WHERE a.activity_date >= CURRENT_DATE AND NOT a.completed) AS upcoming_count
FROM public.places p
LEFT JOIN public.activities a ON a.place_id = p.id
GROUP BY p.id
ORDER BY p.is_favorite DESC, p.visits_count DESC;

CREATE OR REPLACE VIEW public.monthly_summary AS
SELECT
  user_id, category_code,
  COUNT(*) AS total_activities,
  COUNT(*) FILTER (WHERE completed = TRUE)  AS completed_count,
  COUNT(*) FILTER (WHERE completed = FALSE) AS pending_count,
  DATE_TRUNC('month', activity_date) AS month
FROM public.activities
WHERE DATE_TRUNC('month', activity_date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY user_id, category_code, DATE_TRUNC('month', activity_date)
ORDER BY total_activities DESC;

CREATE OR REPLACE VIEW public.admin_dashboard AS
SELECT
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'client')                                     AS total_clients,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'client' AND plan_status = 'activo')          AS active_clients,
  (SELECT COUNT(*) FROM public.places)                                                             AS total_places_global,
  (SELECT COUNT(*) FROM public.activities WHERE activity_date = CURRENT_DATE)                     AS activities_today_global,
  (SELECT COUNT(*) FROM public.ai_queries WHERE created_at::date = CURRENT_DATE)                  AS ai_queries_today,
  (SELECT monthly_revenue_usd FROM public.admin_metrics_log ORDER BY snapshot_date DESC LIMIT 1)  AS monthly_revenue_usd;


-- ==================================================
-- ROW LEVEL SECURITY (RLS)
-- ==================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_visits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_queries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_stats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_metrics_log ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "User manages own profile"
  ON public.profiles FOR ALL USING (id = auth.uid());

CREATE POLICY "Admin reads all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Places
CREATE POLICY "User manages own places"
  ON public.places FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admin reads all places"
  ON public.places FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Activities
CREATE POLICY "User manages own activities"
  ON public.activities FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admin reads all activities"
  ON public.activities FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Checklist items
CREATE POLICY "User manages own checklist items"
  ON public.checklist_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND a.user_id = auth.uid()));

-- Reminders
CREATE POLICY "User manages own reminders"
  ON public.reminders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND a.user_id = auth.uid()));

-- Attachments
CREATE POLICY "User manages own attachments"
  ON public.attachments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND a.user_id = auth.uid()));

-- Place visits
CREATE POLICY "User sees own place visits"
  ON public.place_visits FOR ALL USING (user_id = auth.uid());

-- AI Queries
CREATE POLICY "User sees own AI queries"
  ON public.ai_queries FOR ALL USING (user_id = auth.uid());

-- Stats
CREATE POLICY "User sees own stats"
  ON public.activity_stats FOR ALL USING (user_id = auth.uid());

-- Plans & Categories: lectura pública
CREATE POLICY "All users can read plans"
  ON public.plans FOR SELECT USING (TRUE);

CREATE POLICY "All users can read categories"
  ON public.activity_categories FOR SELECT USING (TRUE);

-- Admin metrics: solo SuperAdmin
CREATE POLICY "Only admin reads metrics"
  ON public.admin_metrics_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));


-- ==================================================
-- VERIFICACIÓN FINAL
-- ==================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
