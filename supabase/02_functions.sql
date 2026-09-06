-- ============================================================
-- TIMEPLUS — PARTE 2: TRIGGERS, FUNCIONES Y VISTAS
-- Ejecuta DESPUÉS de 01_tables.sql
-- ============================================================

-- ==================================================
-- FUNCIONES Y TRIGGERS
-- ==================================================

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at   ON public.profiles;
DROP TRIGGER IF EXISTS trg_places_updated_at     ON public.places;
DROP TRIGGER IF EXISTS trg_activities_updated_at ON public.activities;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Incrementar visits_count al registrar visita
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

DROP TRIGGER IF EXISTS trg_increment_place_visits ON public.place_visits;
CREATE TRIGGER trg_increment_place_visits
  AFTER INSERT ON public.place_visits
  FOR EACH ROW EXECUTE FUNCTION public.increment_place_visits();


-- Registrar visita automáticamente al completar actividad con lugar
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

DROP TRIGGER IF EXISTS trg_auto_place_visit ON public.activities;
CREATE TRIGGER trg_auto_place_visit
  AFTER UPDATE OF completed ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.auto_register_place_visit();


-- Crear perfil automáticamente al registrar usuario
-- ces.rodriguez200@gmail.com => rol admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, plan, plan_status, acquired_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'ces.rodriguez200@gmail.com' THEN 'admin' ELSE 'client' END,
    CASE WHEN NEW.email = 'ces.rodriguez200@gmail.com'
         THEN 'Control Total & Gestión de Licencias'
         ELSE 'TIMEPLUS Free' END,
    'activo',
    CURRENT_DATE
  )
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role      = CASE
                      WHEN EXCLUDED.email = 'ces.rodriguez200@gmail.com' THEN 'admin'
                      ELSE public.profiles.role
                    END;
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
  a.id,
  a.user_id,
  a.title,
  a.activity_date,
  a.activity_time,
  a.display_time,
  a.completed,
  a.status_label,
  a.details,
  a.responsible,
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
  p.id,
  p.user_id,
  p.name,
  p.short_name,
  p.icon,
  p.address,
  p.is_favorite,
  p.visits_count,
  p.history_summary,
  p.last_visit_date,
  p.next_visit_date,
  COUNT(a.id) FILTER (WHERE a.activity_date >= CURRENT_DATE AND NOT a.completed) AS upcoming_count
FROM public.places p
LEFT JOIN public.activities a ON a.place_id = p.id
GROUP BY p.id
ORDER BY p.is_favorite DESC, p.visits_count DESC;


CREATE OR REPLACE VIEW public.monthly_summary AS
SELECT
  user_id,
  category_code,
  COUNT(*)                                      AS total_activities,
  COUNT(*) FILTER (WHERE completed = TRUE)      AS completed_count,
  COUNT(*) FILTER (WHERE completed = FALSE)     AS pending_count,
  DATE_TRUNC('month', activity_date)            AS month
FROM public.activities
WHERE DATE_TRUNC('month', activity_date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY user_id, category_code, DATE_TRUNC('month', activity_date)
ORDER BY total_activities DESC;


CREATE OR REPLACE VIEW public.admin_dashboard AS
SELECT
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'client')                                    AS total_clients,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'client' AND plan_status = 'activo')         AS active_clients,
  (SELECT COUNT(*) FROM public.places)                                                            AS total_places_global,
  (SELECT COUNT(*) FROM public.activities WHERE activity_date = CURRENT_DATE)                    AS activities_today_global,
  (SELECT COUNT(*) FROM public.ai_queries WHERE created_at::date = CURRENT_DATE)                 AS ai_queries_today,
  (SELECT monthly_revenue_usd FROM public.admin_metrics_log ORDER BY snapshot_date DESC LIMIT 1) AS monthly_revenue_usd;

SELECT 'Parte 2 OK: Triggers, funciones y vistas creadas' AS resultado;
