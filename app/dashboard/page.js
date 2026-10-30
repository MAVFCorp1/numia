'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { categoriaInfo } from '@/lib/categorizador'
import { diaDeclaracion, proximaFechaDeclaracion, formatearFecha, diasRestantes, declaracionConfirmada, fechaISO, proximaFechaTrasConfirmar } from '@/lib/sriHelpers'
import { generarAlertas, construirPromptSugerencias, TIPOS_ALERTA } from '@/lib/alertas'
import { calcularPatrimonioNeto } from '@/lib/patrimonioHelpers'

const RATIOS_RAPIDOS = [
  {
    id: 'margen_neto',
    nombre: 'Margen Neto',
    icono: '📈',
    calcular: (ing, gas) => ing > 0 ? ((ing - gas) / ing) : null,
    semaforo: (v) => v >= 0.1 ? 'verde' : v >= 0.05 ? 'amarillo' : 'rojo',
    formato: (v) => (v * 100).toFixed(1) + '%',
    estandar: '≥ 10%',
  },
  {
    id: 'cobertura',
    nombre: 'Cobertura Gastos',
    icono: '🛡️',
    calcular: (ing, gas) => gas > 0 ? ing / gas : null,
    semaforo: (v) => v >= 1.3 ? 'verde' : v >= 1.0 ? 'amarillo' : 'rojo',
    formato: (v) => v.toFixed(2) + 'x',
    estandar: '≥ 1.3x',
  },
  {
    id: 'eficiencia',
    nombre: 'Eficiencia',
    icono: '⚡',
    calcular: (ing, gas) => ing > 0 ? (gas / ing) : null,
    semaforo: (v) => v <= 0.7 ? 'verde' : v <= 0.9 ? 'amarillo' : 'rojo',
    formato: (v) => (v * 100).toFixed(1) + '%',
    estandar: '≤ 70%',
  },
]

