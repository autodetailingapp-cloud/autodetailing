-- =====================================================================
-- AutoDetailing Manager — Migration v3
-- Inventario de insumos y costos por servicio
-- Ejecutar DESPUÉS de migrations.sql y migrations_v2.sql
-- =====================================================================

-- 1. Tabla: insumos (materias primas / insumos de consumo)
CREATE TABLE IF NOT EXISTS insumos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  nombre          VARCHAR(100) NOT NULL,
  descripcion     TEXT,
  unidad_medida   VARCHAR(20) NOT NULL,
  stock_actual    DECIMAL(10,3) NOT NULL DEFAULT 0,
  stock_minimo    DECIMAL(10,3) NOT NULL DEFAULT 0,
  costo_unitario  DECIMAL(10,2) NOT NULL DEFAULT 0,
  proveedor       VARCHAR(100),
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insumos_tenant ON insumos(tenant_id);

-- 2. Tabla: servicio_insumos (receta de insumos por servicio)
CREATE TABLE IF NOT EXISTS servicio_insumos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  servicio_id      UUID REFERENCES servicios(id) ON DELETE CASCADE NOT NULL,
  insumo_id        UUID REFERENCES insumos(id) ON DELETE CASCADE NOT NULL,
  cantidad         DECIMAL(10,3) NOT NULL,
  costo_calculado  DECIMAL(10,2),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(servicio_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_servicio_insumos_servicio ON servicio_insumos(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicio_insumos_insumo ON servicio_insumos(insumo_id);

-- 3. Tabla: movimientos_inventario (historial de entradas/consumos/reversiones)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  insumo_id        UUID REFERENCES insumos(id) ON DELETE CASCADE NOT NULL,
  tipo             VARCHAR(20) NOT NULL,
  cantidad         DECIMAL(10,3) NOT NULL,
  stock_anterior   DECIMAL(10,3),
  stock_nuevo      DECIMAL(10,3),
  referencia_id    UUID,
  referencia_tipo  VARCHAR(20),
  fecha            DATE DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_insumo ON movimientos_inventario(insumo_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_referencia ON movimientos_inventario(referencia_id, referencia_tipo);

-- =====================================================================
-- RPC: registrar_entrada_insumo
-- Suma stock, actualiza costo_unitario (último costo de compra),
-- registra movimiento de entrada y crea compra (tipo Costo) automática
-- =====================================================================
CREATE OR REPLACE FUNCTION registrar_entrada_insumo(
  p_tenant_id      UUID,
  p_insumo_id      UUID,
  p_cantidad       DECIMAL,
  p_costo_unitario DECIMAL,
  p_proveedor      VARCHAR DEFAULT NULL,
  p_fecha          DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_stock_anterior DECIMAL(10,3);
  v_nombre         VARCHAR(100);
  v_stock_nuevo    DECIMAL(10,3);
  v_total          DECIMAL(10,2);
  v_compra_id      UUID;
BEGIN
  SELECT stock_actual, nombre INTO v_stock_anterior, v_nombre
  FROM insumos WHERE id = p_insumo_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN '{"error":"Insumo no encontrado"}'::JSON; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RETURN '{"error":"La cantidad debe ser mayor a 0"}'::JSON; END IF;
  IF p_costo_unitario IS NULL OR p_costo_unitario < 0 THEN RETURN '{"error":"El costo unitario no es válido"}'::JSON; END IF;

  v_stock_nuevo := v_stock_anterior + p_cantidad;
  v_total := ROUND(p_cantidad * p_costo_unitario, 2);

  UPDATE insumos SET
    stock_actual   = v_stock_nuevo,
    costo_unitario = p_costo_unitario,
    proveedor      = COALESCE(p_proveedor, proveedor)
  WHERE id = p_insumo_id AND tenant_id = p_tenant_id;

  INSERT INTO compras (tenant_id, proveedor, tipo, tipo_doc_compra, descripcion, fecha, subtotal, iva, total, plazo_pago_proveedor)
  VALUES (p_tenant_id, COALESCE(p_proveedor, 'No especificado'), 'Costo', 'Nota de Venta',
          'Compra insumo: ' || v_nombre, p_fecha, v_total, 0, v_total, 0)
  RETURNING id INTO v_compra_id;

  INSERT INTO movimientos_inventario (tenant_id, insumo_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, fecha)
  VALUES (p_tenant_id, p_insumo_id, 'entrada', p_cantidad, v_stock_anterior, v_stock_nuevo, v_compra_id, 'compra', p_fecha);

  PERFORM recalcular_caja_diaria(p_tenant_id, p_fecha);

  RETURN json_build_object('success', true, 'stock_nuevo', v_stock_nuevo, 'compra_id', v_compra_id);
END;
$$;

-- =====================================================================
-- RPC: descontar_inventario_venta
-- Descuenta del stock de cada insumo la cantidad de la receta
-- (cantidad vendida del servicio x cantidad de receta) y registra
-- el movimiento de consumo
-- =====================================================================
CREATE OR REPLACE FUNCTION descontar_inventario_venta(p_venta_id UUID, p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_fecha          DATE;
  rec              RECORD;
  v_stock_anterior DECIMAL(10,3);
  v_stock_nuevo    DECIMAL(10,3);
BEGIN
  SELECT fecha INTO v_fecha FROM ventas WHERE id = p_venta_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RETURN '{"error":"Venta no encontrada"}'::JSON; END IF;

  FOR rec IN
    SELECT si.insumo_id, SUM(dv.cantidad * si.cantidad) AS cantidad_total
    FROM detalle_ventas dv
    JOIN servicio_insumos si ON si.servicio_id = dv.servicio_id
    WHERE dv.venta_id = p_venta_id
    GROUP BY si.insumo_id
  LOOP
    SELECT stock_actual INTO v_stock_anterior
    FROM insumos WHERE id = rec.insumo_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    v_stock_nuevo := v_stock_anterior - rec.cantidad_total;

    UPDATE insumos SET stock_actual = v_stock_nuevo
    WHERE id = rec.insumo_id AND tenant_id = p_tenant_id;

    INSERT INTO movimientos_inventario (tenant_id, insumo_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, fecha)
    VALUES (p_tenant_id, rec.insumo_id, 'consumo', rec.cantidad_total, v_stock_anterior, v_stock_nuevo, p_venta_id, 'venta', v_fecha);
  END LOOP;

  RETURN '{"success":true}'::JSON;
END;
$$;

-- =====================================================================
-- RPC: revertir_inventario_venta
-- Repone el stock consumido por una venta que se anula
-- =====================================================================
CREATE OR REPLACE FUNCTION revertir_inventario_venta(p_venta_id UUID, p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  rec              RECORD;
  v_stock_anterior DECIMAL(10,3);
  v_stock_nuevo    DECIMAL(10,3);
BEGIN
  FOR rec IN
    SELECT insumo_id, cantidad, fecha
    FROM movimientos_inventario
    WHERE referencia_id = p_venta_id AND referencia_tipo = 'venta'
      AND tipo = 'consumo' AND tenant_id = p_tenant_id
  LOOP
    SELECT stock_actual INTO v_stock_anterior
    FROM insumos WHERE id = rec.insumo_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    v_stock_nuevo := v_stock_anterior + rec.cantidad;

    UPDATE insumos SET stock_actual = v_stock_nuevo
    WHERE id = rec.insumo_id AND tenant_id = p_tenant_id;

    INSERT INTO movimientos_inventario (tenant_id, insumo_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, fecha)
    VALUES (p_tenant_id, rec.insumo_id, 'reversion', rec.cantidad, v_stock_anterior, v_stock_nuevo, p_venta_id, 'venta_anulada', rec.fecha);
  END LOOP;
END;
$$;

-- =====================================================================
-- RPC: calcular_costo_venta
-- Costo total de insumos consumidos en una venta puntual
-- (cantidad vendida del servicio x cantidad de receta x costo unitario)
-- =====================================================================
CREATE OR REPLACE FUNCTION calcular_costo_venta(p_venta_id UUID)
RETURNS DECIMAL
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(dv.cantidad * si.cantidad * i.costo_unitario), 0)
  FROM detalle_ventas dv
  JOIN servicio_insumos si ON si.servicio_id = dv.servicio_id
  JOIN insumos i ON i.id = si.insumo_id
  WHERE dv.venta_id = p_venta_id;
$$;

-- =====================================================================
-- RPC: costo_insumos_periodo
-- Costo total de insumos consumidos por ventas activas en un rango de
-- fechas (usado por el P&G como Costo de Ventas variable)
-- =====================================================================
CREATE OR REPLACE FUNCTION costo_insumos_periodo(p_tenant_id UUID, p_desde DATE, p_hasta DATE)
RETURNS DECIMAL
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(dv.cantidad * si.cantidad * i.costo_unitario), 0)
  FROM detalle_ventas dv
  JOIN ventas v ON v.id = dv.venta_id
  JOIN servicio_insumos si ON si.servicio_id = dv.servicio_id
  JOIN insumos i ON i.id = si.insumo_id
  WHERE v.tenant_id = p_tenant_id
    AND v.estado = 'activa'
    AND v.fecha BETWEEN p_desde AND p_hasta;
$$;

-- =====================================================================
-- RPC: anular_venta_contable (reemplazo)
-- Igual que en migrations.sql, ahora también repone el inventario
-- consumido por la venta anulada
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

  PERFORM revertir_inventario_venta(p_venta_id, p_tenant_id);

  PERFORM recalcular_caja_diaria(p_tenant_id, v_fecha);

  RETURN '{"success":true}'::JSON;
END;
$$;
