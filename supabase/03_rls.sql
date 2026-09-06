-- ============================================================
-- TIMEPLUS — PARTE 3: ROW LEVEL SECURITY (RLS)
-- Ejecuta DESPUÉS de 01_tables.sql y 02_functions.sql
-- ============================================================

-- Activar RLS en todas las tablas
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_visits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_queries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_metrics_log  ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- PROFILES
-- ==================================================
DROP POLICY IF EXISTS "User manages own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Admin reads all profiles"  ON public.profiles;

CREATE POLICY "User manages own profile"
  ON public.profiles FOR ALL
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin reads all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ==================================================
-- PLANS (lectura pública para todos)
-- ==================================================
DROP POLICY IF EXISTS "All users can read plans" ON public.plans;

CREATE POLICY "All users can read plans"
  ON public.plans FOR SELECT
  TO authenticated
  USING (true);

-- ==================================================
-- ACTIVITY_CATEGORIES (lectura pública)
-- ==================================================
DROP POLICY IF EXISTS "All users can read categories" ON public.activity_categories;

CREATE POLICY "All users can read categories"
  ON public.activity_categories FOR SELECT
  TO authenticated
  USING (true);

-- ==================================================
-- PLACES
-- ==================================================
DROP POLICY IF EXISTS "User manages own places" ON public.places;
DROP POLICY IF EXISTS "Admin reads all places"  ON public.places;

CREATE POLICY "User manages own places"
  ON public.places FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin reads all places"
  ON public.places FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ==================================================
-- ACTIVITIES
-- ==================================================
DROP POLICY IF EXISTS "User manages own activities" ON public.activities;
DROP POLICY IF EXISTS "Admin reads all activities"  ON public.activities;

CREATE POLICY "User manages own activities"
  ON public.activities FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin reads all activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ==================================================
-- CHECKLIST_ITEMS
-- ==================================================
DROP POLICY IF EXISTS "User manages own checklist items" ON public.checklist_items;

CREATE POLICY "User manages own checklist items"
  ON public.checklist_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = checklist_items.activity_id
        AND a.user_id = auth.uid()
    )
  );

-- ==================================================
-- REMINDERS
-- ==================================================
DROP POLICY IF EXISTS "User manages own reminders" ON public.reminders;

CREATE POLICY "User manages own reminders"
  ON public.reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = reminders.activity_id
        AND a.user_id = auth.uid()
    )
  );

-- ==================================================
-- ATTACHMENTS
-- ==================================================
DROP POLICY IF EXISTS "User manages own attachments" ON public.attachments;

CREATE POLICY "User manages own attachments"
  ON public.attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = attachments.activity_id
        AND a.user_id = auth.uid()
    )
  );

-- ==================================================
-- PLACE_VISITS
-- ==================================================
DROP POLICY IF EXISTS "User sees own place visits" ON public.place_visits;

CREATE POLICY "User sees own place visits"
  ON public.place_visits FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- ==================================================
-- ACTIVITY_STATS
-- ==================================================
DROP POLICY IF EXISTS "User sees own stats" ON public.activity_stats;

CREATE POLICY "User sees own stats"
  ON public.activity_stats FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- ==================================================
-- AI_QUERIES
-- ==================================================
DROP POLICY IF EXISTS "User sees own AI queries" ON public.ai_queries;

CREATE POLICY "User sees own AI queries"
  ON public.ai_queries FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- ==================================================
-- ADMIN_METRICS_LOG (solo SuperAdmin)
-- ==================================================
DROP POLICY IF EXISTS "Only admin reads metrics" ON public.admin_metrics_log;

CREATE POLICY "Only admin reads metrics"
  ON public.admin_metrics_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- VERIFICACIÓN FINAL
SELECT 'Parte 3 OK: RLS activado en todas las tablas' AS resultado;

SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
