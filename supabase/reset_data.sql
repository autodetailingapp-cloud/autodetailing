-- =====================================================================
-- AutoDetailing Manager — Reset de datos de prueba
-- Borra TODOS los datos manteniendo la estructura de tablas intacta.
-- Ejecutar en Supabase SQL Editor (Project → SQL Editor → New query)
-- Orden respeta las foreign keys (dependientes primero).
--
-- NOTA: esto borra las filas de "profiles", pero NO los usuarios en
-- Supabase Auth (auth.users) — esos quedan huérfanos y deben borrarse
-- aparte desde el Dashboard (Authentication → Users) o con
-- supabaseAdmin.auth.admin.deleteUser(id) si también quieres limpiarlos.
-- =====================================================================

DELETE FROM movimientos_inventario;
DELETE FROM pagos_cartera;
DELETE FROM cartera;
DELETE FROM cartera_proveedores;
DELETE FROM detalle_ventas;
DELETE FROM ventas;
DELETE FROM compras;
DELETE FROM asistencia;
DELETE FROM colaboradores;
DELETE FROM activos_fijos;
DELETE FROM servicio_insumos;
DELETE FROM insumos;
DELETE FROM servicios;
DELETE FROM clientes;
DELETE FROM caja_diaria;
DELETE FROM suscripciones;
DELETE FROM profiles WHERE tenant_id IS NOT NULL;
DELETE FROM tenants;
