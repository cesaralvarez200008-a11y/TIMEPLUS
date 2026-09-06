-- ============================================================
-- TIMEPLUS — PARTE 4: TABLA DE SOLICITUDES DE CLIENTES
-- Ejecuta este script en el Editor SQL de tu panel de Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password        TEXT,
  provider        TEXT DEFAULT 'Google Workspace',
  plan            TEXT DEFAULT 'TIMEPLUS Connect Pro',
  status          TEXT DEFAULT 'Pendiente',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;

-- 1. Permitir que cualquier visitante (anon) envíe su solicitud de registro
DROP POLICY IF EXISTS "Cualquiera puede enviar solicitud" ON public.client_requests;
CREATE POLICY "Cualquiera puede enviar solicitud"
  ON public.client_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Permitir lectura de solicitudes para visualización en el SuperAdmin
DROP POLICY IF EXISTS "Lectura de solicitudes" ON public.client_requests;
CREATE POLICY "Lectura de solicitudes"
  ON public.client_requests FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Permitir actualizar estado (Aprobar / Rechazar)
DROP POLICY IF EXISTS "Actualizar solicitudes" ON public.client_requests;
CREATE POLICY "Actualizar solicitudes"
  ON public.client_requests FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Permitir eliminar solicitudes
DROP POLICY IF EXISTS "Eliminar solicitudes" ON public.client_requests;
CREATE POLICY "Eliminar solicitudes"
  ON public.client_requests FOR DELETE
  TO anon, authenticated
  USING (true);

-- 5. Habilitar publicación en Realtime para cambios en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_requests;

-- Verificación
SELECT table_name FROM information_schema.tables WHERE table_name = 'client_requests';
