# AutoDetailing Manager — Contexto del Proyecto

## 1. Objetivo del Proyecto
AutoDetailing Manager es un SaaS (Software como Servicio) de administración para lavaderos de autos y detailing, diseñado para el mercado ecuatoriano. Se vende como suscripción mensual a lavaderos que necesitan administrar sus operaciones, finanzas y cumplimiento tributario con el SRI de Ecuador.

El sistema es multi-tenant: cada lavadero tiene su propio espacio aislado de datos mediante Row Level Security (RLS) de Supabase.

## 2. Modelo de Negocio
- SaaS con 3 planes de suscripción mensual:
  * Plan Emprendedor: $18/mes (RIMPE Popular)
  * Plan Pro: $45/mes (RIMPE Emprendedor)
  * Plan Premium: $85/mes (RUC General)
- Cobro automático via Stripe (pendiente de implementar)
- Mercado objetivo: lavaderos de autos y detailing en Ecuador
- Diferenciador: adaptado 100% a normativa SRI Ecuador

## 3. Stack Tecnológico
- Frontend: Next.js 16 con App Router, Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Hosting: Vercel (deploy automático desde GitHub)
- Control de versiones: GitHub
- IDE: VS Code con Claude Code (agente de IA)
- Pagos: Stripe (pendiente)

## 4. Credenciales y Accesos

> ⚠️ **Las credenciales reales (contraseñas, tokens) NO se guardan en este
> archivo** porque CONTEXT.md se sube a GitHub junto con el código. Guárdalas
> en un gestor de contraseñas (1Password, Bitwarden) o en un archivo local
> fuera del repo. Aquí solo quedan las referencias de dónde vive cada cosa.

### App en producción
- URL: https://autodetailing-inky.vercel.app
- Usuario test: test3@lavadero.com (contraseña en gestor de contraseñas)
- Usuario socio: imagine.ec593@gmail.com (contraseña en gestor de contraseñas)

### Supabase
- Proyecto: autodetailing
- URL: https://amcfeehvsodfumyfzaoj.supabase.co
- Panel: https://supabase.com
- Claves (anon key, service role key): en `.env.local` (no está en git) y en las variables de entorno de Vercel

### GitHub
- Repositorio: https://github.com/autodetailingapp-cloud/autodetailing
- Usuario: autodetailingapp-cloud
- Token de acceso (push por HTTPS): guardado en gestor de contraseñas, NO en este archivo ni en el código. Si el remoto de git deja de autenticar, regenerar un token nuevo desde GitHub → Settings → Developer settings → Personal access tokens.

### Vercel
- Panel: https://vercel.com/autdetail-s-projects/autodetailing
- Deploy: automático al hacer push a main
- Tiene códigos de respaldo de 2FA (guardados en gestor de contraseñas)

### Gmail del proyecto
- Email: autodetailing.app@gmail.com

## ⚠️ Nota de seguridad — julio 2026
Durante el debugging de esta sesión, la service_role key de Supabase quedó expuesta en texto plano varias veces (en comandos curl usados para verificar el schema real contra producción). Se recomienda regenerarla: Supabase → Project Settings → API → Reset service_role key, y actualizar el valor en .env.local y en las variables de entorno de Vercel antes de la próxima sesión.

## 5. Metodología de Trabajo
- Juan Carlos (JC) no tiene conocimientos de programación
- Toda la comunicación es en español
- Claude (este chat) actúa como arquitecto y coordinador
- Claude Code en VS Code ejecuta el código directamente
- Flujo de trabajo:
  1. JC describe lo que necesita en este chat
  2. Claude prepara la orden completa y optimizada
  3. JC pega la orden en Claude Code (VS Code)
  4. Claude Code construye el código
  5. JC ejecuta SQL en Supabase SQL Editor si es necesario
  6. JC hace git push desde terminal 2 de VS Code
  7. Vercel despliega automáticamente
- Principio: órdenes completas y frontloaded para ahorrar tokens
- Claude Code tiene permisos para hacer todos los cambios sin pedir confirmación (shift+tab al inicio de sesión)
- Se usan 2 terminales en VS Code:
  * Terminal 1: Claude Code (agente)
  * Terminal 2: git push

## 6. Arquitectura del Sistema

### Multi-tenant
- Cada lavadero = 1 tenant con tenant_id único
- RLS activado en todas las tablas
- Usuarios dentro de cada tenant con roles

### Roles de usuario
- Admin: acceso total, único por tenant
- Supervisor: operativo sin finanzas
- Cajero: solo registrar ventas
- Lectura: solo ver reportes (contador/socio)

### Normativa SRI Ecuador
- RIMPE Popular: hasta $20.000/año, solo Notas de Venta
- RIMPE Emprendedor: $20.001-$300.000, Facturas, 1.5% semestral
- RUC General: más de $300.000, Facturas + IVA 15% + retenciones

## 7. Base de Datos — Tablas

