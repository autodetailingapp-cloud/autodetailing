'use client'

import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const COLORS = {
  primary: '#1D9E75',
  secondary: '#534AB7',
  amber: '#F59E0B',
  red: '#EF4444',
  blue: '#3B82F6',
}
const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.amber, COLORS.blue, COLORS.red]

const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtCorto = (n) => `$${Number(n ?? 0).toLocaleString('es-EC', { maximumFractionDigits: 0 })}`

function EstadoVacio({ texto = 'Sin datos suficientes en el período' }) {
  return (
    <div className="flex items-center justify-center h-56 text-sm text-gray-400 text-center px-4">
      {texto}
    </div>
  )
}

function TarjetaKpi({ label, value, sub, bg, color, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs mt-1 font-medium">{sub}</p>}
    </div>
  )
}

function TarjetaGrafica({ titulo, children, vacio }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{titulo}</h2>
      {vacio ? <EstadoVacio /> : <div className="h-56">{children}</div>}
    </div>
  )
}

const ICONS = {
  ventas: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  variacion: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  margen: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  cartera: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  caja: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  servicio: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
}

export default function DashboardUI({ datos }) {
  const { kpis, graficas, periodo } = datos
  const mesLabel = new Date(periodo.ano, periodo.mes - 1, 1).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })

  const hayIngresos12 = graficas.ingresos12Meses.some((d) => d.ingresos > 0)
  const hayTopServicios = graficas.topServicios.length > 0
  const hayTipoPago = graficas.distribucionTipoPago.length > 0
  const hayIngresosGastos = graficas.ingresosVsGastos6Meses.some((d) => d.ingresos > 0 || d.gastos > 0)
  const hayCartera = graficas.evolucionCartera.some((d) => d.pendiente > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{mesLabel}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <TarjetaKpi
          label="Ventas del mes"
          value={fmt(kpis.ventasMesActual)}
          bg="bg-brand-light" color="text-brand" icon={ICONS.ventas}
        />
        <TarjetaKpi
          label="Variación vs mes anterior"
          value={kpis.variacionPct === null ? '—' : `${kpis.variacionPct >= 0 ? '+' : ''}${kpis.variacionPct.toFixed(1)}%`}
          sub={kpis.variacionPct === null ? 'Sin datos del mes anterior' : undefined}
          bg={kpis.variacionPct >= 0 ? 'bg-brand-light' : 'bg-red-50'}
          color={kpis.variacionPct === null ? 'text-gray-400' : kpis.variacionPct >= 0 ? 'text-brand' : 'text-red-500'}
          icon={ICONS.variacion}
        />
        <TarjetaKpi
          label="Margen bruto del mes"
          value={`${kpis.margenBrutoPct.toFixed(1)}%`}
          bg="bg-accent/10" color="text-accent" icon={ICONS.margen}
        />
        <TarjetaKpi
          label="Cartera por cobrar"
          value={fmt(kpis.carteraPendiente)}
          bg="bg-yellow-50" color="text-yellow-700" icon={ICONS.cartera}
        />
        <TarjetaKpi
          label="Saldo de caja"
          value={fmt(kpis.saldoCajaActual)}
          bg={kpis.saldoCajaActual >= 0 ? 'bg-blue-50' : 'bg-red-50'}
          color={kpis.saldoCajaActual >= 0 ? 'text-blue-600' : 'text-red-500'}
          icon={ICONS.caja}
        />
        <TarjetaKpi
          label="Servicio más vendido"
          value={kpis.servicioTop ? kpis.servicioTop.nombre : '—'}
          sub={kpis.servicioTop ? `${kpis.servicioTop.cantidad} unidades` : 'Sin ventas este mes'}
          bg="bg-brand-light" color="text-brand" icon={ICONS.servicio}
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TarjetaGrafica titulo="Ingresos — últimos 12 meses" vacio={!hayIngresos12}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graficas.ingresos12Meses} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtCorto} width={56} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke={COLORS.primary} fill="url(#gradIngresos)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </TarjetaGrafica>

        <TarjetaGrafica titulo="Top 5 servicios por ingresos (mes actual)" vacio={!hayTopServicios}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graficas.topServicios} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtCorto} />
              <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="total" name="Ingresos" fill={COLORS.secondary} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </TarjetaGrafica>

        <TarjetaGrafica titulo="Ventas por tipo de pago (mes actual)" vacio={!hayTipoPago}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={graficas.distribucionTipoPago} dataKey="total" nameKey="tipo"
                cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}
              >
                {graficas.distribucionTipoPago.map((entry, i) => (
                  <Cell key={entry.tipo} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </TarjetaGrafica>

        <TarjetaGrafica titulo="Ingresos vs Gastos — últimos 6 meses" vacio={!hayIngresosGastos}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graficas.ingresosVsGastos6Meses} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtCorto} width={56} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="ingresos" name="Ingresos" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill={COLORS.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </TarjetaGrafica>

        <TarjetaGrafica titulo="Evolución de cartera pendiente — últimos 6 meses" vacio={!hayCartera}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graficas.evolucionCartera} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtCorto} width={56} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="pendiente" name="Cartera pendiente" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </TarjetaGrafica>
      </div>
    </div>
  )
}
