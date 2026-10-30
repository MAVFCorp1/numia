'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  preguntasPerfilRiesgo,
  horizonteAnios,
  calcularScoreRiesgo,
  perfilPorScore,
  perfilRiesgoInfo,
  ordenPerfiles,
  carterasModelo,
  etfInfo,
  proyectarCrecimiento,
} from '@/lib/inversionesHelpers'

// ---------- Gráfica de torta de la cartera modelo (mismo lenguaje visual que el resto de Numia) ----------
function CarteraDonut({ cartera, dark }) {
  const [hoverTicker, setHoverTicker] = useState(null)
  const R = 62, C = 2 * Math.PI * R
  const activo = hoverTicker

  const segmentos = cartera.reduce((acc, { ticker, peso }) => {
    const previo = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].frac : 0
    acc.push({ ticker, peso, frac: peso, offset: previo })
    return acc
  }, [])

  const infoActiva = activo ? etfInfo[activo] : null
  const pesoActivo = activo ? (cartera.find(c => c.ticker === activo)?.peso || 0) : 0

  return (
    <div className="flex items-center gap-8 flex-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        <g transform="rotate(-90 80 80)">
          <circle cx="80" cy="80" r={R} fill="none" stroke={dark ? '#1F2937' : '#F3F4F6'} strokeWidth="26" />
          {segmentos.map(({ ticker, frac, offset }, i) => {
            const info = etfInfo[ticker] || { color: '#9CA3AF' }
            const dash = frac * C
            const atenuada = activo && activo !== ticker
            return (
              <circle key={ticker} cx="80" cy="80" r={R} fill="none" stroke={info.color}
                strokeWidth={activo === ticker ? 30 : 26}
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset * C}
                opacity={atenuada ? 0.35 : 1}
                className="cursor-pointer"
                onMouseEnter={() => setHoverTicker(ticker)}
                onMouseLeave={() => setHoverTicker(null)}
                style={{ transition: `stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 0.05}s, stroke-width 0.15s ease, opacity 0.15s ease` }}>
                <title>{ticker} — {info.nombre}: {(frac * 100).toFixed(0)}%</title>
              </circle>
            )
          })}
        </g>
        <circle cx="80" cy="80" r="38" fill={dark ? '#111827' : '#ffffff'} className="pointer-events-none" />
        {infoActiva ? (
          <>
            <text x="80" y="76" textAnchor="middle" className="text-[11px] font-bold" fill={dark ? '#F3F4F6' : '#111827'}>{activo}</text>
            <text x="80" y="90" textAnchor="middle" className="text-[9px]" fill={dark ? '#9CA3AF' : '#6B7280'}>{(pesoActivo * 100).toFixed(0)}%</text>
          </>
        ) : (
          <>
            <text x="80" y="76" textAnchor="middle" className="text-[11px] font-bold" fill={dark ? '#F3F4F6' : '#111827'}>{cartera.length}</text>
            <text x="80" y="90" textAnchor="middle" className="text-[8px]" fill={dark ? '#9CA3AF' : '#6B7280'}>ETFs</text>
          </>
        )}
      </svg>
      <div className="space-y-2 min-w-[200px]">
        {cartera.map(({ ticker, peso }) => {
          const info = etfInfo[ticker] || { nombre: ticker, tipo: '', color: '#9CA3AF' }
          return (
            <div key={ticker}
              onMouseEnter={() => setHoverTicker(ticker)} onMouseLeave={() => setHoverTicker(null)}
              className={`flex items-center gap-2 text-xs rounded-md px-1.5 py-1 -mx-1.5 transition-colors ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: info.color }} />
              <span className={`font-bold ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{ticker}</span>
              <span className={`truncate ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{info.tipo}</span>
              <span className={`ml-auto font-semibold shrink-0 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{(peso * 100).toFixed(0)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Gráfica de proyección de crecimiento (SVG a mano) ----------
function ProyeccionChart({ serie, dark }) {
  if (serie.length < 2) return null
  const W = 600, H = 160
  const valores = serie.map(p => p.valor)
  const min = Math.min(...valores, 0)
  const max = Math.max(...valores) || 1
  const rango = (max - min) || 1

  const coords = serie.map((p, i) => ({
    x: (i / (serie.length - 1)) * W,
    y: H - 10 - ((p.valor - min) / rango) * (H - 20),
  }))
  const linea = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const area = `${linea} L${W},${H} L0,${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="proyeccionArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9C27B0" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#9C27B0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#proyeccionArea)" />
      <path d={linea} fill="none" stroke="#9C27B0" strokeWidth="3" strokeLinecap="round" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="5" fill="#9C27B0" />
    </svg>
  )
}

function fmt(v) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function InversionesPage() {
  const [darkMode, setDarkMode] = useState(true)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [perfilInversion, setPerfilInversion] = useState(null)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [capitalInicial, setCapitalInicial] = useState('')
  const [aporteMensual, setAporteMensual] = useState('')
  const [respuestas, setRespuestas] = useState({})

  // Ajuste manual de la cartera sugerida (porcentajes por ETF) antes de aceptarla
  const [ajustando, setAjustando] = useState(false)
  const [carteraEditable, setCarteraEditable] = useState([])
  const [guardandoCartera, setGuardandoCartera] = useState(false)
  const [errorCartera, setErrorCartera] = useState('')

  const supabase = createClient()

  useEffect(() => { inicializar() }, [])

  async function inicializar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)

    const [{ data: pref }, { data: perfilInv }] = await Promise.all([
      supabase.from('preferencias').select('tema').eq('user_id', user.id).single(),
      supabase.from('perfil_inversion').select('*').eq('user_id', user.id).maybeSingle(),
    ])

    if (pref) setDarkMode(pref.tema === 'oscuro')
    if (perfilInv) {
      setPerfilInversion(perfilInv)
      setCapitalInicial(String(perfilInv.capital_inicial ?? ''))
      setAporteMensual(String(perfilInv.aporte_mensual ?? ''))
      setRespuestas({
        horizonte: perfilInv.horizonte,
        objetivo: perfilInv.objetivo,
        reaccion_caida: perfilInv.reaccion_caida,
        experiencia: perfilInv.experiencia,
        porcentaje_ingreso: perfilInv.porcentaje_ingreso,
      })
    }
    setLoading(false)
  }

  async function toggleDark() {
    const nuevo = !darkMode
    setDarkMode(nuevo)
    if (user) await supabase.from('preferencias').upsert({ user_id: user.id, tema: nuevo ? 'oscuro' : 'claro' }, { onConflict: 'user_id' })
  }

  async function guardarPerfil() {
    if (!capitalInicial || parseFloat(capitalInicial) <= 0) {
      setError('Ingresa cuánto capital tienes disponible para invertir.')
      return
    }
    const faltante = preguntasPerfilRiesgo.find(p => !respuestas[p.id])
    if (faltante) {
      setError('Responde todas las preguntas para calcular tu perfil.')
      return
    }

    setError('')
    setGuardando(true)

    const score = calcularScoreRiesgo(respuestas)
    const perfil = perfilPorScore(score)

    const payload = {
      user_id: user.id,
      capital_inicial: parseFloat(capitalInicial),
      aporte_mensual: parseFloat(aporteMensual || 0),
      horizonte: respuestas.horizonte,
      objetivo: respuestas.objetivo,
      reaccion_caida: respuestas.reaccion_caida,
      experiencia: respuestas.experiencia,
      porcentaje_ingreso: respuestas.porcentaje_ingreso,
      score,
      perfil,
      updated_at: new Date().toISOString(),
    }

    const { data, error: err } = await supabase.from('perfil_inversion')
      .upsert(payload, { onConflict: 'user_id' }).select().single()

    setGuardando(false)
    if (err) { setError('No se pudo guardar tu perfil. Intenta de nuevo en unos minutos.'); return }
    setPerfilInversion(data)
    setEditando(false)
  }

  // Arranca el modo de ajuste con la cartera actual (la aceptada antes, o la sugerida si aún no hay ninguna)
  function iniciarAjuste() {
    const base = (perfilInversion?.cartera?.length ? perfilInversion.cartera : carterasModelo[perfilInversion.perfil])
    setCarteraEditable(base.map(c => ({ ...c })))
    setErrorCartera('')
    setAjustando(true)
  }

  function restablecerSugerida() {
    setCarteraEditable(carterasModelo[perfilInversion.perfil].map(c => ({ ...c })))
  }

  function cambiarPeso(ticker, valorPorcentaje) {
    const frac = Math.max(0, Math.min(100, parseFloat(valorPorcentaje) || 0)) / 100
    setCarteraEditable(arr => arr.map(c => c.ticker === ticker ? { ...c, peso: frac } : c))
  }

  async function aceptarCartera() {
    const suma = carteraEditable.reduce((s, c) => s + c.peso, 0)
    if (Math.abs(suma - 1) > 0.01) {
      setErrorCartera('Los porcentajes deben sumar 100% entre todos los ETFs.')
      return
    }
    setErrorCartera('')
    setGuardandoCartera(true)
    const { data, error: err } = await supabase.from('perfil_inversion')
      .update({ cartera: carteraEditable, estado: 'aceptada', updated_at: new Date().toISOString() })
      .eq('user_id', user.id).select().single()
    setGuardandoCartera(false)
    if (err) { setErrorCartera('No se pudo guardar tu cartera. Intenta de nuevo.'); return }
    setPerfilInversion(data)
    setAjustando(false)
  }

  const dark = darkMode
  const bg = dark ? 'bg-gray-950' : 'bg-gray-100'
  const card = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const text = dark ? 'text-gray-100' : 'text-gray-900'
  const textSub = dark ? 'text-gray-400' : 'text-gray-500'
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

  const mostrarFormulario = !perfilInversion || editando

  // Datos derivados de un perfil ya calculado
  let info, cartera, serieProyeccion, ultimo, ganancia
  if (perfilInversion && !editando) {
    info = perfilRiesgoInfo[perfilInversion.perfil]
    cartera = perfilInversion.cartera?.length ? perfilInversion.cartera : carterasModelo[perfilInversion.perfil]
    const anios = horizonteAnios[perfilInversion.horizonte] || 5
    serieProyeccion = proyectarCrecimiento({
      capitalInicial: perfilInversion.capital_inicial,
      aporteMensual: perfilInversion.aporte_mensual,
      anios,
      retornoAnual: info.retornoEsperadoAnual,
    })
    ultimo = serieProyeccion[serieProyeccion.length - 1]
    ganancia = ultimo.valor - ultimo.aportado
  }

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
                Inversiones
              </h1>
              <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Tu perfil de riesgo y cartera de ETFs</p>
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

      <div className="max-w-4xl mx-auto px-4 py-8">

        {mostrarFormulario ? (
          <div className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <div className="mb-6">
              <p className="text-2xl mb-1">📈</p>
              <h2 className={`font-bold text-lg ${text}`}>Descubre tu perfil de inversión</h2>
              <p className={`text-sm mt-1 ${textSub}`}>Responde estas preguntas para que te sugiramos una cartera de ETFs acorde a tu capital, tu objetivo y cuánto riesgo estás dispuesto a tomar.</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className={`text-xs font-semibold mb-1.5 block ${textSub}`}>Capital disponible para invertir</label>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm ${textSub}`}>$</span>
                  <input type="number" min="0" step="0.01" value={capitalInicial} onChange={e => setCapitalInicial(e.target.value)}
                    placeholder="1000"
                    className={`w-full pl-7 pr-3.5 py-2.5 rounded-xl border text-sm ${inputClass}`} />
                </div>
              </div>
              <div>
                <label className={`text-xs font-semibold mb-1.5 block ${textSub}`}>Aporte mensual (opcional)</label>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm ${textSub}`}>$</span>
                  <input type="number" min="0" step="0.01" value={aporteMensual} onChange={e => setAporteMensual(e.target.value)}
                    placeholder="100"
                    className={`w-full pl-7 pr-3.5 py-2.5 rounded-xl border text-sm ${inputClass}`} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {preguntasPerfilRiesgo.map(p => (
                <div key={p.id}>
                  <p className={`text-sm font-semibold mb-2.5 ${text}`}>{p.pregunta}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {p.opciones.map(o => {
                      const seleccionado = respuestas[p.id] === o.valor
                      return (
                        <button key={o.valor} type="button"
                          onClick={() => setRespuestas(r => ({ ...r, [p.id]: o.valor }))}
                          className="rounded-xl p-3 text-left transition-all border text-xs"
                          style={seleccionado
                            ? { background: 'rgba(233,30,140,0.1)', borderColor: '#E91E8C' }
                            : dark ? { background: '#1f2937', borderColor: '#374151' } : { background: '#F9FAFB', borderColor: '#E5E7EB' }}>
                          <p className={`font-semibold ${seleccionado ? (dark ? 'text-pink-300' : 'text-pink-700') : text}`}>{o.texto}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              {perfilInversion && (
                <button onClick={() => setEditando(false)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${dark ? 'text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700' : 'text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200'}`}>
                  Cancelar
                </button>
              )}
              <button onClick={guardarPerfil} disabled={guardando}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
                {guardando ? 'Calculando...' : 'Ver mi perfil y cartera sugerida →'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">

            {/* PERFIL DE RIESGO */}
            <div className={`rounded-2xl border p-6 ${card}`}>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div>
                  <p className={`text-xs font-semibold mb-1 ${textSub}`}>Tu perfil de riesgo</p>
                  <p className="text-2xl font-black flex items-center gap-2" style={{ color: info.color }}>
                    {info.emoji} {info.label}
                  </p>
                </div>
                <button onClick={() => setEditando(true)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  🔁 Rehacer cuestionario
                </button>
              </div>
              <p className={`text-sm mb-5 ${textSub}`}>{info.descripcion}</p>

              {/* Barra de posición entre los 5 perfiles */}
              <div className="flex gap-1.5">
                {ordenPerfiles.map(p => (
                  <div key={p} className="flex-1 h-2 rounded-full"
                    style={{ background: p === perfilInversion.perfil ? perfilRiesgoInfo[p].color : (dark ? '#374151' : '#E5E7EB') }} />
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                <span className={`text-[10px] ${textSub}`}>Conservador</span>
                <span className={`text-[10px] ${textSub}`}>Agresivo</span>
              </div>
            </div>

            {/* CARTERA SUGERIDA */}
            <div className={`rounded-2xl border p-6 ${card}`}>
              <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
                <h2 className={`font-bold text-sm ${text}`}>🧺 Tu cartera de ETFs</h2>
                {perfilInversion.estado === 'aceptada' && !ajustando && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">✅ Aceptada</span>
                )}
              </div>
              <p className={`text-xs mb-5 ${textSub}`}>
                {ajustando
                  ? 'Ajusta el % de cada ETF — deben sumar 100% entre todos.'
                  : 'Selección ilustrativa de ETFs ampliamente diversificados para tu perfil. No es asesoría financiera personalizada.'}
              </p>

              {errorCartera && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-2.5 rounded-lg mb-4">{errorCartera}</div>
              )}

              {ajustando ? (
                <div className="flex items-start gap-8 flex-wrap">
                  <CarteraDonut cartera={carteraEditable} dark={dark} />
                  <div className="space-y-2 flex-1 min-w-[220px]">
                    {carteraEditable.map(({ ticker, peso }) => {
                      const etf = etfInfo[ticker] || { nombre: ticker, tipo: '', color: '#9CA3AF' }
                      return (
                        <div key={ticker} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: etf.color }} />
                          <span className={`font-bold w-11 shrink-0 ${text}`}>{ticker}</span>
                          <span className={`flex-1 truncate ${textSub}`}>{etf.tipo}</span>
                          <div className="relative w-[70px] shrink-0">
                            <input type="number" min="0" max="100" step="1"
                              value={Math.round(peso * 100)}
                              onChange={e => cambiarPeso(ticker, e.target.value)}
                              className={`w-full pl-2 pr-5 py-1.5 rounded-lg border text-right text-xs ${inputClass}`} />
                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none ${textSub}`}>%</span>
                          </div>
                        </div>
                      )
                    })}
                    <div className={`text-xs font-bold text-right pt-2 ${Math.abs(carteraEditable.reduce((s, c) => s + c.peso, 0) - 1) > 0.01 ? 'text-red-400' : 'text-emerald-400'}`}>
                      Total: {(carteraEditable.reduce((s, c) => s + c.peso, 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ) : (
                <CarteraDonut cartera={cartera} dark={dark} />
              )}

              <div className="flex gap-3 mt-6">
                {ajustando ? (
                  <>
                    <button onClick={() => setAjustando(false)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${dark ? 'text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700' : 'text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200'}`}>
                      Cancelar
                    </button>
                    <button onClick={restablecerSugerida}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${dark ? 'text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700' : 'text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200'}`}>
                      ↺ Restablecer a la sugerida
                    </button>
                    <button onClick={aceptarCartera} disabled={guardandoCartera}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
                      style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
                      {guardandoCartera ? 'Guardando...' : '✅ Confirmar esta cartera'}
                    </button>
                  </>
                ) : (
                  <button onClick={iniciarAjuste}
                    className="py-2.5 px-5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
                    {perfilInversion.estado === 'aceptada' ? '✏️ Editar cartera aceptada' : '✏️ Ajustar y confirmar cartera →'}
                  </button>
                )}
              </div>
            </div>

            {/* PROYECCIÓN */}
            <div className={`rounded-2xl border p-6 ${card}`}>
              <h2 className={`font-bold text-sm mb-1 ${text}`}>📊 Proyección estimada</h2>
              <p className={`text-xs mb-5 ${textSub}`}>
                Con ${fmt(perfilInversion.capital_inicial)} iniciales
                {perfilInversion.aporte_mensual > 0 ? ` y aportes de $${fmt(perfilInversion.aporte_mensual)}/mes` : ''}, a una tasa estimada de {(info.retornoEsperadoAnual * 100).toFixed(1)}% anual.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-5">
                <div>
                  <p className={`text-xs ${textSub}`}>Aportado en {ultimo.anio} años</p>
                  <p className={`text-lg font-bold ${text}`}>${fmt(ultimo.aportado)}</p>
                </div>
                <div>
                  <p className={`text-xs ${textSub}`}>Ganancia estimada</p>
                  <p className="text-lg font-bold text-emerald-400">+${fmt(ganancia)}</p>
                </div>
                <div>
                  <p className={`text-xs ${textSub}`}>Valor estimado</p>
                  <p className="text-lg font-bold" style={{ color: '#9C27B0' }}>${fmt(ultimo.valor)}</p>
                </div>
              </div>

              <ProyeccionChart serie={serieProyeccion} dark={dark} />

              <p className={`text-[11px] mt-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                ⚠️ Proyección educativa basada en un retorno promedio histórico estimado para este tipo de cartera. No es una garantía de rentabilidad — toda inversión conlleva riesgo, incluyendo la posible pérdida de capital.
              </p>
            </div>

            {/* CTA EJECUCIÓN (próximamente) */}
            <div className={`rounded-2xl border p-6 text-center ${card}`}>
              <p className="text-2xl mb-2">🔒</p>
              <p className={`font-bold text-sm mb-1 ${text}`}>Conectar cuenta de inversión</p>
              <p className={`text-xs mb-4 ${textSub}`}>
                {perfilInversion.estado === 'aceptada'
                  ? 'Tu cartera ya está confirmada y lista. En cuanto conectemos Numia con un bróker, la compra se ejecutará automáticamente con estos porcentajes y podrás ver el valor de tu inversión aquí mismo.'
                  : 'Confirma tu cartera arriba. Estamos trabajando en conectar Numia con un bróker para ejecutar la compra automáticamente y que puedas ver el valor de tu inversión directo desde la app.'}
              </p>
              <button disabled
                className={`px-6 py-2.5 rounded-xl text-sm font-bold cursor-not-allowed ${dark ? 'bg-gray-800 text-gray-500 border border-gray-700' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                Próximamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
