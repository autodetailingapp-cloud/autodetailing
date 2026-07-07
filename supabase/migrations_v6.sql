-- =====================================================================
-- AutoDetailing Manager — Migration v6
-- Fix: falta la restricción UNIQUE que necesita el RPC upsert_asistencias
-- (su ON CONFLICT (colaborador_id, fecha) fallaba con "no unique or
-- exclusion constraint matching the ON CONFLICT specification")
-- Ejecutar DESPUÉS de migrations.sql, migrations_v2.sql, migrations_v3.sql,
-- migrations_v4.sql, migrations_v5.sql
-- =====================================================================

ALTER TABLE asistencia
  DROP CONSTRAINT IF EXISTS asistencia_colab_fecha_key;
ALTER TABLE asistencia
  ADD CONSTRAINT asistencia_colab_fecha_key
  UNIQUE (colaborador_id, fecha);
