-- =====================================================================
-- AutoDetailing Manager — Migration: Integridad contable + nuevos módulos
-- Ejecutar en Supabase SQL Editor (Project → SQL Editor → New query)
-- =====================================================================

-- 1. Restricción única en caja_diaria para upsert
ALTER TABLE caja_diaria
  ADD CONSTRAINT IF NOT EXISTS caja_diaria_tenant_fecha_key
  UNIQUE (tenant_id, fecha);

-- 2. Tabla: cartera (cuentas por cobrar)
CREATE TABLE IF NOT EXISTS cartera (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  venta_id         UUID REFERENCES ventas(id) ON DELETE CASCADE NOT NULL,
  cliente_id       UUID REFERENCES clientes(id) NOT NULL,
  monto_original   DECIMAL(10,2) NOT NULL,
  monto_pagado     DECIMAL(10,2) NOT NULL DEFAULT 0,
  saldo_pendiente  DECIMAL(10,2) NOT NULL,
  fecha_venta      DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado           VARCHAR(20) NOT NULL DEFAULT 'vigente',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla: pagos_cartera (registro de cada pago parcial/total)
CREATE TABLE IF NOT EXISTS pagos_cartera (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL,
  cartera_id   UUID REFERENCES cartera(id) ON DELETE CASCADE NOT NULL,
  monto        DECIMAL(10,2) NOT NULL,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_pago    VARCHAR(20) NOT NULL DEFAULT 'Efectivo',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla: colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  nombre       VARCHAR(255) NOT NULL,
  cargo        VARCHAR(100),
  salario_dia  DECIMAL(10,2) NOT NULL DEFAULT 0,
  dias_semana  INT NOT NULL DEFAULT 5 CHECK (dias_semana BETWEEN 1 AND 7),
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla: asistencia
CREATE TABLE IF NOT EXISTS asistencia (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID NOT NULL,
  colaborador_id   UUID REFERENCES colaboradores(id) ON DELETE CASCADE NOT NULL,
  fecha            DATE NOT NULL,
  estado           VARCHAR(20) NOT NULL DEFAULT 'presente',
  CONSTRAINT asistencia_colab_fecha_key UNIQUE (colaborador_id, fecha)
);

-- 6. Tabla: activos_fijos
CREATE TABLE IF NOT EXISTS activos_fijos (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  nombre              VARCHAR(255) NOT NULL,
  categoria           VARCHAR(100) NOT NULL,
  valor_adquisicion   DECIMAL(12,2) NOT NULL,
  fecha_compra        DATE NOT NULL,
  vida_util_anos      INT NOT NULL,
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- RPC: recalcular_caja_diaria
-- Recalcula totales de caja desde ventas + compras + cobros de cartera
-- Solo actualiza si la caja NO está cerrada
-- =====================================================================
CREATE OR REPLACE FUNCTION recalcular_caja_diaria(p_tenant_id UUID, p_fecha DATE)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_ef   DECIMAL(10,2) := 0;
  v_tr   DECIMAL(10,2) := 0;
  v_cr   DECIMAL(10,2) := 0;
  v_cob  DECIMAL(10,2) := 0;
  v_gas  DECIMAL(10,2) := 0;
BEGIN
  -- Ventas activas del día por tipo de pago
  SELECT
    COALESCE(SUM(CASE WHEN tipo_pago = 'Efectivo'      THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo_pago = 'Transferencia' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo_pago = 'Crédito'       THEN total ELSE 0 END), 0)
  INTO v_ef, v_tr, v_cr
  FROM ventas
  WHERE tenant_id = p_tenant_id AND fecha = p_fecha AND estado = 'activa';

  -- Cobros de cartera del día (entran como efectivo)
  SELECT COALESCE(SUM(monto), 0) INTO v_cob
  FROM pagos_cartera
  WHERE tenant_id = p_tenant_id AND fecha = p_fecha;

  v_ef := v_ef + v_cob;

  -- Compras y gastos del día
  SELECT COALESCE(SUM(total), 0) INTO v_gas
  FROM compras
  WHERE tenant_id = p_tenant_id AND fecha = p_fecha;

  INSERT INTO caja_diaria (
    tenant_id, fecha,
    total_efectivo, total_transferencia, total_credito, total_ventas,
    total_gastos, saldo_final, cerrado
  ) VALUES (
    p_tenant_id, p_fecha,
    v_ef, v_tr, v_cr,
    v_ef + v_tr + v_cr,
    v_gas,
    v_ef + v_tr - v_gas,
    false
  )
  ON CONFLICT (tenant_id, fecha) DO UPDATE SET
    total_efectivo      = EXCLUDED.total_efectivo,
    total_transferencia = EXCLUDED.total_transferencia,
    total_credito       = EXCLUDED.total_credito,
    total_ventas        = EXCLUDED.total_ventas,
    total_gastos        = EXCLUDED.total_gastos,
    saldo_final         = EXCLUDED.saldo_final
  WHERE caja_diaria.cerrado = false;
END;
$$;

-- =====================================================================
-- RPC: anular_venta_contable
-- Anula venta, elimina cartera asociada, recalcula caja
-- Rechaza si la caja del día está cerrada
-- =====================================================================
CREATE OR REPLACE FUNCTION anular_venta_contable(p_venta_id UUID, p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_fecha    DATE;
  v_cerrada  BOOLEAN := false;
  v_estado   VARCHAR(20);
BEGIN
  SELECT fecha, estado INTO v_fecha, v_estado
  FROM ventas WHERE id = p_venta_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN '{"error":"Venta no encontrada"}'::JSON;
  END IF;
  IF v_estado = 'anulada' THEN
    RETURN '{"error":"La venta ya está anulada"}'::JSON;
  END IF;

  SELECT cerrado INTO v_cerrada
  FROM caja_diaria WHERE tenant_id = p_tenant_id AND fecha = v_fecha;

  IF v_cerrada = true THEN
    RETURN '{"error":"La caja de ese día ya está cerrada. No se puede anular."}'::JSON;
  END IF;

  UPDATE ventas SET estado = 'anulada'
  WHERE id = p_venta_id AND tenant_id = p_tenant_id;

  DELETE FROM cartera WHERE venta_id = p_venta_id AND tenant_id = p_tenant_id;

  PERFORM recalcular_caja_diaria(p_tenant_id, v_fecha);

  RETURN '{"success":true}'::JSON;
END;
$$;

-- =====================================================================
-- RPC: registrar_pago_cartera
-- Registra pago parcial/total, crea pagos_cartera, recalcula caja
-- =====================================================================
CREATE OR REPLACE FUNCTION registrar_pago_cartera(
  p_cartera_id UUID,
  p_tenant_id  UUID,
  p_monto      DECIMAL(10,2),
  p_tipo_pago  VARCHAR(20) DEFAULT 'Efectivo'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_hoy          DATE := CURRENT_DATE;
  v_monto_orig   DECIMAL(10,2);
  v_monto_pag    DECIMAL(10,2);
  v_saldo        DECIMAL(10,2);
  v_nuevo_pagado DECIMAL(10,2);
  v_nuevo_saldo  DECIMAL(10,2);
  v_nuevo_estado VARCHAR(20);
  v_cerrada      BOOLEAN := false;
BEGIN
  SELECT monto_original, monto_pagado, saldo_pendiente
  INTO v_monto_orig, v_monto_pag, v_saldo
  FROM cartera WHERE id = p_cartera_id AND tenant_id = p_tenant_id;

  IF NOT FOUND  THEN RETURN '{"error":"Registro no encontrado"}'::JSON; END IF;
  IF p_monto <= 0 THEN RETURN '{"error":"El monto debe ser mayor a 0"}'::JSON; END IF;
  IF p_monto > v_saldo + 0.009 THEN
    RETURN json_build_object('error', 'El pago (' || p_monto || ') supera el saldo pendiente (' || v_saldo || ')');
  END IF;

  SELECT cerrado INTO v_cerrada
  FROM caja_diaria WHERE tenant_id = p_tenant_id AND fecha = v_hoy;
  IF v_cerrada = true THEN RETURN '{"error":"La caja de hoy ya está cerrada"}'::JSON; END IF;

  v_nuevo_pagado := v_monto_pag + p_monto;
  v_nuevo_saldo  := GREATEST(v_monto_orig - v_nuevo_pagado, 0);
  v_nuevo_estado := CASE WHEN v_nuevo_saldo < 0.01 THEN 'pagado' ELSE 'vigente' END;

  UPDATE cartera SET
    monto_pagado    = v_nuevo_pagado,
    saldo_pendiente = v_nuevo_saldo,
    estado          = v_nuevo_estado
  WHERE id = p_cartera_id AND tenant_id = p_tenant_id;

  INSERT INTO pagos_cartera (tenant_id, cartera_id, monto, fecha, tipo_pago)
  VALUES (p_tenant_id, p_cartera_id, p_monto, v_hoy, p_tipo_pago);

  PERFORM recalcular_caja_diaria(p_tenant_id, v_hoy);

  RETURN json_build_object('success', true, 'estado', v_nuevo_estado, 'saldo', v_nuevo_saldo);
END;
$$;
