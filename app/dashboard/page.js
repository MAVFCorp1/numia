'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { categoriaInfo } from '@/lib/categorizador'

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

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tema, setTema] = useState('claro')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: perfil }, { data: movs }, { data: pref }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('movimientos').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
        supabase.from('preferencias').select('tema').eq('user_id', user.id).single(),
      ])
      setPerfil(perfil)
      setMovimientos(movs || [])
      if (pref) setTema(pref.tema || 'claro')
      setLoading(false)
    }
    cargar()
  }, [])

  async function toggleTema() {
    const nuevo = tema === 'oscuro' ? 'claro' : 'oscuro'
    setTema(nuevo)
    if (user) await supabase.from('preferencias').upsert({ user_id: user.id, tema: nuevo }, { onConflict: 'user_id' })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
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

  const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto), 0)
  const gastos = movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + parseFloat(m.monto), 0)
  const utilidad = ingresos - gastos
  const salud = Math.min(100, Math.max(0, Math.round((utilidad / Math.max(ingresos, 1)) * 100 + 50)))
  const esEmpresa = perfil?.tipo === 'empresa'

  const catGastos = {}
  const catIngresos = {}
  movimientos.forEach(m => {
    const monto = parseFloat(m.monto)
    if (m.tipo === 'gasto') catGastos[m.categoria] = (catGastos[m.categoria] || 0) + monto
    else catIngresos[m.categoria] = (catIngresos[m.categoria] || 0) + monto
  })
  const topGastos = Object.entries(catGastos).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const topIngresos = Object.entries(catIngresos).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxGas = topGastos[0]?.[1] || 1
  const maxIng = topIngresos[0]?.[1] || 1

  const cuentas = {}
  movimientos.forEach(m => {
    if (!cuentas[m.cuenta]) cuentas[m.cuenta] = { ing: 0, gas: 0 }
    if (m.tipo === 'ingreso') cuentas[m.cuenta].ing += parseFloat(m.monto)
    else cuentas[m.cuenta].gas += parseFloat(m.monto)
  })

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>

      {/* NAVBAR */}
      <header className={`sticky top-0 z-50 border-b ${dark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'} backdrop-blur`}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/Logo Numia.png" alt="Numia" className="h-8 w-auto" />
            <div className={`h-5 w-px ${dark ? 'bg-gray-700' : 'bg-gray-300'}`} />
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${esEmpresa ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
              {esEmpresa ? '🏢 Empresa PYME' : '👤 Persona natural'}
            </span>
            {perfil?.nombre && <span className={`text-sm font-medium ${text}`}>{perfil.nombre}</span>}
          </div>
          <div className="flex items-center gap-2">
            <a href="/dashboard/xmls" className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' }}>
              + XML SRI
            </a>
            <a href="/dashboard/banco" className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              + Extracto banco
            </a>
            {esEmpresa && (
              <a href="/dashboard/ratios" className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                📊 Ratios
              </a>
            )}
            {!esEmpresa && (
              <a href="/dashboard/deducibles" className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                📋 Deducibles
              </a>
            )}
            <a href="/dashboard/sri" className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              🏛️ SRI
            </a>
            <button onClick={toggleTema} className={`p-2 rounded-lg border transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={handleLogout} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${dark ? 'border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* MÉTRICAS PRINCIPALES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total ingresos', valor: ingresos, color: '#10B981', prefix: '+$' },
            { label: 'Total gastos', valor: gastos, color: '#EF4444', prefix: '-$' },
            { label: esEmpresa ? 'Utilidad neta' : 'Ahorro neto', valor: utilidad, color: utilidad >= 0 ? '#10B981' : '#EF4444', prefix: '$' },
            { label: 'Movimientos', valor: movimientos.length, color: '#E91E8C', prefix: '', noDecimal: true },
          ].map((m, i) => (
            <div key={i} className={`rounded-2xl border p-5 ${card}`}>
              <div className={`text-xs mb-2 font-medium ${textSub}`}>{m.label}</div>
              <div className="text-2xl font-black" style={{ color: m.color }}>
                {m.prefix}{m.noDecimal ? m.valor : m.valor.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* SALUD FINANCIERA */}
        <div className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-bold text-sm ${text}`}>💚 Salud Financiera</h2>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${salud >= 70 ? 'bg-emerald-500/20 text-emerald-400' : salud >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
              {salud >= 70 ? 'Buena salud' : salud >= 50 ? 'Puede mejorar' : 'Requiere atención'}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-5xl font-black" style={{ color: salud >= 70 ? '#10B981' : salud >= 50 ? '#F59E0B' : '#EF4444' }}>
              {salud}
            </div>
            <div className="flex-1">
              <div className={`h-3 rounded-full overflow-hidden ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${salud}%`,
                    background: salud >= 70 ? 'linear-gradient(90deg,#10B981,#34D399)' : salud >= 50 ? 'linear-gradient(90deg,#F59E0B,#FBBF24)' : 'linear-gradient(90deg,#EF4444,#F87171)'
                  }}
                />
              </div>
              <div className={`flex justify-between mt-1 text-xs ${textSub}`}>
                <span>0</span><span>50</span><span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* RATIOS RÁPIDOS — solo si hay datos */}
        {movimientos.length > 0 && (
          <div className={`rounded-2xl border p-6 ${card}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className={`font-bold text-sm ${text}`}>📊 Ratios Financieros</h2>
                <p className={`text-xs mt-0.5 ${textSub}`}>Semáforo rápido · calculado desde tus movimientos</p>
              </div>
              {esEmpresa && (
                <a href="/dashboard/ratios"
                  className="text-xs px-4 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' }}>
                  Ver análisis completo →
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {RATIOS_RAPIDOS.map(ratio => {
                const valor = ratio.calcular(ingresos, gastos)
                const color = valor !== null ? ratio.semaforo(valor) : null
                const C = color ? SEMAFORO_COLORES[color] : null
                return (
                  <div key={ratio.id} className={`rounded-xl border p-4 transition-all ${C ? C.bg : dark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{ratio.icono}</span>
                        <span className={`text-xs font-semibold ${text}`}>{ratio.nombre}</span>
                      </div>
                      {C && (
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${C.dot} animate-pulse`} />
                        </div>
                      )}
                    </div>
                    <div className={`text-3xl font-black mb-1 ${C ? C.text : textSub}`}>
                      {valor !== null ? ratio.formato(valor) : '—'}
                    </div>
                    <div className={`text-xs ${textSub}`}>Estándar: {ratio.estandar}</div>
                  </div>
                )
              })}
            </div>
            {!esEmpresa && (
              <p className={`text-xs mt-3 ${textSub}`}>💡 Los ratios completos están disponibles para perfiles de empresa.</p>
            )}
          </div>
        )}

        {/* GRÁFICOS DE TRANSACCIONES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Gastos por categoría */}
          <div className={`rounded-2xl border p-6 ${card}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className={`font-bold text-sm ${text}`}>🔴 Gastos por categoría</h2>
              <a href="/dashboard/banco"
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#E91E8C22,#9C27B022)', border: '1px solid #E91E8C55', color: '#E91E8C' }}>
                Ver todos →
              </a>
            </div>
            {topGastos.length === 0 ? (
              <div className={`text-sm text-center py-8 ${textSub}`}>Sin gastos registrados</div>
            ) : (
              <div className="space-y-3">
                {topGastos.map(([cat, val]) => {
                  const info = categoriaInfo[cat] || { label: cat, emoji: '📦', color: '#E91E8C' }
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-base w-6">{info.emoji}</span>
                      <div className={`text-xs w-28 truncate ${text}`}>{info.label || cat}</div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: dark ? '#1F2937' : '#F3F4F6' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(val / maxGas) * 100}%`, background: info.color || '#EF4444' }} />
                      </div>
                      <div className={`text-xs font-semibold w-20 text-right`} style={{ color: info.color || '#EF4444' }}>
                        ${val.toFixed(2)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ingresos por categoría */}
          <div className={`rounded-2xl border p-6 ${card}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className={`font-bold text-sm ${text}`}>🟢 Ingresos por categoría</h2>
              <a href="/dashboard/banco"
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#10B98122,#34D39922)', border: '1px solid #10B98155', color: '#10B981' }}>
                Ver todos →
              </a>
            </div>
            {topIngresos.length === 0 ? (
              <div className={`text-sm text-center py-8 ${textSub}`}>Sin ingresos registrados</div>
            ) : (
              <div className="space-y-3">
                {topIngresos.map(([cat, val]) => {
                  const info = categoriaInfo[cat] || { label: cat, emoji: '📦', color: '#10B981' }
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-base w-6">{info.emoji}</span>
                      <div className={`text-xs w-28 truncate ${text}`}>{info.label || cat}</div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: dark ? '#1F2937' : '#F3F4F6' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(val / maxIng) * 100}%`, background: '#10B981' }} />
                      </div>
                      <div className="text-xs font-semibold w-20 text-right text-emerald-500">
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
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className={`px-6 py-4 flex items-center justify-between border-b ${border}`}>
            <h2 className={`font-bold text-sm ${text}`}>🕐 Últimos movimientos</h2>
            <a href="/dashboard/banco"
              className="text-xs px-4 py-1.5 rounded-lg font-semibold transition-all hover:scale-105 text-white"
              style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' }}>
              Ver todos →
            </a>
          </div>
          {movimientos.length === 0 ? (
            <div className={`text-sm text-center py-10 ${textSub}`}>
              Sin movimientos. Sube un extracto bancario o XML del SRI.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  {['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto'].map(h => (
                    <th key={h} className={`text-left px-5 py-3 text-xs font-medium ${textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientos.slice(0, 8).map((m, i) => {
                  const info = categoriaInfo[m.categoria] || { label: m.categoria, emoji: '📦' }
                  return (
                    <tr key={i} className={`border-t ${border} transition-colors ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                      <td className={`px-5 py-3 text-xs ${textSub}`}>{m.fecha}</td>
                      <td className={`px-5 py-3 text-xs ${text} max-w-xs truncate`}>{m.descripcion}</td>
                      <td className="px-5 py-3 text-xs">
                        <span className={`px-2 py-1 rounded-full text-xs ${dark ? 'bg-gray-800' : 'bg-gray-100'} ${text}`}>
                          {info.emoji} {info.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.tipo === 'ingreso' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className={`px-5 py-3 text-right text-xs font-bold ${m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
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
          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <div className={`px-6 py-4 border-b ${border}`}>
              <h2 className={`font-bold text-sm ${text}`}>🏦 Resumen por cuenta</h2>
            </div>
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  {['Cuenta', 'Ingresos', 'Gastos', 'Saldo'].map(h => (
                    <th key={h} className={`text-left px-5 py-3 text-xs font-medium ${textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(cuentas).map(([cuenta, vals]) => (
                  <tr key={cuenta} className={`border-t ${border} ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className={`px-5 py-3 text-xs font-medium ${text} capitalize`}>{cuenta.replace(/-/g, ' ')}</td>
                    <td className="px-5 py-3 text-xs font-semibold text-emerald-400">+${vals.ing.toFixed(2)}</td>
                    <td className="px-5 py-3 text-xs font-semibold text-red-400">-${vals.gas.toFixed(2)}</td>
                    <td className={`px-5 py-3 text-xs font-bold ${vals.ing - vals.gas >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${(vals.ing - vals.gas).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}