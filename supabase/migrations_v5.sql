-- =====================================================================
-- AutoDetailing Manager — Migration v5
-- Onboarding wizard + gestión de usuarios del tenant
-- Ejecutar DESPUÉS de migrations.sql, migrations_v2.sql, migrations_v3.sql
-- =====================================================================

-- Progreso del wizard de onboarding
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_paso INT DEFAULT 0;

-- Bucket público para el logo del negocio (subido en el paso 1 del wizard)
-- La subida se hace siempre con supabaseAdmin (service role), por lo que
-- no se requieren policies de storage adicionales.
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;