### Tablas principales
- tenants: datos del lavadero, régimen SRI, plan, onboarding
- profiles: usuarios con roles por tenant
- clientes: base de clientes con crédito 30/60/90 días
- servicios: catálogo de servicios y precios
- ventas: registro de ventas con datos de factura
- detalle_ventas: líneas de cada venta
- compras: insumos y gastos operativos
- colaboradores: personal del lavadero
- asistencia: registro diario de asistencia
- activos_fijos: equipos con depreciación SRI
- caja_diaria: cierre y cuadre diario
- suscripciones: planes y pagos Stripe

### Tablas de inventario
- insumos: materias primas y productos
- servicio_insumos: receta de insumos por servicio
- movimientos_inventario: entradas y consumos

### Tablas de cartera
- cartera: cuentas por cobrar (ventas a crédito)
- pagos_cartera: registro de cobros
- cartera_proveedores: cuentas por pagar

### Funciones PostgreSQL (RPCs)
- recalcular_caja_diaria: recalcula totales del día
- anular_venta_contable: anula + revierte inventario + recaja
- registrar_pago_cartera: cobra cartera + recaja
- descontar_inventario_venta: descuenta stock al vender
- revertir_inventario_venta: repone stock al anular
- calcular_costo_venta: costo de insumos de una venta
- costo_insumos_periodo: costo total de insumos en período
- upsert_asistencias: registra asistencia sin error de schema

## 8. Módulos Desarrollados

### ✅ Completados y funcionales
1. Autenticación: login, registro, protección de rutas
2. Servicios y precios: CRUD completo
3. Clientes: CRUD con crédito y datos de factura
4. Ventas: registro diario, consumidor final, factura rápida, descuentos, tipos de pago, anulación
5. Compras: costo/gasto, Factura/NV, crédito proveedor
6. Caja diaria: cierre automático desde ventas y compras
7. Cartera por cobrar: cobros parciales/totales con alertas
8. Nómina: colaboradores, asistencia (fix restricción UNIQUE), cálculo mensual
9. Activos fijos: equipos con depreciación SRI automática
10. Inventario: insumos, stock, alertas reabastecimiento
11. Costos por servicio: receta de insumos + margen real
12. P&G Estado de Resultados: fix columna estado vs anulada
13. Balance Situación Financiera: fix columna estado
14. Flujo de Caja: fix columna estado
15. KPI Financieros: fix columna estado y fecha_creacion
16. Tributario SRI: fix tipo_documento y columna estado
17. Onboarding Wizard: 6 pasos, bucket logos auto-creado
18. Usuarios y roles: invitar, asignar, activar/desactivar
19. Dashboard principal: accesos rápidos corregidos
20. Configuración: página placeholder
21. Reportes: página hub con links a módulos financieros
22. Autorización por rol: 23 funciones protegidas en 8 módulos
23. Dashboard Ejecutivo con gráficas (recharts)

### ⏳ Pendientes
1. Exportar reportes a PDF
2. Exportar reportes a Excel
3. Integración Stripe (suscripciones)
4. Landing page pública con precios
5. Panel Super Admin
6. Feature flags por plan
7. Dominio personalizado
8. Cliente piloto y lanzamiento

## 9. Integridad Contable
Principio fundamental: todos los módulos están atados.
- Registrar venta → actualiza caja_diaria + descuenta inventario
- Anular venta → revierte caja + repone inventario + borra cartera
- Registrar compra → actualiza caja_diaria
- Cobrar cartera → actualiza caja_diaria
- Pagar nómina → crea gasto en compras + actualiza caja
- P&G se calcula automáticamente, nunca se ingresa manualmente
- Costo de ventas = compras directas + insumos consumidos (sin duplicar)

## 10. Migraciones SQL Ejecutadas
- migrations.sql: tablas base + RLS + políticas
- migrations_v2.sql: tipo_doc_compra, plazo_pago_proveedor, tenant_id en asistencia, RPC upsert_asistencias
- migrations_v3.sql: insumos, servicio_insumos, movimientos_inventario, RPCs de inventario
- migrations_v4.sql: columnas factura_* en ventas
- migrations_v5.sql: onboarding_completado, onboarding_paso, bucket de storage "logos"
- migrations_v6.sql: restricción UNIQUE(colaborador_id, fecha) en asistencia para que el RPC upsert_asistencias funcione

## 11. Convenciones de Código
- Cada módulo tiene 3 archivos:
  * page.js: Server Component, fetch de datos, layout
  * UI.js (o ComponenteUI.js): Client Component con la UI
  * actions.js: Server Actions con lógica de negocio
- Siempre usar supabaseAdmin (service role) para operaciones
- getProfile() en lib/getProfile.js para autenticación
- Colores: #1D9E75 (verde brand), #534AB7 (morado accent)
- Tailwind CSS para todos los estilos
- No se usa TypeScript (JavaScript puro)

## 12. Sesiones de Trabajo
### Sesión 1 — [fecha]
- Configuración inicial del proyecto
- Creación de cuentas Supabase, GitHub, Vercel
- Proyecto Next.js + conexión Supabase
- Tablas base de datos (12 tablas)
- Sistema de autenticación completo
- Deploy en Vercel funcionando

