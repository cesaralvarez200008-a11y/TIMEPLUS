-- ============================================================
-- TIMEPLUS — PARTE 5: SALUD, MEDICAMENTOS Y FITNESS EN SUPABASE
-- Módulos: Dispensario & Control de Stock de Medicamentos,
--          Registro de Tomas Confirmadas y Rutinas de Fitness
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- TABLA 1: MEDICATIONS (Dispensario & Control de Stock del Mes)
-- Guarda los medicamentos configurados, dosis, horarios y stock
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medications (
  id               TEXT PRIMARY KEY,
  user_email       TEXT NOT NULL,
  user_name        TEXT,
  name             TEXT NOT NULL,
  dose_per_take    NUMERIC(6,2) DEFAULT 1,
  unit             TEXT DEFAULT 'pastillas',
  frequency        TEXT DEFAULT 'Cada 24 horas',
  time             TEXT DEFAULT '08:00',
  current_stock    INTEGER DEFAULT 30,
  daily_dose       INTEGER DEFAULT 1,
  instructions     TEXT,
  refill_threshold INTEGER DEFAULT 5,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA 2: MEDICATION_LOGS (Historial de Tomas Confirmadas)
-- Cada vez que el usuario hace clic en "✓ Sí, tomado (-1 dosis)"
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id   TEXT REFERENCES public.medications(id) ON DELETE SET NULL,
  user_email      TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  dose_taken      NUMERIC(6,2) DEFAULT 1,
  stock_after     INTEGER,
  status          TEXT DEFAULT 'Tomado',
  taken_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA 3: FITNESS_WORKOUTS (Historial de Rutinas y Ejercicios)
-- Gimnasio (ejercicios compuestos, series, peso), Aire libre (km), En casa
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fitness_workouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email      TEXT NOT NULL,
  user_name       TEXT,
  title           TEXT NOT NULL,
  activity_type   TEXT NOT NULL DEFAULT 'gym' CHECK (activity_type IN ('gym', 'outdoor', 'home', 'sport')),
  muscle_group    TEXT,
  duration        TEXT,
  duration_hours  NUMERIC(5,2) DEFAULT 1.0,
  distance_km     NUMERIC(6,2) DEFAULT 0,
  calories        INTEGER DEFAULT 400,
  location        TEXT,
  exercises       JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- ÍNDICES PARA VELOCIDAD DE CONSULTA
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_medications_user ON public.medications (user_email);
CREATE INDEX IF NOT EXISTS idx_med_logs_user     ON public.medication_logs (user_email, taken_at);
CREATE INDEX IF NOT EXISTS idx_workouts_user     ON public.fitness_workouts (user_email, created_at);

-- ------------------------------------------------------------
-- SEGURIDAD ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_workouts ENABLE ROW LEVEL SECURITY;

-- Políticas para MEDICATIONS
DROP POLICY IF EXISTS "Acceso total a medicamentos" ON public.medications;
CREATE POLICY "Acceso total a medicamentos"
  ON public.medications FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para MEDICATION_LOGS
DROP POLICY IF EXISTS "Acceso total a logs de medicamentos" ON public.medication_logs;
CREATE POLICY "Acceso total a logs de medicamentos"
  ON public.medication_logs FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para FITNESS_WORKOUTS
DROP POLICY IF EXISTS "Acceso total a entrenamientos" ON public.fitness_workouts;
CREATE POLICY "Acceso total a entrenamientos"
  ON public.fitness_workouts FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------
-- REALTIME (Para sincronización en vivo entre dispositivos)
-- ------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.medications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.medication_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.fitness_workouts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Verificación de tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('medications', 'medication_logs', 'fitness_workouts');
