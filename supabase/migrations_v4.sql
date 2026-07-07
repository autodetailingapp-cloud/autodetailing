-- =====================================================================
-- AutoDetailing Manager — Migration v4
-- Datos de factura rápida para consumidor final (sin crear cliente)
-- Ejecutar DESPUÉS de migrations.sql, migrations_v2.sql y migrations_v3.sql
-- =====================================================================

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS factura_nombre VARCHAR(150);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS factura_ruc_cedula VARCHAR(20);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS factura_direccion VARCHAR(255);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS factura_email VARCHAR(150);