const SEMAFORO_COLORES = {
  verde: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  amarillo: { dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  rojo: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
}

// Nombre limpio: si es un email, toma la parte antes del @ y capitaliza
function nombreLimpio(nombre) {
  if (!nombre) return ''
  let base = nombre
  if (nombre.includes('@')) base = nombre.split('@')[0]
  return base.charAt(0).toUpperCase() + base.slice(1)
}

// Saludo según hora del día
function saludoPorHora() {
  const h = new Date().getHours()
  if (h < 12) return { texto: 'Buenos días', emoji: '☀️' }
  if (h < 19) return { texto: 'Buenas tardes', emoji: '🌤️' }
  return { texto: 'Buenas noches', emoji: '🌙' }
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [facturas, setFacturas] = useState([])
  const [deducibles, setDeducibles] = useState([])
  const [activos, setActivos] = useState([])
  const [pasivos, setPasivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tema, setTema] = useState('claro')
  const [entrada, setEntrada] = useState(false)
  const [alertas, setAlertas] = useState([])
  const [sugerenciasIA, setSugerenciasIA] = useState([])
  const [cargandoIA, setCargandoIA] = useState(false)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [mesSeleccionado, setMesSeleccionado] = useState(null) // null = todo el historial; 'YYYY-MM' = un mes puntual
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: perfil }, { data: movs }, { data: pref }, { data: facts }, { data: dedus }, { data: acts }, { data: pass }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('movimientos').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
        supabase.from('preferencias').select('tema').eq('user_id', user.id).single(),
        supabase.from('facturas_sri').select('*').eq('user_id', user.id),
        supabase.from('deducibles').select('*').eq('user_id', user.id),
        supabase.from('activos').select('*').eq('user_id', user.id),
        supabase.from('pasivos').select('*').eq('user_id', user.id),
      ])
      setPerfil(perfil)
      setMovimientos(movs || [])
      setFacturas(facts || [])
      setDeducibles(dedus || [])
      setActivos(acts || [])
      setPasivos(pass || [])
      if (pref) setTema(pref.tema || 'claro')
      setLoading(false)
      setTimeout(() => setEntrada(true), 60)

      // ── Generar alertas por reglas ──
      const ivaV = (facts || []).filter(f => f.tipo === 'venta').reduce((s, f) => s + parseFloat(f.iva || 0), 0)
      const ivaC = (facts || []).filter(f => f.tipo === 'compra').reduce((s, f) => s + parseFloat(f.iva || 0), 0)
      const proximaF = proximaFechaDeclaracion(perfil?.ruc)
      const diasF = diasRestantes(proximaF)
      const yaDeclaradoF = declaracionConfirmada(perfil, proximaF)
      const alertasGeneradas = generarAlertas({
        movimientos: movs || [],
        facturas: facts || [],
        deducibles: dedus || [],
        perfil,
        diasDeclaracion: yaDeclaradoF ? null : diasF,
        ivaSaldo: ivaV - ivaC
      })
      setAlertas(alertasGeneradas)

      // ── Sugerencias personalizadas con IA (solo si hay datos) ──
      if ((movs || []).length > 0) {
        pedirSugerenciasIA(movs, perfil, ivaV - ivaC, (dedus || []).reduce((s, d) => s + parseFloat(d.monto || 0), 0))
      }
    }
    cargar()
  }, [])

  async function pedirSugerenciasIA(movs, perfilData, ivaSaldoCalc, totalDedu) {
    setCargandoIA(true)
    try {
      const prompt = construirPromptSugerencias({
        movimientos: movs,
        perfil: perfilData,
        ivaSaldo: ivaSaldoCalc,
        totalDeducibles: totalDedu
      })
      const response = await fetch('/api/leer-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
      })
      const data = await response.json()
      if (data.content) {
        const texto = data.content.map(c => c.text || '').join('').trim()
        const clean = texto.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        if (parsed.sugerencias) setSugerenciasIA(parsed.sugerencias.slice(0, 2))
      }
    } catch (err) {
      console.log('No se pudieron generar sugerencias IA:', err)
    }
    setCargandoIA(false)
  }

  async function toggleTema() {
    const nuevo = tema === 'oscuro' ? 'claro' : 'oscuro'
    setTema(nuevo)
    if (user) await supabase.from('preferencias').upsert({ user_id: user.id, tema: nuevo }, { onConflict: 'user_id' })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function confirmarDeclaracion(proximaFecha) {
    const iso = fechaISO(proximaFecha)
    setPerfil(prev => ({ ...prev, declaracion_confirmada_fecha: iso }))
    if (user) await supabase.from('profiles').update({ declaracion_confirmada_fecha: iso }).eq('user_id', user.id)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Cargando Numia...</p>
      </div>
    </div>
  )

  const dark = tema === 'oscuro'
  const bg = dark ? 'bg-gray-950' : 'bg-gray-100'
  const card = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const text = dark ? 'text-gray-100' : 'text-gray-900'
  const textSub = dark ? 'text-gray-400' : 'text-gray-500'
  const border = dark ? 'border-gray-800' : 'border-gray-100'

  // Movimientos filtrados al mes elegido en "Ingresos y gastos por mes" (o todo el historial si no hay selección)
  const movimientosFiltrados = mesSeleccionado ? movimientos.filter(m => m.fecha?.slice(0, 7) === mesSeleccionado) : movimientos

  const ingresos = movimientosFiltrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto), 0)
  const gastos = movimientosFiltrados.filter(m => m.tipo === 'gasto').reduce((s, m) => s + parseFloat(m.monto), 0)
  const utilidad = ingresos - gastos
  const salud = Math.min(100, Math.max(0, Math.round((utilidad / Math.max(ingresos, 1)) * 100 + 50)))
  const esEmpresa = perfil?.tipo === 'empresa'

  const ivaVentas = facturas.filter(f => f.tipo === 'venta').reduce((s, f) => s + parseFloat(f.iva || 0), 0)
  const ivaCompras = facturas.filter(f => f.tipo === 'compra').reduce((s, f) => s + parseFloat(f.iva || 0), 0)
  const ivaSaldo = ivaVentas - ivaCompras
  const totalDeducibles = deducibles.reduce((s, d) => s + parseFloat(d.monto || 0), 0)
  const { totalActivos, totalPasivos, patrimonioNeto } = calcularPatrimonioNeto(activos, pasivos)
  const sinPatrimonio = activos.length === 0 && pasivos.length === 0

  const ruc = perfil?.ruc
  const diaDecl = diaDeclaracion(ruc)
  const proxima = proximaFechaDeclaracion(ruc)
  const dias = diasRestantes(proxima)
  const yaDeclarado = declaracionConfirmada(perfil, proxima)
  const proximaMostrada = yaDeclarado ? proximaFechaTrasConfirmar(ruc, proxima) : proxima
  const urgente = !yaDeclarado && dias !== null && dias <= 5

  const catGastos = {}
  const catIngresos = {}
  movimientosFiltrados.forEach(m => {
    const monto = parseFloat(m.monto)
    if (m.tipo === 'gasto') catGastos[m.categoria] = (catGastos[m.categoria] || 0) + monto
    else catIngresos[m.categoria] = (catIngresos[m.categoria] || 0) + monto
  })
  const topGastos = Object.entries(catGastos).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const topIngresos = Object.entries(catIngresos).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxGas = topGastos[0]?.[1] || 1
  const maxIng = topIngresos[0]?.[1] || 1

  const cuentas = {}
  movimientosFiltrados.forEach(m => {
    if (!cuentas[m.cuenta]) cuentas[m.cuenta] = { ing: 0, gas: 0 }
    if (m.tipo === 'ingreso') cuentas[m.cuenta].ing += parseFloat(m.monto)
    else cuentas[m.cuenta].gas += parseFloat(m.monto)
  })

  // Ingresos y gastos agrupados por mes (a partir de la fecha de cada movimiento), últimos 12 meses con datos
  const porMes = {}
  movimientos.forEach(m => {
    const mes = m.fecha?.slice(0, 7)
    if (!mes) return
    if (!porMes[mes]) porMes[mes] = { ingreso: 0, gasto: 0 }
    if (m.tipo === 'ingreso') porMes[mes].ingreso += parseFloat(m.monto || 0)
    else porMes[mes].gasto += parseFloat(m.monto || 0)
  })
  const mesesOrdenados = Object.keys(porMes).sort().slice(-12)
  const nombresMeses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const labelMes = (m) => {
    const [anio, mesNum] = m.split('-')
    return `${nombresMeses[parseInt(mesNum, 10) - 1]} ${anio.slice(2)}`
  }

  // Variación vs. el mes anterior (% de cambio)
  const mesActualKey = mesesOrdenados[mesesOrdenados.length - 1]
  const mesAnteriorKey = mesesOrdenados[mesesOrdenados.length - 2]
  const variacionPct = (actual, anterior) => (anterior > 0 ? ((actual - anterior) / anterior) * 100 : null)
  const variacionIngreso = mesAnteriorKey ? variacionPct(porMes[mesActualKey].ingreso, porMes[mesAnteriorKey].ingreso) : null
  const variacionGasto = mesAnteriorKey ? variacionPct(porMes[mesActualKey].gasto, porMes[mesAnteriorKey].gasto) : null

  // Proyección del próximo mes: promedio de los últimos meses COMPLETOS (se excluye el mes en curso,
  // que viene incompleto y arrastraría el promedio hacia abajo) + un ajuste por tendencia acotado para
  // que un mes atípico no reviente la proyección a 0.
  const hoy = new Date()
  const mesActualCalendario = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const mesesCompletos = mesesOrdenados.filter(m => m !== mesActualCalendario)

  function proyectarSiguienteMes(campo) {
    const base = mesesCompletos.length > 0 ? mesesCompletos : mesesOrdenados
    if (base.length === 0) return 0
    const tramo = base.slice(-3)
    const promedio = tramo.reduce((s, m) => s + porMes[m][campo], 0) / tramo.length
    if (tramo.length === 1) return promedio

    const deltas = tramo.slice(1).map((mes, i) => porMes[mes][campo] - porMes[tramo[i]][campo])
    const tendencia = deltas.reduce((a, b) => a + b, 0) / deltas.length
    const tendenciaAcotada = Math.max(Math.min(tendencia, promedio * 0.3), -promedio * 0.3)
    return Math.max(promedio + tendenciaAcotada, 0)
  }
  const proyeccionIngreso = proyectarSiguienteMes('ingreso')
  const proyeccionGasto = proyectarSiguienteMes('gasto')
  const mesSiguienteLabel = (() => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)
    return labelMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  })()

  const maxValorMes = Math.max(1, proyeccionIngreso, proyeccionGasto, ...mesesOrdenados.map(m => Math.max(porMes[m].ingreso, porMes[m].gasto)))

  const saludo = saludoPorHora()

  const accesos = [
    { href: '/dashboard/banco', emoji: '🏦', label: 'Banco', desc: 'Movimientos', color: '#E91E8C' },
    { href: '/dashboard/xmls', emoji: '📄', label: 'XMLs SRI', desc: 'Comprobantes', color: '#9C27B0' },
    { href: '/dashboard/sri', emoji: '🏛️', label: 'SRI e IVA', desc: 'Impuestos', color: '#3B82F6' },
    { href: '/dashboard/deducibles', emoji: '🧾', label: 'Deducibles', desc: esEmpresa ? 'Gastos empresa' : 'Ahorro fiscal', color: '#10B981' },
    { href: '/dashboard/patrimonio', emoji: '💎', label: 'Patrimonio', desc: 'Activos y pasivos', color: '#9C27B0' },
    { href: '/dashboard/inversiones', emoji: '📈', label: 'Inversiones', desc: 'Perfil y cartera ETF', color: '#06B6D4' },
    ...(esEmpresa ? [{ href: '/dashboard/ratios', emoji: '📊', label: 'Ratios', desc: 'Análisis', color: '#F59E0B' }] : []),
  ]

  // Estilo de entrada escalonada
  const fadeIn = (i) => ({
    opacity: entrada ? 1 : 0,
    transform: entrada ? 'translateY(0)' : 'translateY(16px)',
    transition: `opacity 0.6s ease ${i * 0.07}s, transform 0.6s ease ${i * 0.07}s`
  })

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300 relative`}>

      {/* Glow ambiental de fondo (solo dark) */}
      {dark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[700px] h-[500px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(ellipse, #E91E8C, transparent 60%)', filter: 'blur(60px)' }} />
          <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #9C27B0, transparent 60%)', filter: 'blur(60px)' }} />
        </div>
      )}

      {/* NAVBAR */}
      <header className={`sticky top-0 z-50 border-b ${dark ? 'bg-gray-950/80 border-gray-800' : 'bg-white/90 border-gray-200'}`}
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/Logo Numia.png" alt="Numia" className="h-10 w-auto" />
            <div className={`h-5 w-px ${dark ? 'bg-gray-700' : 'bg-gray-300'}`} />
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${esEmpresa ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' : 'bg-purple-500/15 text-purple-400 border border-purple-500/25'}`}>
              {esEmpresa ? '🏢 Empresa' : '👤 Persona'}
            </span>
          </div>
          <div className="flex items-center gap-2 relative">
            {/* Campanita de alertas */}
            <button onClick={() => setPanelAbierto(!panelAbierto)}
              className={`relative p-2 rounded-xl border transition-all hover:scale-105 ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              🔔
              {alertas.filter(a => a.tipo === 'urgente' || a.tipo === 'atencion').length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}>
                  {alertas.filter(a => a.tipo === 'urgente' || a.tipo === 'atencion').length}
                </span>
              )}
            </button>

            {/* Panel de alertas */}
            {panelAbierto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPanelAbierto(false)} />
                <div className={`absolute right-0 top-12 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden ${dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`px-5 py-4 border-b flex items-center justify-between ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <p className={`font-bold text-sm ${text}`}>🔔 Tus alertas</p>
                    <button onClick={() => setPanelAbierto(false)} className="text-gray-500 hover:text-white text-xs">✕</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {alertas.length === 0 && sugerenciasIA.length === 0 ? (
                      <p className={`text-sm text-center py-10 ${textSub}`}>Todo tranquilo por ahora ✨</p>
                    ) : (
                      <div className="divide-y divide-gray-800/50">
                        {alertas.map(a => {
                          const estilo = TIPOS_ALERTA[a.tipo]
                          const Contenido = (
                            <div className="flex gap-3 px-5 py-4 transition-colors hover:bg-white/5">
                              <span className="text-lg shrink-0">{a.emoji}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
                                    style={{ background: estilo.bg, color: estilo.color }}>
                                    {estilo.label}
                                  </span>
                                </div>
                                <p className={`text-xs font-bold ${text}`}>{a.titulo}</p>
                                <p className={`text-xs ${textSub}`}>{a.desc}</p>
                              </div>
                            </div>
                          )
                          return a.href
                            ? <a key={a.id} href={a.href}>{Contenido}</a>
                            : <div key={a.id}>{Contenido}</div>
                        })}
                        {sugerenciasIA.map((s, i) => (
                          <div key={`ia-${i}`} className="flex gap-3 px-5 py-4">
                            <span className="text-lg shrink-0">{s.emoji}</span>
                            <div className="min-w-0">
                              <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded inline-block mb-0.5"
                                style={{ background: TIPOS_ALERTA.ia.bg, color: TIPOS_ALERTA.ia.color }}>
                                Numia IA
                              </span>
                              <p className={`text-xs font-bold ${text}`}>{s.titulo}</p>
                              <p className={`text-xs ${textSub}`}>{s.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <button onClick={toggleTema}
              className={`p-2 rounded-xl border transition-all hover:scale-105 ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={handleLogout}
              className={`text-xs px-4 py-2 rounded-xl border font-medium transition-all ${dark ? 'border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-7 relative">

        {/* SALUDO */}
        <div style={fadeIn(0)}>
          <h1 className={`text-3xl font-black ${text}`}>
            {saludo.texto}, {nombreLimpio(perfil?.nombre) || 'bienvenido'} {saludo.emoji}
          </h1>
          <p className={`text-sm mt-1 ${textSub}`}>Así van tus finanzas hoy</p>
        </div>

        {/* PATRIMONIO NETO */}
        <div style={fadeIn(1)}>
          {sinPatrimonio ? (
            <a href="/dashboard/patrimonio"
              className={`block rounded-3xl border-2 border-dashed p-6 transition-all hover:border-pink-500 hover:scale-[1.01] ${dark ? 'border-gray-700 bg-gray-900/70' : 'border-gray-300 bg-white'}`}>
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                  style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.15), rgba(156,39,176,0.15))' }}>
                  💎
                </div>
                <div>
                  <p className={`font-bold ${text}`}>Registra tus activos y pasivos</p>
                  <p className={`text-sm ${textSub}`}>Descubre tu patrimonio neto y cómo evoluciona en el tiempo →</p>
                </div>
              </div>
            </a>
          ) : (
            <a href="/dashboard/patrimonio"
              className={`block rounded-3xl border p-6 transition-all hover:scale-[1.01] ${card}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className={`text-xs font-semibold mb-1 ${textSub}`}>💎 Patrimonio Neto</p>
                  <p className="text-3xl font-black" style={{ color: patrimonioNeto >= 0 ? '#10B981' : '#EF4444' }}>
                    {patrimonioNeto < 0 ? '-' : ''}${Math.abs(patrimonioNeto).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className={`text-xs ${textSub}`}>Activos</p>
                    <p className="text-sm font-bold text-emerald-400">${totalActivos.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${textSub}`}>Pasivos</p>
                    <p className="text-sm font-bold text-red-400">${totalPasivos.toFixed(2)}</p>
                  </div>
                </div>
                <p className={`text-xs font-semibold`} style={{ color: '#E91E8C' }}>Ver detalle →</p>
              </div>
            </a>
          )}
        </div>

        {/* BANNER DECLARACIÓN SRI */}
        <div style={fadeIn(2)}>
          {diaDecl ? (
            yaDeclarado ? (
              <div className={`rounded-3xl p-7 border-2 flex items-center justify-between flex-wrap gap-5 ${dark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-300 bg-emerald-50'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(16,185,129,0.15)' }}>✅</div>
                  <div>
                    <p className={`font-bold text-lg ${text}`}>Ya declaraste el IVA de este período</p>
                    <p className={`text-sm ${textSub}`}>Tu próxima declaración es el {formatearFecha(proximaMostrada)}</p>
                  </div>
                </div>
                <a href="/dashboard/sri" className="text-xs font-semibold shrink-0" style={{ color: '#E91E8C' }}>Ver detalle →</a>
              </div>
            ) : (
              <div className="rounded-3xl p-7 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 20px 60px rgba(233,30,140,0.25)' }}>
                <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20 -mr-20 -mt-20"
                  style={{ background: 'radial-gradient(circle, #fff, transparent 70%)' }} />
                <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10 -mb-20"
                  style={{ background: 'radial-gradient(circle, #fff, transparent 70%)' }} />
                <div className="relative flex items-center justify-between flex-wrap gap-5">
                  <div>
                    <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1.5">📅 Próxima declaración de IVA</p>
                    <p className="text-white text-3xl font-black">{formatearFecha(proxima)}</p>
                    <p className="text-white/70 text-sm mt-1.5">Declaras hasta el día {diaDecl} de cada mes según tu RUC</p>
                  </div>
                  <div className={`text-center rounded-2xl px-7 py-5 ${urgente ? 'animate-pulse' : ''}`}
                    style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
                    <p className="text-white text-5xl font-black leading-none">{dias}</p>
                    <p className="text-white/85 text-xs font-semibold mt-1">{dias === 1 ? 'día restante' : 'días restantes'}</p>
                  </div>
                </div>
                <div className="relative flex items-center justify-between flex-wrap gap-3 mt-5">
                  <a href="/dashboard/sri" className="text-white/60 text-xs hover:text-white/90 transition-colors">Ver detalle de IVA y facturas →</a>
                  <button onClick={() => confirmarDeclaracion(proxima)}
                    className="text-xs px-4 py-2 rounded-xl font-bold text-white transition-all hover:scale-105"
                    style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }}>
                    ✓ Ya declaré
                  </button>
                </div>
              </div>
            )
          ) : (
            <a href="/dashboard/xmls"
              className={`block rounded-3xl border-2 border-dashed p-7 transition-all hover:border-pink-500 hover:scale-[1.01] ${dark ? 'border-gray-700 bg-gray-900/70' : 'border-gray-300 bg-white'}`}>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.15), rgba(156,39,176,0.15))' }}>
                  📅
                </div>
                <div>
                  <p className={`font-bold text-lg ${text}`}>Configura tu RUC y activa tu calendario tributario</p>
                  <p className={`text-sm ${textSub}`}>Te avisaremos cuándo declarar el IVA. Toma 10 segundos →</p>
                </div>
              </div>
            </a>
          )}
        </div>

        {/* ALERTAS PARA TI */}
        {(alertas.length > 0 || cargandoIA || sugerenciasIA.length > 0) && (
          <div style={fadeIn(3)}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`font-bold text-sm ${text}`}>🔔 Alertas para ti</h2>
              {alertas.length > 3 && (
                <button onClick={() => setPanelAbierto(true)}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: '#E91E8C' }}>
                  Ver todas ({alertas.length}) →
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {alertas.slice(0, sugerenciasIA.length > 0 || cargandoIA ? 2 : 3).map(a => {
                const estilo = TIPOS_ALERTA[a.tipo]
                const Tarjeta = (
                  <div className="rounded-2xl p-5 h-full border transition-all hover:scale-[1.02]"
                    style={{ background: estilo.bg, borderColor: estilo.borde }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{a.emoji}</span>
                      <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
                        style={{ background: `${estilo.color}22`, color: estilo.color }}>
                        {estilo.label}
                      </span>
                    </div>
                    <p className={`font-bold text-sm mb-1 ${text}`}>{a.titulo}</p>
                    <p className={`text-xs leading-relaxed ${textSub}`}>{a.desc}</p>
                  </div>
                )
                return a.href
                  ? <a key={a.id} href={a.href} className="block h-full">{Tarjeta}</a>
                  : <div key={a.id} className="h-full">{Tarjeta}</div>
              })}

              {/* Tarjeta de sugerencia IA */}
              {(cargandoIA || sugerenciasIA.length > 0) && (
                <div className="rounded-2xl p-5 h-full border relative overflow-hidden"
                  style={{ background: 'linear-gradient(150deg, rgba(233,30,140,0.1), rgba(156,39,176,0.14))', borderColor: 'rgba(156,39,176,0.4)' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-15 -mr-10 -mt-10"
                    style={{ background: 'radial-gradient(circle, #E91E8C, transparent 70%)' }} />
                  {cargandoIA ? (
                    <div className="flex flex-col items-center justify-center h-full py-4 relative">
                      <div className="w-7 h-7 rounded-full animate-spin mb-3"
                        style={{ border: '3px solid #E91E8C', borderTopColor: 'transparent' }} />
                      <p className={`text-xs font-semibold ${textSub}`}>Numia está analizando tu situación...</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{sugerenciasIA[0]?.emoji || '💡'}</span>
                        <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(156,39,176,0.25)', color: '#CE93D8' }}>
                          ✨ Numia IA
                        </span>
                      </div>
                      <p className={`font-bold text-sm mb-1 ${text}`}>{sugerenciasIA[0]?.titulo}</p>
                      <p className={`text-xs leading-relaxed ${textSub}`}>{sugerenciasIA[0]?.desc}</p>
                      {sugerenciasIA.length > 1 && (
                        <button onClick={() => setPanelAbierto(true)}
                          className="text-[11px] font-bold mt-2 transition-colors"
                          style={{ color: '#E91E8C' }}>
                          +1 sugerencia más →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACCESOS RÁPIDOS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" style={fadeIn(4)}>
          {accesos.map(a => (
            <a key={a.href} href={a.href}
              className={`rounded-2xl border p-4 transition-all hover:scale-[1.04] group ${card}`}
              style={{ transition: 'all 0.25s ease' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = ''}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3 transition-transform group-hover:scale-110"
                style={{ background: `${a.color}1c`, border: `1px solid ${a.color}45` }}>
                {a.emoji}
              </div>
              <p className={`font-bold text-sm ${text}`}>{a.label}</p>
              <p className={`text-xs ${textSub}`}>{a.desc}</p>
            </a>
          ))}
        </div>

        {/* FILTRO DE MES ACTIVO */}
        {mesSeleccionado && (
          <div className="flex items-center gap-3 flex-wrap" style={fadeIn(5)}>
            <span className="text-xs px-4 py-2 rounded-full font-bold text-white" style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' }}>
              📅 Mostrando {labelMes(mesSeleccionado)}
            </span>
            <button onClick={() => setMesSeleccionado(null)}
              className={`text-xs px-4 py-2 rounded-full border font-semibold transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              ✕ Ver todo el historial
            </button>
          </div>
        )}

        {/* MÉTRICAS PRINCIPALES */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4" style={fadeIn(5)}>
          {[
            { label: 'Ingresos', valor: ingresos, color: '#10B981', prefix: '+$', emoji: '💰' },
            { label: 'Gastos', valor: gastos, color: '#EF4444', prefix: '-$', emoji: '💸' },
            { label: esEmpresa ? 'Utilidad' : 'Ahorro', valor: utilidad, color: utilidad >= 0 ? '#10B981' : '#EF4444', prefix: '$', emoji: '📊' },
            { label: ivaSaldo >= 0 ? 'IVA a pagar' : 'IVA a favor', valor: Math.abs(ivaSaldo), color: ivaSaldo >= 0 ? '#E91E8C' : '#10B981', prefix: '$', emoji: '🏛️', href: '/dashboard/sri' },
            { label: 'Deducibles', valor: totalDeducibles, color: '#9C27B0', prefix: '$', emoji: '🧾', href: '/dashboard/deducibles' },
            { label: 'Movimientos', valor: movimientosFiltrados.length, color: '#3B82F6', prefix: '', noDecimal: true, emoji: '🔢' },
          ].map((m, i) => {
            const contenido = (
              <>
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-xs font-semibold ${textSub}`}>{m.label}</span>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: `${m.color}18` }}>{m.emoji}</span>
                </div>
                <div className="text-xl font-black" style={{ color: m.color }}>
                  {m.prefix}{m.noDecimal ? m.valor : m.valor.toFixed(2)}
                </div>
              </>
            )
            return m.href ? (
              <a key={i} href={m.href}
                className={`rounded-2xl border p-4 transition-all hover:scale-[1.03] hover:border-pink-500/40 ${card}`}>
                {contenido}
              </a>
            ) : (
              <div key={i} className={`rounded-2xl border p-4 ${card}`}>
                {contenido}
              </div>
            )
          })}
        </div>

        {/* SALUD FINANCIERA */}
        <div className={`rounded-3xl border p-7 ${card}`} style={fadeIn(5)}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: salud >= 70 ? 'rgba(16,185,129,0.15)' : salud >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' }}>
                💚
              </div>
              <div>
                <h2 className={`font-bold ${text}`}>Salud Financiera</h2>
                <p className={`text-xs ${textSub}`}>Basada en tu ahorro vs ingresos</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-4 py-1.5 rounded-full ${salud >= 70 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : salud >= 50 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
              {salud >= 70 ? '✨ Buena salud' : salud >= 50 ? '💪 Puede mejorar' : '⚠️ Requiere atención'}
            </span>
          </div>
          <div className="flex items-center gap-7">
            <div className="text-6xl font-black shrink-0" style={{ color: salud >= 70 ? '#10B981' : salud >= 50 ? '#F59E0B' : '#EF4444' }}>
              {salud}
            </div>
            <div className="flex-1">
              <div className={`h-4 rounded-full overflow-hidden ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: entrada ? `${salud}%` : '0%',
                    transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1) 0.4s',
                    background: salud >= 70 ? 'linear-gradient(90deg,#10B981,#34D399)' : salud >= 50 ? 'linear-gradient(90deg,#F59E0B,#FBBF24)' : 'linear-gradient(90deg,#EF4444,#F87171)'
                  }}
                />
              </div>
              <div className={`flex justify-between mt-1.5 text-xs ${textSub}`}>
                <span>0</span><span>50</span><span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* RATIOS RÁPIDOS — solo empresa */}
        {esEmpresa && movimientosFiltrados.length > 0 && (
          <div className={`rounded-3xl border p-7 ${card}`} style={fadeIn(6)}>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 className={`font-bold ${text}`}>📊 Ratios Financieros</h2>
                <p className={`text-xs mt-0.5 ${textSub}`}>Semáforo rápido · calculado desde tus movimientos</p>
              </div>
              <a href="/dashboard/ratios"
                className="text-xs px-5 py-2.5 rounded-xl font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
                Ver análisis completo →
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {RATIOS_RAPIDOS.map(ratio => {
                const valor = ratio.calcular(ingresos, gastos)
                const color = valor !== null ? ratio.semaforo(valor) : null
                const C = color ? SEMAFORO_COLORES[color] : null
                return (
                  <div key={ratio.id} className={`rounded-2xl border p-5 transition-all ${C ? C.bg : dark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{ratio.icono}</span>
                        <span className={`text-xs font-bold ${text}`}>{ratio.nombre}</span>
                      </div>
                      {C && <div className={`w-2.5 h-2.5 rounded-full ${C.dot} animate-pulse`} />}
                    </div>
                    <div className={`text-3xl font-black mb-1 ${C ? C.text : textSub}`}>
                      {valor !== null ? ratio.formato(valor) : '—'}
                    </div>
                    <div className={`text-xs ${textSub}`}>Estándar: {ratio.estandar}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* INGRESOS Y GASTOS POR MES */}
        {mesesOrdenados.length > 0 && (
          <div className={`rounded-3xl border p-7 relative overflow-hidden ${card}`} style={fadeIn(7)}>
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.06] pointer-events-none"
              style={{ background: 'radial-gradient(circle, #E91E8C, transparent 70%)' }} />
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3 relative">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.18), rgba(156,39,176,0.18))' }}>📅</div>
                <div>
                  <h2 className={`font-bold text-sm ${text}`}>Ingresos y gastos por mes</h2>
                  <p className={`text-xs ${textSub}`}>Comparación histórica, últimos {mesesOrdenados.length} {mesesOrdenados.length === 1 ? 'mes' : 'meses'} · clic en una barra para ver el detalle · clic en el mes para filtrar el dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <a href="/dashboard/banco?tipo=ingreso" className={`flex items-center gap-1.5 hover:text-emerald-400 transition-colors ${textSub}`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />Ingresos
                </a>
                <a href="/dashboard/banco?tipo=gasto" className={`flex items-center gap-1.5 hover:text-red-400 transition-colors ${textSub}`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />Gastos
                </a>
              </div>
            </div>

            {/* VARIACIÓN VS MES ANTERIOR */}
            {(variacionIngreso !== null || variacionGasto !== null) && (
              <div className="flex flex-wrap gap-3 mb-6 relative">
                {variacionIngreso !== null && (
                  <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${variacionIngreso >= 0 ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                    <span className="text-sm">{variacionIngreso >= 0 ? '📈' : '📉'}</span>
                    <span className={`text-xs font-bold ${variacionIngreso >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {variacionIngreso >= 0 ? '+' : ''}{variacionIngreso.toFixed(0)}%
                    </span>
                    <span className={`text-xs ${textSub}`}>ingresos vs. {labelMes(mesAnteriorKey)}</span>
                  </div>
                )}
                {variacionGasto !== null && (
                  <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${variacionGasto <= 0 ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                    <span className="text-sm">{variacionGasto <= 0 ? '📉' : '📈'}</span>
                    <span className={`text-xs font-bold ${variacionGasto <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {variacionGasto >= 0 ? '+' : ''}{variacionGasto.toFixed(0)}%
                    </span>
                    <span className={`text-xs ${textSub}`}>gastos vs. {labelMes(mesAnteriorKey)}</span>
                  </div>
                )}
                <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed ${dark ? 'border-gray-700' : 'border-gray-300'}`}>
                  <span className="text-sm">🔮</span>
                  <span className={`text-xs ${textSub}`}>Proyección {mesSiguienteLabel}:</span>
                  <span className="text-xs font-bold text-emerald-400">${proyeccionIngreso.toFixed(0)}</span>
                  <span className={`text-xs ${textSub}`}>/</span>
                  <span className="text-xs font-bold text-red-400">${proyeccionGasto.toFixed(0)}</span>
                </div>
              </div>
            )}

            <div className="flex items-end gap-3 sm:gap-5 h-52 overflow-x-auto pb-1 relative">
              {mesesOrdenados.map((mes, i) => {
                const { ingreso, gasto } = porMes[mes]
                return (
                  <div key={mes} className="flex flex-col items-center gap-2 shrink-0" style={{ width: '52px' }}>
                    <div className="flex items-end gap-1.5 h-40 w-full justify-center">
                      <a href="/dashboard/banco?tipo=ingreso" className="group relative w-4 sm:w-5 flex items-end justify-center h-full">
                        <span className={`absolute -top-5 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ${dark ? 'text-emerald-300' : 'text-emerald-600'}`}>${ingreso.toFixed(0)}</span>
                        <div className="w-full rounded-t-lg transition-all duration-200 group-hover:brightness-110 group-hover:scale-x-110 origin-bottom"
                          title={`Ingresos ${labelMes(mes)}: $${ingreso.toFixed(2)}`}
                          style={{
                            height: entrada ? `${Math.max((ingreso / maxValorMes) * 100, ingreso > 0 ? 3 : 0)}%` : '0%',
                            background: 'linear-gradient(180deg, #34D399, #059669)',
                            boxShadow: '0 2px 10px rgba(16,185,129,0.35)',
                            transition: `height 0.8s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.05}s`
                          }} />
                      </a>
                      <a href="/dashboard/banco?tipo=gasto" className="group relative w-4 sm:w-5 flex items-end justify-center h-full">
                        <span className={`absolute -top-5 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ${dark ? 'text-red-300' : 'text-red-600'}`}>${gasto.toFixed(0)}</span>
                        <div className="w-full rounded-t-lg transition-all duration-200 group-hover:brightness-110 group-hover:scale-x-110 origin-bottom"
                          title={`Gastos ${labelMes(mes)}: $${gasto.toFixed(2)}`}
                          style={{
                            height: entrada ? `${Math.max((gasto / maxValorMes) * 100, gasto > 0 ? 3 : 0)}%` : '0%',
                            background: 'linear-gradient(180deg, #F87171, #DC2626)',
                            boxShadow: '0 2px 10px rgba(239,68,68,0.35)',
                            transition: `height 0.8s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.05}s`
                          }} />
                      </a>
                    </div>
                    <button onClick={() => setMesSeleccionado(mesSeleccionado === mes ? null : mes)}
                      className={`text-[10px] font-semibold transition-colors ${mesSeleccionado === mes ? 'underline decoration-2 underline-offset-4' : 'hover:underline'}`}
                      style={{ color: mesSeleccionado === mes ? '#E91E8C' : (dark ? '#9CA3AF' : '#6B7280') }}>
                      {labelMes(mes)}
                    </button>
                  </div>
                )
              })}

              {/* MES PROYECTADO */}
              <div className="flex flex-col items-center gap-2 shrink-0" style={{ width: '52px' }}>
                <div className="flex items-end gap-1.5 h-40 w-full justify-center">
                  <div className="relative w-4 sm:w-5 flex items-end justify-center h-full">
                    <span className={`absolute -top-5 text-[9px] font-bold whitespace-nowrap ${dark ? 'text-emerald-300' : 'text-emerald-600'}`}>${proyeccionIngreso.toFixed(0)}</span>
                    <div className="w-full rounded-t-lg border-2 border-dashed border-emerald-400/70 opacity-50"
                      title={`Proyección ingresos ${mesSiguienteLabel}: $${proyeccionIngreso.toFixed(2)}`}
                      style={{ height: entrada ? `${Math.max((proyeccionIngreso / maxValorMes) * 100, proyeccionIngreso > 0 ? 3 : 0)}%` : '0%', transition: 'height 0.8s cubic-bezier(0.22,1,0.36,1) 0.6s' }} />
                  </div>
                  <div className="relative w-4 sm:w-5 flex items-end justify-center h-full">
                    <span className={`absolute -top-5 text-[9px] font-bold whitespace-nowrap ${dark ? 'text-red-300' : 'text-red-600'}`}>${proyeccionGasto.toFixed(0)}</span>
                    <div className="w-full rounded-t-lg border-2 border-dashed border-red-400/70 opacity-50"
                      title={`Proyección gastos ${mesSiguienteLabel}: $${proyeccionGasto.toFixed(2)}`}
                      style={{ height: entrada ? `${Math.max((proyeccionGasto / maxValorMes) * 100, proyeccionGasto > 0 ? 3 : 0)}%` : '0%', transition: 'height 0.8s cubic-bezier(0.22,1,0.36,1) 0.6s' }} />
                  </div>
                </div>
                <span className={`text-[10px] font-semibold ${textSub}`}>🔮 {mesSiguienteLabel}</span>
              </div>
            </div>
          </div>
        )}

        {/* GRÁFICOS DE TRANSACCIONES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={fadeIn(8)}>

          {/* Gastos por categoría */}
          <div className={`rounded-3xl border p-7 ${card}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: 'rgba(239,68,68,0.12)' }}>💸</div>
                <h2 className={`font-bold text-sm ${text}`}>Gastos por categoría</h2>
              </div>
              <a href="/dashboard/banco?tipo=gasto"
                className="text-xs px-3.5 py-2 rounded-xl font-bold transition-all hover:scale-105"
                style={{ background: 'rgba(233,30,140,0.1)', border: '1px solid rgba(233,30,140,0.3)', color: '#E91E8C' }}>
                Ver todos →
              </a>
            </div>
            {topGastos.length === 0 ? (
              <div className={`text-sm text-center py-10 ${textSub}`}>
                <p className="text-3xl mb-2">🍃</p>
                Sin gastos registrados todavía
              </div>
            ) : (
              <div className="space-y-4">
                {topGastos.map(([cat, val], i) => {
                  const info = categoriaInfo[cat] || { label: cat, emoji: '📦', color: '#E91E8C' }
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-base w-6">{info.emoji}</span>
                      <div className={`text-xs w-28 truncate font-medium ${text}`}>{info.label || cat}</div>
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: dark ? '#1F2937' : '#F3F4F6' }}>
                        <div className="h-full rounded-full"
                          style={{
                            width: entrada ? `${(val / maxGas) * 100}%` : '0%',
                            background: info.color || '#EF4444',
                            transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.08}s`
                          }} />
                      </div>
                      <div className={`text-xs font-bold w-20 text-right`} style={{ color: info.color || '#EF4444' }}>
                        ${val.toFixed(2)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ingresos por categoría */}
          <div className={`rounded-3xl border p-7 ${card}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: 'rgba(16,185,129,0.12)' }}>💰</div>
                <h2 className={`font-bold text-sm ${text}`}>Ingresos por categoría</h2>
              </div>
              <a href="/dashboard/banco?tipo=ingreso"
                className="text-xs px-3.5 py-2 rounded-xl font-bold transition-all hover:scale-105"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981' }}>
                Ver todos →
              </a>
            </div>
            {topIngresos.length === 0 ? (
              <div className={`text-sm text-center py-10 ${textSub}`}>
                <p className="text-3xl mb-2">🌱</p>
                Sin ingresos registrados todavía
              </div>
            ) : (
              <div className="space-y-4">
                {topIngresos.map(([cat, val], i) => {
                  const info = categoriaInfo[cat] || { label: cat, emoji: '📦', color: '#10B981' }
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-base w-6">{info.emoji}</span>
                      <div className={`text-xs w-28 truncate font-medium ${text}`}>{info.label || cat}</div>
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: dark ? '#1F2937' : '#F3F4F6' }}>
                        <div className="h-full rounded-full"
                          style={{
                            width: entrada ? `${(val / maxIng) * 100}%` : '0%',
                            background: '#10B981',
                            transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.08}s`
                          }} />
                      </div>
                      <div className="text-xs font-bold w-20 text-right text-emerald-500">
                        ${val.toFixed(2)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ÚLTIMOS MOVIMIENTOS */}
        <div className={`rounded-3xl border overflow-hidden ${card}`} style={fadeIn(9)}>
          <div className={`px-7 py-5 flex items-center justify-between border-b ${border}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: 'rgba(59,130,246,0.12)' }}>🕐</div>
              <h2 className={`font-bold text-sm ${text}`}>{mesSeleccionado ? `Movimientos de ${labelMes(mesSeleccionado)}` : 'Últimos movimientos'}</h2>
            </div>
            <a href="/dashboard/banco"
              className="text-xs px-5 py-2 rounded-xl font-bold transition-all hover:scale-105 text-white"
              style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)', boxShadow: '0 4px 16px rgba(233,30,140,0.25)' }}>
              Ver todos →
            </a>
          </div>
          {movimientosFiltrados.length === 0 ? (
            <div className={`text-sm text-center py-12 ${textSub}`}>
              <p className="text-3xl mb-2">📭</p>
              {mesSeleccionado ? `Sin movimientos en ${labelMes(mesSeleccionado)}.` : 'Sin movimientos. Sube un extracto bancario o XML del SRI para empezar.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-800/60' : 'bg-gray-50'}>
                <tr>
                  {['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto'].map(h => (
                    <th key={h} className={`text-left px-6 py-3 text-xs font-semibold ${textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.slice(0, 8).map((m, i) => {
                  const info = categoriaInfo[m.categoria] || { label: m.categoria, emoji: '📦' }
                  return (
                    <tr key={i} className={`border-t ${border} transition-colors ${dark ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50'}`}>
                      <td className={`px-6 py-3.5 text-xs ${textSub}`}>{m.fecha}</td>
                      <td className={`px-6 py-3.5 text-xs font-medium ${text} max-w-xs truncate`}>{m.descripcion}</td>
                      <td className="px-6 py-3.5 text-xs">
                        <span className={`px-2.5 py-1 rounded-full text-xs ${dark ? 'bg-gray-800' : 'bg-gray-100'} ${text}`}>
                          {info.emoji} {info.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${m.tipo === 'ingreso' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className={`px-6 py-3.5 text-right text-xs font-black ${m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.tipo === 'ingreso' ? '+' : '-'}${parseFloat(m.monto).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* CUENTAS */}
        {Object.keys(cuentas).length > 0 && (
          <div className={`rounded-3xl border overflow-hidden ${card}`} style={fadeIn(10)}>
            <div className={`px-7 py-5 border-b ${border} flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: 'rgba(156,39,176,0.12)' }}>🏦</div>
              <h2 className={`font-bold text-sm ${text}`}>Resumen por cuenta</h2>
            </div>
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-800/60' : 'bg-gray-50'}>
                <tr>
                  {['Cuenta', 'Ingresos', 'Gastos', 'Saldo'].map(h => (
                    <th key={h} className={`text-left px-6 py-3 text-xs font-semibold ${textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(cuentas).map(([cuenta, vals]) => (
                  <tr key={cuenta} className={`border-t ${border} ${dark ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className={`px-6 py-3.5 text-xs font-bold ${text} capitalize`}>{cuenta.replace(/-/g, ' ')}</td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-emerald-400">+${vals.ing.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-red-400">-${vals.gas.toFixed(2)}</td>
                    <td className={`px-6 py-3.5 text-xs font-black ${vals.ing - vals.gas >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${(vals.ing - vals.gas).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pie amigable */}
        <p className={`text-center text-xs pb-4 ${dark ? 'text-gray-700' : 'text-gray-400'}`} style={fadeIn(11)}>
          Numia trabaja por ti 24/7 · Tus datos están seguros 🔒
        </p>

      </div>
    </div>
  )
}