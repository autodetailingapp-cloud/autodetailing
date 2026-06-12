-- =====================================================================
-- AutoDetailing Manager — Migration v2
-- Ejecutar DESPUÉS de migrations.sql
-- =====================================================================

-- Asegurar tenant_id en asistencia (puede fallar si ya existe — ignorar)
ALTER TABLE asistencia ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Nuevas columnas en compras
ALTER TABLE compras ADD COLUMN IF NOT EXISTS tipo_doc_compra VARCHAR(20) DEFAULT 'Factura';
ALTER TABLE compras ADD COLUMN IF NOT EXISTS plazo_pago_proveedor INT DEFAULT 0;

-- cartera_proveedores: deudas con proveedores
CREATE TABLE IF NOT EXISTS cartera_proveedores (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID REFERENCES tenants(id) NOT NULL,
  compra_id        UUID REFERENCES compras(id) ON DELETE CASCADE NOT NULL,
  proveedor        VARCHAR(100),
  monto_original   DECIMAL(10,2),
  monto_pagado     DECIMAL(10,2) DEFAULT 0,
  saldo_pendiente  DECIMAL(10,2),
  fecha_compra     DATE,
  fecha_vencimiento DATE,
  estado           VARCHAR(20) DEFAULT 'vigente',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RPC: upsert_asistencias (evita el problema de schema cache de PostgREST)
CREATE OR REPLACE FUNCTION upsert_asistencias(p_registros JSONB)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  reg JSONB;
BEGIN
  FOR reg IN SELECT * FROM jsonb_array_elements(p_registros)
  LOOP
    INSERT INTO asistencia (tenant_id, colaborador_id, fecha, estado)
    VALUES (
      (reg->>'tenant_id')::UUID,
      (reg->>'colaborador_id')::UUID,
      (reg->>'fecha')::DATE,
      reg->>'estado'
    )
    ON CONFLICT (colaborador_id, fecha) DO UPDATE SET
      estado    = EXCLUDED.estado,
      tenant_id = EXCLUDED.tenant_id;
  END LOOP;
END;
$$;
