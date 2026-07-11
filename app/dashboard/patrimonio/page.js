'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  categoriaActivoInfo,
  categoriasActivo,
  categoriaPasivoInfo,
  categoriasPasivo,
  valorActualActivo,
  infoDepreciacion,
  calcularPatrimonioNeto,
  reconstruirSerieHistorica,
  combinarSerieConSnapshots,
  puntosParaGrafica,
  detectarPagosDeuda
} from '@/lib/patrimonioHelpers'

// ---------- Gráfica de evolución del patrimonio (SVG a mano, mismo lenguaje visual que la landing) ----------
function PatrimonioChart({ serie, dark, visible }) {
  const puntos = puntosParaGrafica(serie, 'patrimonioNeto')

  if (puntos.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center">
        <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Aún no hay suficiente historial para graficar</p>
      </div>
    )
  }

  const W = 600, H = 160
  const coords = puntos.map(p => ({ x: p.x * W, y: p.y * (H - 20) + 10 }))
  const linea = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const area = `${linea} L${W},${H} L0,${H} Z`
  const largo = W + H

  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const labelFecha = (f) => {
    const d = new Date(f)
    return `${meses[d.getMonth()]} ${d.getFullYear()}`
  }

  const ultimo = coords[coords.length - 1]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="patrimonioLinea" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E91E8C" />
            <stop offset="100%" stopColor="#9C27B0" />
          </linearGradient>
          <linearGradient id="patrimonioArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E91E8C" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#E91E8C" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#patrimonioArea)" style={{ opacity: visible ? 1 : 0, transition: 'opacity 1.5s ease 0.5s' }} />
        <path d={linea} fill="none" stroke="url(#patrimonioLinea)" strokeWidth="3" strokeLinecap="round"
          style={{
            strokeDasharray: largo,
            strokeDashoffset: visible ? 0 : largo,
            transition: 'stroke-dashoffset 1.8s ease 0.2s'
          }} />
        <circle cx={ultimo.x} cy={ultimo.y} r="5" fill="#E91E8C"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease 1.8s' }} />
      </svg>
      <div className={`flex justify-between text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
        <span>{labelFecha(serie[0]?.fecha)}</span>
        <span>{labelFecha(serie[serie.length - 1]?.fecha)}</span>
      </div>
    </div>
  )
}

export default function PatrimonioPage() {
  const [darkMode, setDarkMode] = useState(true)
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [graficaVisible, setGraficaVisible] = useState(false)

  const [activos, setActivos] = useState([])
  const [pasivos, setPasivos] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [movimientosDeuda, setMovimientosDeuda] = useState([])
  const [abonos, setAbonos] = useState([])
  const [ambiguos, setAmbiguos] = useState([])

  // Modal activo
  const [mostrarFormActivo, setMostrarFormActivo] = useState(false)
  const [editandoActivoId, setEditandoActivoId] = useState(null)
  const [errorActivo, setErrorActivo] = useState('')
  const [fCategoria, setFCategoria] = useState('efectivo')
  const [fNombre, setFNombre] = useState('')
  const [fValorInicial, setFValorInicial] = useState('')
  const [fFechaCompra, setFFechaCompra] = useState('')
  const [fTasaApreciacion, setFTasaApreciacion] = useState('')
  const [fNota, setFNota] = useState('')

  // Modal pasivo
  const [mostrarFormPasivo, setMostrarFormPasivo] = useState(false)
  const [editandoPasivoId, setEditandoPasivoId] = useState(null)
  const [errorPasivo, setErrorPasivo] = useState('')
  const [pCategoria, setPCategoria] = useState('tarjeta_credito')
  const [pNombre, setPNombre] = useState('')
  const [pSaldoActual, setPSaldoActual] = useState('')
  const [pMontoOriginal, setPMontoOriginal] = useState('')
  const [pTasaInteres, setPTasaInteres] = useState('')
  const [pFechaInicio, setPFechaInicio] = useState('')
  const [pFechaVencimiento, setPFechaVencimiento] = useState('')
  const [pPagoMensual, setPPagoMensual] = useState('')
  const [pNota, setPNota] = useState('')

  const supabase = createClient()

  useEffect(() => { inicializar() }, [])

  async function inicializar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)

    const [{ data: pref }, { data: prof }, { data: acts }, { data: pass }, { data: snaps }, { data: movs }, { data: abonosData }] = await Promise.all([
      supabase.from('preferencias').select('tema').eq('user_id', user.id).single(),
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('activos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('pasivos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('patrimonio_snapshots').select('*').eq('user_id', user.id).order('fecha', { ascending: true }),
      supabase.from('movimientos').select('*').eq('user_id', user.id).eq('categoria', 'deudas'),
      supabase.from('abonos_pasivo').select('*').eq('user_id', user.id).order('fecha', { ascending: false })
    ])

    if (pref) setDarkMode(pref.tema === 'oscuro')
    if (prof) setPerfil(prof)
    const activosData = acts || []
    const pasivosData = pass || []
    setActivos(activosData)
    setPasivos(pasivosData)
    setSnapshots(snaps || [])
    setMovimientosDeuda(movs || [])
    setAbonos(abonosData || [])

    setLoading(false)
    setTimeout(() => setGraficaVisible(true), 100)

    await guardarSnapshotHoy(activosData, pasivosData, user)
    recargarSnapshots(user)

    await procesarPagosDeuda(movs || [], pasivosData, abonosData || [], user)
  }

  async function toggleDark() {
    const nuevo = !darkMode
    setDarkMode(nuevo)
    if (user) await supabase.from('preferencias').upsert({ user_id: user.id, tema: nuevo ? 'oscuro' : 'claro' }, { onConflict: 'user_id' })
  }

  async function recargarActivos() {
    const { data } = await supabase.from('activos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setActivos(data)
    return data || []
  }

  async function recargarPasivos() {
    const { data } = await supabase.from('pasivos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setPasivos(data)
    return data || []
  }

  async function recargarSnapshots(usuario = user) {
    const { data } = await supabase.from('patrimonio_snapshots').select('*').eq('user_id', usuario.id).order('fecha', { ascending: true })
    if (data) setSnapshots(data)
    return data || []
  }

  async function guardarSnapshotHoy(activosData, pasivosData, usuario = user) {
    if (!usuario) return
    const { totalActivos, totalPasivos, patrimonioNeto } = calcularPatrimonioNeto(activosData, pasivosData)
    const hoy = new Date().toISOString().split('T')[0]
    await supabase.from('patrimonio_snapshots').upsert({
      user_id: usuario.id,
      fecha: hoy,
      total_activos: totalActivos,
      total_pasivos: totalPasivos,
      patrimonio_neto: patrimonioNeto
    }, { onConflict: 'user_id,fecha' })
  }

  async function recargarMovimientosDeuda(usuario = user) {
    const { data } = await supabase.from('movimientos').select('*').eq('user_id', usuario.id).eq('categoria', 'deudas')
    if (data) setMovimientosDeuda(data)
    return data || []
  }

  async function recargarAbonos(usuario = user) {
    const { data } = await supabase.from('abonos_pasivo').select('*').eq('user_id', usuario.id).order('fecha', { ascending: false })
    if (data) setAbonos(data)
    return data || []
  }

  // ---------- Pago automático de pasivos ----------
  async function aplicarAbono(mov, pasivo, usuario = user) {
    const monto = parseFloat(mov.monto || 0)
    const { error: dbErr } = await supabase.from('abonos_pasivo').insert({
      user_id: usuario.id,
      pasivo_id: pasivo.id,
      movimiento_id: mov.id,
      fecha: mov.fecha,
      monto
    })
    if (dbErr) return

    const nuevoSaldo = Math.max(parseFloat(pasivo.saldo_actual || 0) - monto, 0)
    await supabase.from('pasivos').update({ saldo_actual: nuevoSaldo }).eq('id', pasivo.id)
  }

  // Corre la detección y aplica automáticamente los matches únicos; deja los ambiguos para que el usuario elija
  async function procesarPagosDeuda(movs, pasivosData, abonosData, usuario = user) {
    const { aplicables, ambiguos: pendientes } = detectarPagosDeuda({
      movimientos: movs,
      pasivos: pasivosData,
      abonosExistentes: abonosData
    })

    if (aplicables.length > 0) {
      for (const { movimiento, pasivo } of aplicables) {
        await aplicarAbono(movimiento, pasivo, usuario)
      }
      const nuevosPasivos = await recargarPasivos()
      await recargarAbonos(usuario)
      await guardarSnapshotHoy(activos, nuevosPasivos, usuario)
      recargarSnapshots(usuario)
    }

    setAmbiguos(pendientes)
  }

  async function resolverAmbiguo(mov, pasivoElegido) {
    await aplicarAbono(mov, pasivoElegido)
    setAmbiguos(prev => prev.filter(a => a.movimiento.id !== mov.id))
    const nuevosPasivos = await recargarPasivos()
    await recargarAbonos()
    await guardarSnapshotHoy(activos, nuevosPasivos)
    recargarSnapshots()
  }

  async function deshacerAbono(abono) {
    if (!confirm('¿Deshacer este abono? El saldo del pasivo se restaura.')) return
    const pasivo = pasivos.find(p => p.id === abono.pasivo_id)
    if (pasivo) {
      const saldoRestaurado = parseFloat(pasivo.saldo_actual || 0) + parseFloat(abono.monto || 0)
      await supabase.from('pasivos').update({ saldo_actual: saldoRestaurado }).eq('id', pasivo.id)
    }
    await supabase.from('abonos_pasivo').delete().eq('id', abono.id)
    const nuevosPasivos = await recargarPasivos()
    await recargarAbonos()
    await guardarSnapshotHoy(activos, nuevosPasivos)
    recargarSnapshots()
  }

  // ---------- CRUD Activos ----------
  function abrirNuevoActivo() {
    setEditandoActivoId(null)
    setFCategoria('efectivo')
    setFNombre('')
    setFValorInicial('')
    setFFechaCompra('')
    setFTasaApreciacion('')
    setFNota('')
    setErrorActivo('')
    setMostrarFormActivo(true)
  }

  function abrirEditarActivo(a) {
    setEditandoActivoId(a.id)
    setFCategoria(a.categoria)
    setFNombre(a.nombre)
    setFValorInicial(String(a.valor_inicial ?? ''))
    setFFechaCompra(a.fecha_compra || '')
    setFTasaApreciacion(a.tasa_apreciacion_anual != null ? String(a.tasa_apreciacion_anual * 100) : '')
    setFNota(a.nota || '')
    setErrorActivo('')
    setMostrarFormActivo(true)
  }

  function cerrarFormActivo() {
    setMostrarFormActivo(false)
    setEditandoActivoId(null)
    setErrorActivo('')
  }

  async function guardarActivo() {
    setErrorActivo('')
    if (!fNombre || !fCategoria) { setErrorActivo('Nombre y categoría son obligatorios'); return }
    const valorInicial = parseFloat(fValorInicial) || 0
    if (valorInicial <= 0) { setErrorActivo('Ingresa un valor inicial mayor a 0'); return }

    const info = categoriaActivoInfo[fCategoria]
    const comportamiento = info?.comportamiento || 'fijo'
    const payload = {
      user_id: user.id,
      categoria: fCategoria,
      nombre: fNombre,
      valor_inicial: valorInicial,
      fecha_compra: comportamiento !== 'fijo' ? (fFechaCompra || null) : null,
      tasa_apreciacion_anual: comportamiento === 'aprecia' && fTasaApreciacion ? (parseFloat(fTasaApreciacion) / 100) : null,
      nota: fNota || null
    }

    if (editandoActivoId) {
      const { error: dbErr } = await supabase.from('activos').update(payload).eq('id', editandoActivoId)
      if (dbErr) { setErrorActivo('No se pudo actualizar'); return }
    } else {
      const { error: dbErr } = await supabase.from('activos').insert(payload)
      if (dbErr) { setErrorActivo('No se pudo guardar'); return }
    }

    cerrarFormActivo()
    const nuevosActivos = await recargarActivos()
    await guardarSnapshotHoy(nuevosActivos, pasivos)
    recargarSnapshots()
  }

  async function eliminarActivo(id) {
    if (!confirm('¿Eliminar este activo?')) return
    await supabase.from('activos').delete().eq('id', id)
    const nuevosActivos = await recargarActivos()
    await guardarSnapshotHoy(nuevosActivos, pasivos)
    recargarSnapshots()
  }

  // ---------- CRUD Pasivos ----------
  function abrirNuevoPasivo() {
    setEditandoPasivoId(null)
    setPCategoria('tarjeta_credito')
    setPNombre('')
    setPSaldoActual('')
    setPMontoOriginal('')
    setPTasaInteres('')
    setPFechaInicio('')
    setPFechaVencimiento('')
    setPPagoMensual('')
    setPNota('')
    setErrorPasivo('')
    setMostrarFormPasivo(true)
  }

  function abrirEditarPasivo(p) {
    setEditandoPasivoId(p.id)
    setPCategoria(p.categoria)
    setPNombre(p.nombre)
    setPSaldoActual(String(p.saldo_actual ?? ''))
    setPMontoOriginal(p.monto_original != null ? String(p.monto_original) : '')
    setPTasaInteres(p.tasa_interes_anual != null ? String(p.tasa_interes_anual) : '')
    setPFechaInicio(p.fecha_inicio || '')
    setPFechaVencimiento(p.fecha_vencimiento || '')
    setPPagoMensual(p.pago_mensual != null ? String(p.pago_mensual) : '')
    setPNota(p.nota || '')
    setErrorPasivo('')
    setMostrarFormPasivo(true)
  }

  function cerrarFormPasivo() {
    setMostrarFormPasivo(false)
    setEditandoPasivoId(null)
    setErrorPasivo('')
  }

  async function guardarPasivo() {
    setErrorPasivo('')
    if (!pNombre || !pCategoria) { setErrorPasivo('Nombre y categoría son obligatorios'); return }
    const saldoActual = parseFloat(pSaldoActual) || 0
    if (saldoActual < 0) { setErrorPasivo('El saldo no puede ser negativo'); return }

    const payload = {
      user_id: user.id,
      categoria: pCategoria,
      nombre: pNombre,
      saldo_actual: saldoActual,
      monto_original: pMontoOriginal ? parseFloat(pMontoOriginal) : null,
      tasa_interes_anual: pTasaInteres ? parseFloat(pTasaInteres) : null,
      fecha_inicio: pFechaInicio || null,
      fecha_vencimiento: pFechaVencimiento || null,
      pago_mensual: pPagoMensual ? parseFloat(pPagoMensual) : null,
      nota: pNota || null
    }

    if (editandoPasivoId) {
      const { error: dbErr } = await supabase.from('pasivos').update(payload).eq('id', editandoPasivoId)
      if (dbErr) { setErrorPasivo('No se pudo actualizar'); return }
    } else {
      const { error: dbErr } = await supabase.from('pasivos').insert(payload)
      if (dbErr) { setErrorPasivo('No se pudo guardar'); return }
    }

    cerrarFormPasivo()
    const nuevosPasivos = await recargarPasivos()
    await guardarSnapshotHoy(activos, nuevosPasivos)
    recargarSnapshots()
    procesarPagosDeuda(movimientosDeuda, nuevosPasivos, abonos)
  }

  async function eliminarPasivo(id) {
    if (!confirm('¿Eliminar este pasivo?')) return
    await supabase.from('pasivos').delete().eq('id', id)
    const nuevosPasivos = await recargarPasivos()
    await guardarSnapshotHoy(activos, nuevosPasivos)
    recargarSnapshots()
  }

  // ---------- Cálculos derivados ----------
  const hoy = new Date()
  const activosConValor = activos.map(a => ({ ...a, valorActual: valorActualActivo(a, hoy) }))
  const { totalActivos, totalPasivos, patrimonioNeto } = calcularPatrimonioNeto(activos, pasivos, hoy)
  const serieHistorica = combinarSerieConSnapshots(reconstruirSerieHistorica({ activos, pasivos, hoy }), snapshots)
  const sinDatos = activos.length === 0 && pasivos.length === 0

  const dark = darkMode
  const bg = dark ? 'bg-gray-950' : 'bg-gray-100'
  const card = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const text = dark ? 'text-gray-100' : 'text-gray-900'
  const inputClass = dark
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-pink-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-pink-500'

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Cargando Numia...</p>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>

      {/* NAVBAR */}
      <header className={`sticky top-0 z-50 border-b ${dark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'} backdrop-blur`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <img src="/Logo Numia.png" alt="Numia" className="h-8 w-auto" />
            </Link>
            <div className={`h-5 w-px ${dark ? 'bg-gray-700' : 'bg-gray-300'}`} />
            <div>
              <h1 className="font-bold text-sm" style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Patrimonio Neto
              </h1>
              <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Activos, pasivos y tu valor neto</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              ← Dashboard
            </Link>
            <button onClick={toggleDark} className={`p-2 rounded-lg border transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* HERO NET WORTH */}
        <div className={`rounded-2xl border p-6 mb-8 ${card}`}>
          {sinDatos ? (
            <div className="py-6 text-center">
              <p className="text-3xl mb-2">💎</p>
              <p className={`font-bold ${text}`}>Registra tus activos y pasivos</p>
              <p className={`text-sm mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Así vas a poder ver tu patrimonio neto y cómo evoluciona en el tiempo.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div>
                  <p className={`text-xs font-semibold mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Patrimonio Neto</p>
                  <p className="text-4xl font-black" style={{ color: patrimonioNeto >= 0 ? '#10B981' : '#EF4444' }}>
                    {patrimonioNeto < 0 ? '-' : ''}${Math.abs(patrimonioNeto).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Total Activos</p>
                    <p className="text-lg font-bold text-emerald-400">${totalActivos.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Total Pasivos</p>
                    <p className="text-lg font-bold text-red-400">${totalPasivos.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <PatrimonioChart serie={serieHistorica} dark={dark} visible={graficaVisible} />
            </>
          )}
        </div>

        {/* ACTIVOS */}
        <div className={`rounded-2xl border p-6 mb-8 ${card}`}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className={`font-bold text-sm ${text}`}>💰 Activos</h2>
              <p className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {activos.length} {activos.length === 1 ? 'activo' : 'activos'} registrados
              </p>
            </div>
            <button onClick={abrirNuevoActivo}
              className="text-xs px-4 py-2 rounded-lg font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
              + Nuevo activo
            </button>
          </div>

          {activosConValor.length === 0 ? (
            <div className="py-10 text-center">
              <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No hay activos todavía.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-left ${dark ? 'text-gray-400 border-gray-800' : 'text-gray-500 border-gray-200'} border-b`}>
                    <th className="py-2 pr-4 font-semibold">Categoría</th>
                    <th className="py-2 pr-4 font-semibold">Nombre</th>
                    <th className="py-2 pr-4 font-semibold text-right">Valor inicial</th>
                    <th className="py-2 pr-4 font-semibold text-right">Valor actual</th>
                    <th className="py-2 pr-4 font-semibold">Compra</th>
                    <th className="py-2 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activosConValor.map(a => {
                    const info = categoriaActivoInfo[a.categoria] || { label: a.categoria, emoji: '📦', comportamiento: 'fijo' }
                    const inicial = parseFloat(a.valor_inicial || 0)
                    const sube = a.valorActual > inicial + 0.005
                    const baja = a.valorActual < inicial - 0.005
                    const colorValor = sube ? 'text-emerald-400' : baja ? 'text-pink-400' : text
                    const dep = infoDepreciacion(a.categoria)
                    return (
                      <tr key={a.id} className={`border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
                        <td className={`py-2 pr-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{info.emoji} {info.label}</td>
                        <td className={`py-2 pr-4 ${text}`}>{a.nombre}</td>
                        <td className={`py-2 pr-4 text-right ${dark ? 'text-gray-400' : 'text-gray-500'}`}>${inicial.toFixed(2)}</td>
                        <td className={`py-2 pr-4 text-right font-bold ${colorValor}`}>
                          {sube ? '↑ ' : baja ? '↓ ' : ''}${a.valorActual.toFixed(2)}
                          {dep && <span className={`block text-[10px] font-normal ${dark ? 'text-gray-500' : 'text-gray-400'}`}>en {dep.vidaUtilAnios} años: $0.00</span>}
                        </td>
                        <td className={`py-2 pr-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{a.fecha_compra || '—'}</td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button onClick={() => abrirEditarActivo(a)} className="text-gray-400 hover:text-pink-400 text-xs mr-3 transition-colors">Editar</button>
                          <button onClick={() => eliminarActivo(a.id)} className="text-gray-400 hover:text-red-400 text-xs transition-colors">Eliminar</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PAGOS AMBIGUOS PENDIENTES DE RESOLVER */}
        {ambiguos.length > 0 && (
          <div className={`rounded-2xl border-2 p-6 mb-8 ${dark ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-yellow-400 bg-yellow-50'}`}>
            <h2 className={`font-bold text-sm mb-3 ${text}`}>⚠️ Pagos por confirmar</h2>
            {ambiguos.map(({ movimiento, opciones }) => (
              <div key={movimiento.id} className={`mb-3 last:mb-0 p-4 rounded-xl ${dark ? 'bg-gray-900/60' : 'bg-white'}`}>
                <p className={`text-sm mb-3 ${text}`}>
                  Detectamos un pago de <span className="font-bold">${parseFloat(movimiento.monto || 0).toFixed(2)}</span> el {movimiento.fecha} — ¿a cuál deuda lo aplicamos?
                </p>
                <div className="flex flex-wrap gap-2">
                  {opciones.map(p => (
                    <button key={p.id} onClick={() => resolverAmbiguo(movimiento, p)}
                      className={`text-xs px-3 py-2 rounded-lg border transition-colors ${dark ? 'border-gray-700 text-gray-200 hover:border-pink-500' : 'border-gray-300 text-gray-700 hover:border-pink-500'}`}>
                      {categoriaPasivoInfo[p.categoria]?.emoji} {p.nombre}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PASIVOS */}
        <div className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className={`font-bold text-sm ${text}`}>💳 Pasivos</h2>
              <p className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {pasivos.length} {pasivos.length === 1 ? 'pasivo' : 'pasivos'} registrados
              </p>
            </div>
            <button onClick={abrirNuevoPasivo}
              className="text-xs px-4 py-2 rounded-lg font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
              + Nuevo pasivo
            </button>
          </div>

          {pasivos.length === 0 ? (
            <div className="py-10 text-center">
              <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No hay pasivos todavía.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-left ${dark ? 'text-gray-400 border-gray-800' : 'text-gray-500 border-gray-200'} border-b`}>
                    <th className="py-2 pr-4 font-semibold">Categoría</th>
                    <th className="py-2 pr-4 font-semibold">Nombre</th>
                    <th className="py-2 pr-4 font-semibold text-right">Saldo actual</th>
                    <th className="py-2 pr-4 font-semibold text-right">Cuota</th>
                    <th className="py-2 pr-4 font-semibold">Vencimiento</th>
                    <th className="py-2 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pasivos.map(p => {
                    const info = categoriaPasivoInfo[p.categoria] || { label: p.categoria, emoji: '📦' }
                    return (
                      <tr key={p.id} className={`border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
                        <td className={`py-2 pr-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{info.emoji} {info.label}</td>
                        <td className={`py-2 pr-4 ${text}`}>{p.nombre}</td>
                        <td className="py-2 pr-4 text-right font-bold text-red-400">${parseFloat(p.saldo_actual || 0).toFixed(2)}</td>
                        <td className={`py-2 pr-4 text-right ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{p.pago_mensual != null ? `$${parseFloat(p.pago_mensual).toFixed(2)}` : '—'}</td>
                        <td className={`py-2 pr-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{p.fecha_vencimiento || '—'}</td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button onClick={() => abrirEditarPasivo(p)} className="text-gray-400 hover:text-pink-400 text-xs mr-3 transition-colors">Editar</button>
                          <button onClick={() => eliminarPasivo(p.id)} className="text-gray-400 hover:text-red-400 text-xs transition-colors">Eliminar</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ABONOS APLICADOS AUTOMÁTICAMENTE */}
        {abonos.length > 0 && (
          <div className={`rounded-2xl border p-6 mt-8 ${card}`}>
            <h2 className={`font-bold text-sm mb-1 ${text}`}>📉 Abonos aplicados</h2>
            <p className={`text-xs mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Pagos detectados automáticamente desde tus movimientos y aplicados al saldo de tus pasivos.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-left ${dark ? 'text-gray-400 border-gray-800' : 'text-gray-500 border-gray-200'} border-b`}>
                    <th className="py-2 pr-4 font-semibold">Fecha</th>
                    <th className="py-2 pr-4 font-semibold">Pasivo</th>
                    <th className="py-2 pr-4 font-semibold text-right">Monto</th>
                    <th className="py-2 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {abonos.map(ab => {
                    const pasivo = pasivos.find(p => p.id === ab.pasivo_id)
                    return (
                      <tr key={ab.id} className={`border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
                        <td className={`py-2 pr-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{ab.fecha}</td>
                        <td className={`py-2 pr-4 ${text}`}>{pasivo ? pasivo.nombre : '—'}</td>
                        <td className="py-2 pr-4 text-right font-bold text-emerald-400">${parseFloat(ab.monto || 0).toFixed(2)}</td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button onClick={() => deshacerAbono(ab)} className="text-gray-400 hover:text-red-400 text-xs transition-colors">Deshacer</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NOTA */}
        <div className={`mt-8 p-5 rounded-2xl border ${card}`}>
          <h3 className={`font-bold mb-2 flex items-center gap-2 ${text}`}>ℹ️ Importante</h3>
          <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            La depreciación se calcula en línea recta según las tasas referenciales del Art. 28 del Reglamento a la Ley de Régimen Tributario Interno de Ecuador (vehículos 20%, tecnología 33.33%, muebles/maquinaria 10% anual). Las apreciaciones (inmuebles, terrenos, inversiones) usan interés compuesto solo si ingresas una tasa. El valor comercial real puede diferir de estos cálculos — úsalos como referencia, no como una tasación oficial.
          </p>
        </div>

      </div>

      {/* MODAL ACTIVO */}
      {mostrarFormActivo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className={`rounded-2xl border p-8 w-full max-w-lg my-8 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h2 className={`font-bold text-lg mb-6 ${text}`}>
              {editandoActivoId ? 'Editar activo' : 'Nuevo activo'}
            </h2>

            {errorActivo && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">{errorActivo}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Categoría</label>
                <select value={fCategoria} onChange={e => setFCategoria(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`}>
                  {categoriasActivo.map(c => (
                    <option key={c} value={c}>{categoriaActivoInfo[c].emoji} {categoriaActivoInfo[c].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Nombre</label>
                <input type="text" value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Ej: Toyota Corolla 2020"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Valor inicial</label>
                <input type="number" step="0.01" value={fValorInicial} onChange={e => setFValorInicial(e.target.value)} placeholder="0.00"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>

              {(categoriaActivoInfo[fCategoria]?.comportamiento === 'deprecia' || categoriaActivoInfo[fCategoria]?.comportamiento === 'aprecia') && (
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Fecha de compra</label>
                  <input type="date" value={fFechaCompra} onChange={e => setFFechaCompra(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
                </div>
              )}

              {categoriaActivoInfo[fCategoria]?.comportamiento === 'aprecia' && (
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Tasa de crecimiento anual % (opcional)</label>
                  <input type="number" step="0.01" value={fTasaApreciacion} onChange={e => setFTasaApreciacion(e.target.value)} placeholder="5"
                    className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
                </div>
              )}

              {infoDepreciacion(fCategoria) && (
                <div className="sm:col-span-2">
                  <p className={`text-xs px-3 py-2 rounded-lg ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                    📉 Se deprecia {(infoDepreciacion(fCategoria).tasaAnual * 100).toFixed(2)}% al año (vida útil {infoDepreciacion(fCategoria).vidaUtilAnios} años según SRI)
                  </p>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Nota (opcional)</label>
                <input type="text" value={fNota} onChange={e => setFNota(e.target.value)} placeholder="Detalle adicional..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={cerrarFormActivo}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${dark ? 'text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700' : 'text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200'}`}>
                Cancelar
              </button>
              <button onClick={guardarActivo}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
                {editandoActivoId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PASIVO */}
      {mostrarFormPasivo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className={`rounded-2xl border p-8 w-full max-w-lg my-8 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h2 className={`font-bold text-lg mb-6 ${text}`}>
              {editandoPasivoId ? 'Editar pasivo' : 'Nuevo pasivo'}
            </h2>

            {errorPasivo && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">{errorPasivo}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Categoría</label>
                <select value={pCategoria} onChange={e => setPCategoria(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`}>
                  {categoriasPasivo.map(c => (
                    <option key={c} value={c}>{categoriaPasivoInfo[c].emoji} {categoriaPasivoInfo[c].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Nombre</label>
                <input type="text" value={pNombre} onChange={e => setPNombre(e.target.value)} placeholder="Ej: Tarjeta Diners"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Saldo actual</label>
                <input type="number" step="0.01" value={pSaldoActual} onChange={e => setPSaldoActual(e.target.value)} placeholder="0.00"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Monto original (opcional)</label>
                <input type="number" step="0.01" value={pMontoOriginal} onChange={e => setPMontoOriginal(e.target.value)} placeholder="0.00"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Tasa interés anual (opcional)</label>
                <input type="number" step="0.01" value={pTasaInteres} onChange={e => setPTasaInteres(e.target.value)} placeholder="0.12"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Cuota / pago mensual (opcional)</label>
                <input type="number" step="0.01" value={pPagoMensual} onChange={e => setPPagoMensual(e.target.value)} placeholder="300.00"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
                <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Si un movimiento de &quot;deudas&quot; coincide exacto con este monto, Numia abona automáticamente.</p>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Fecha inicio (opcional)</label>
                <input type="date" value={pFechaInicio} onChange={e => setPFechaInicio(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Vencimiento (opcional)</label>
                <input type="date" value={pFechaVencimiento} onChange={e => setPFechaVencimiento(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Nota (opcional)</label>
                <input type="text" value={pNota} onChange={e => setPNota(e.target.value)} placeholder="Detalle adicional..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={cerrarFormPasivo}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${dark ? 'text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700' : 'text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200'}`}>
                Cancelar
              </button>
              <button onClick={guardarPasivo}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
                {editandoPasivoId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