### Sesión 2 — julio 2026
- Módulos operativos: Servicios, Clientes, Ventas, Compras, Caja, Cartera, Nómina, Activos Fijos
- Integridad contable con RPCs PostgreSQL
- Módulos financieros: P&G, Balance, Flujo, KPI, Tributario
- Módulo de Inventario y costos por servicio
- Fix conflicto Compras vs Inventario en P&G
- Factura rápida para consumidor final en ventas
- Wizard de onboarding 6 pasos
- Módulo de usuarios y roles
- Usuario socio creado: imagine.ec593@gmail.com
- Reset de datos de prueba
- CONTEXT.md creado
- Auditoría completa del proyecto
- Fix bugs críticos: columna estado en módulos financieros, asistencia UNIQUE, enlaces rotos, autorización por rol

### Sesión 3 — julio 2026 (post-CONTEXT.md v1)
- Reportadas 8 novedades por el socio (bugs + mejoras UX) vía documento con capturas
- FIX crítico: activos_fijos — la tabla real en Supabase tiene columna fecha_adquisicion, no fecha_compra como asumía migrations.sql (la tabla diverge del archivo de migraciones, probablemente editada manualmente en algún momento desde el dashboard de Supabase). Corregido en: activos/actions.js, ActivosUI.js, onboarding/actions.js, balance/actions.js, pyg/actions.js. Sin cambios de schema SQL necesarios. Commit 6c35bf2.
- FIX crítico: "Nueva compra" no actualizaba Inventario al comprar insumos — el formulario se deshabilitaba y redirigía a "Ir a Inventario" en vez de completar la operación. Corregido: al elegir Clasificación "Costo" + insumo, ahora reutiliza el RPC registrar_entrada_insumo (mismo que "Registrar entrada de stock"), sin duplicar lógica. Sin cambios de schema SQL necesarios. Commit 1cdd755.
- Ambos fixes probados contra producción real (con reversión de datos de prueba) y desplegados a Vercel.
- PENDIENTE — Orden 3 (5 mejoras UX, aún no ejecutada): 1) Agrandar modal "Nueva venta", 2) Buscador de cliente en Ventas, 3) Reordenar campos en "Nueva compra": Producto antes que Descripción, 4) Agregar opción "Otros" en Doc. proveedor, 5) Columna "Concepto" en tabla de Movimientos diarios del Flujo de Caja
- PENDIENTE — Orden 4: Dashboard ejecutivo con recharts (Fase 7)

### Sesión 4 — julio 2026
- Dashboard Ejecutivo (Fase 7) construido en /dashboard-ejecutivo con recharts: 6 KPIs (ventas del mes, variación %, margen bruto, cartera pendiente, saldo de caja, servicio top) y 5 gráficas (ingresos 12 meses, top 5 servicios, distribución por tipo de pago, ingresos vs gastos 6 meses, evolución de cartera). Reutiliza la lógica ya existente de pyg/actions.js, balance/actions.js, flujo/actions.js y kpi/actions.js en vez de RPCs nuevos.
- Menú lateral (Sidebar.js) reorganizado en 8 grupos lógicos y colapsables: Inicio, Configuración inicial (Servicios/Clientes/Inventario), Operación diaria (Ventas/Compras/Caja), Cobros (Cartera), Personal (Nómina), Activos (Activos fijos), Finanzas (Reportes/Dashboard Ejecutivo/P&G/Balance/Flujo/KPI/Tributario), Sistema (Usuarios/Configuración). Grupos inician expandidos, el grupo activo no se puede colapsar.
- Onboarding Wizard ampliado de 6 a 7 pasos: 1) Bienvenida (ya no duplica régimen SRI/teléfono/dirección del registro, solo logo), 2) Servicios, 3) Clientes (nuevo), 4) Inventario (con gate mínimo de 1 insumo, igual que Servicios), 5) Colaboradores (opcional), 6) Activos fijos (opcional), 7) Resumen.
- Se corrió un reset completo de datos operativos del tenant de prueba (Lavadero El Brillante) para volver a probar el onboarding de 7 pasos desde cero — login y configuración del tenant quedaron intactos.
- Commits de la sesión: Orden 4 dashboard ejecutivo, 3f068a0 (menú + onboarding).

## 13. Notas Importantes
- El proyecto Supabase se pausa por inactividad en plan Free. Reactivar desde supabase.com si da error de conexión
- El token de GitHub para push está guardado en el gestor de contraseñas, no en este archivo ni en el código (ver sección 4). Si el remoto pide autenticación, regenerarlo desde GitHub
- Claude Code necesita shift+tab al inicio de cada sesión para aprobar todos los cambios sin confirmación
- Vercel tiene códigos de respaldo de autenticación 2FA (ver gestor de contraseñas)
- El .env.local NO se sube a GitHub (está en .gitignore)
- Las variables de entorno están configuradas en Vercel

## 14. Próxima Sesión — Por hacer
1. Dashboard ejecutivo con gráficas (recharts/chart.js)
2. Exportar P&G y reportes a PDF
3. Exportar ventas y compras a Excel
4. Integración Stripe para cobro de suscripciones
5. Landing page pública
6. Panel Super Admin
