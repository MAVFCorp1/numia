'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { categorizarMovimiento, categoriaInfo, todasLasCategorias } from '@/lib/categorizador'

export default function Banco() {
  const [movimientos, setMovimientos] = useState([])
  const [reglas, setReglas] = useState([])
  const [presupuestos, setPresupuestos] = useState({})
  const [tema, setTema] = useState('claro')
  const [loading, setLoading] = useState(false)
  const [cargandoPagina, setCargandoPagina] = useState(true)
  const [banco, setBanco] = useState('banco-pichincha')
  const [editando, setEditando] = useState(null)
  const [editandoRegla, setEditandoRegla] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [mensaje, setMensaje] = useState('')
  const [vistaActiva, setVistaActiva] = useState('movimientos')
  const [categoriaFiltro, setCategoriaFiltro] = useState(null)
  const [nuevaMov, setNuevaMov] = useState({ fecha: '', descripcion: '', monto: '', tipo: 'gasto', categoria: 'otros' })
  const [editandoPresupuesto, setEditandoPresupuesto] = useState(null)
  const porPagina = 30
  const supabase = createClient()

  const dark = tema === 'oscuro'
  const bg = dark ? 'bg-gray-950' : 'bg-gray-50'
  const card = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
  const text = dark ? 'text-gray-100' : 'text-gray-900'
  const textSub = dark ? 'text-gray-400' : 'text-gray-500'
  const border = dark ? 'border-gray-800' : 'border-gray-100'
  const inputCls = dark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
  const rowHover = dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
  const theadBg = dark ? 'bg-gray-800' : 'bg-gray-50'

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: movs }, { data: regs }, { data: pref }, { data: pres }] = await Promise.all([
        supabase.from('movimientos').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
        supabase.from('reglas_categoria').select('*').eq('user_id', user.id),
        supabase.from('preferencias').select('*').eq('user_id', user.id).single(),
        supabase.from('presupuestos').select('*').eq('user_id', user.id)
      ])
      setMovimientos(movs || [])
      setReglas(regs || [])
      if (pref) setTema(pref.tema || 'claro')
      const presMap = {}
      if (pres) pres.forEach(p => { presMap[p.categoria] = p.monto })
      setPresupuestos(presMap)
      setCargandoPagina(false)
    }
    cargar()
  }, [])

  async function toggleTema() {
    const nuevoTema = dark ? 'claro' : 'oscuro'
    setTema(nuevoTema)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('preferencias').upsert({ user_id: user.id, tema: nuevoTema })
  }

  async function guardarPresupuesto(categoria, monto) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('presupuestos').upsert({ user_id: user.id, categoria, monto: parseFloat(monto) })
    setPresupuestos(prev => ({ ...prev, [categoria]: parseFloat(monto) }))
    setEditandoPresupuesto(null)
    setMensaje(`✅ Presupuesto de ${categoriaInfo[categoria]?.label} guardado`)
  }

  function aplicarReglas(descripcion, tipo, reglasActuales) {
    const d = descripcion.toLowerCase()
    for (const regla of reglasActuales) {
      if (d.includes(regla.contiene.toLowerCase())) return regla.categoria
    }
    return categorizarMovimiento(descripcion, tipo)
  }

  async function handleFile(e) {
    setLoading(true)
    setMensaje('')
    setPagina(1)
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    const { data: { user } } = await supabase.auth.getUser()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/html')
    const rows = doc.querySelectorAll('tr')
    const meses = { 'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12' }
    let nuevos = 0, duplicados = 0

    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')].map(td => td.textContent.trim())
      if (cells.length >= 7 && cells[0] && cells[0].includes('-')) {
        const partes = cells[0].split('-')
        if (partes.length === 3) {
          const dia = partes[0].padStart(2, '0')
          const mes = meses[partes[1].toLowerCase().replace('.', '')] || '01'
          const fecha = `2026-${mes}-${dia}`
          const debito = parseFloat(cells[4]) || 0
          const credito = parseFloat(cells[5]) || 0
          const desc = cells[3]
          const monto = credito > 0 ? credito : debito
          const saldo = cells[6] || ''
          if (debito > 0 || credito > 0) {
            const { data: existentes } = await supabase.from('movimientos').select('id').eq('user_id', user.id).eq('fecha', fecha).eq('descripcion', desc).eq('monto', monto).eq('nota', saldo)
            if (existentes && existentes.length > 0) { duplicados++; continue }
            const tipo = credito > 0 ? 'ingreso' : 'gasto'
            const categoria = aplicarReglas(desc, tipo, reglas)
            const { data } = await supabase.from('movimientos').insert({ user_id: user.id, fecha, descripcion: desc, monto, tipo, cuenta: banco, categoria, nota: saldo }).select().single()
            if (data) { setMovimientos(prev => [data, ...prev]); nuevos++ }
          }
        }
      }
    }
    setMensaje(`✅ ${nuevos} nuevos · ${duplicados} duplicados ignorados`)
    setLoading(false)
    e.target.value = ''
  }

  async function cambiarCategoria(id, nuevaCategoria, descripcion) {
    await supabase.from('movimientos').update({ categoria: nuevaCategoria }).eq('id', id)
    setMovimientos(prev => prev.map(m => m.id === id ? { ...m, categoria: nuevaCategoria } : m))
    const palabraClave = descripcion.split(' ').slice(0, 3).join(' ')
    const crearRegla = confirm(`¿Guardar regla?\n\nSi la descripción contiene "${palabraClave}" → "${categoriaInfo[nuevaCategoria]?.label}"`)
    if (crearRegla) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: regla } = await supabase.from('reglas_categoria').insert({ user_id: user.id, contiene: palabraClave, categoria: nuevaCategoria }).select().single()
      if (regla) { setReglas(prev => [...prev, regla]); setMensaje('✅ Regla guardada') }
    }
    setEditando(null)
  }

  async function actualizarRegla(id, campo, valor) {
    await supabase.from('reglas_categoria').update({ [campo]: valor }).eq('id', id)
    setReglas(prev => prev.map(r => r.id === id ? { ...r, [campo]: valor } : r))
  }

  async function eliminarMovimiento(id) {
    if (!confirm('¿Eliminar este movimiento?')) return
    await supabase.from('movimientos').delete().eq('id', id)
    setMovimientos(prev => prev.filter(m => m.id !== id))
  }

  async function eliminarRegla(id) {
    await supabase.from('reglas_categoria').delete().eq('id', id)
    setReglas(prev => prev.filter(r => r.id !== id))
  }

  async function limpiarDuplicados() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: todos } = await supabase.from('movimientos').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    const vistos = {}
    const aEliminar = []
    todos.forEach(m => {
      const clave = `${m.fecha}-${m.descripcion}-${m.monto}-${m.tipo}-${m.nota}`
      if (vistos[clave]) {
        const anterior = vistos[clave]
        if (anterior.categoria === 'otros' && m.categoria !== 'otros') { aEliminar.push(anterior.id); vistos[clave] = m }
        else aEliminar.push(m.id)
      } else vistos[clave] = m
    })
    if (aEliminar.length === 0) { setMensaje('✅ No hay duplicados'); return }
    for (const id of aEliminar) await supabase.from('movimientos').delete().eq('id', id)
    setMovimientos(prev => prev.filter(m => !aEliminar.includes(m.id)))
    setMensaje(`✅ ${aEliminar.length} duplicados eliminados`)
  }

  async function agregarManual() {
    if (!nuevaMov.fecha || !nuevaMov.descripcion || !nuevaMov.monto) { setMensaje('Completa todos los campos'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('movimientos').insert({
      user_id: user.id, fecha: nuevaMov.fecha, descripcion: nuevaMov.descripcion,
      monto: parseFloat(nuevaMov.monto), tipo: nuevaMov.tipo, cuenta: banco,
      categoria: nuevaMov.categoria, nota: ''
    }).select().single()
    if (data) { setMovimientos(prev => [data, ...prev]); setNuevaMov({ fecha: '', descripcion: '', monto: '', tipo: 'gasto', categoria: 'otros' }); setMensaje('✅ Movimiento agregado') }
  }

  const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto), 0)
  const gastosReales = movimientos.filter(m => m.tipo === 'gasto' && m.categoria !== 'transferencia-enviada' && m.categoria !== 'comisiones-banco').reduce((s, m) => s + parseFloat(m.monto), 0)
  const transferenciasEnviadas = movimientos.filter(m => m.categoria === 'transferencia-enviada').reduce((s, m) => s + parseFloat(m.monto), 0)
  const transferenciasRecibidas = movimientos.filter(m => m.categoria === 'transferencia-recibida').reduce((s, m) => s + parseFloat(m.monto), 0)
  const comisionesBanco = movimientos.filter(m => m.categoria === 'comisiones-banco').reduce((s, m) => s + parseFloat(m.monto), 0)
  const totalEgresos = gastosReales + transferenciasEnviadas + comisionesBanco

  const porCategoria = {}
  movimientos.forEach(m => { porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + parseFloat(m.monto) })
  const topCategorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])
  const maxCat = topCategorias[0]?.[1] || 1

  const mesesUnicos = [...new Set(movimientos.map(m => m.fecha?.slice(0, 7)))].filter(Boolean).sort()
  const numMeses = Math.max(mesesUnicos.length, 1)
  const proyecciones = {}
  Object.entries(porCategoria).forEach(([cat, total]) => {
    const promedio = total / numMeses
    const presupuesto = presupuestos[cat] || promedio * 1.1
    const diferencia = presupuesto - promedio
    const alerta = promedio > presupuesto
    proyecciones[cat] = { promedio, presupuesto, diferencia, alerta }
  })

  const totalPaginas = Math.ceil(movimientos.length / porPagina)
  const movsPagina = movimientos.slice((pagina - 1) * porPagina, pagina * porPagina)

  if (cargandoPagina) return (
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
      <div className={`${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10`}>
        <div className="flex items-center gap-3">
          <a href="/dashboard" className={`text-sm ${textSub} hover:text-pink-500 transition-colors`}>← Dashboard</a>
          <div className={`h-4 w-px ${dark ? 'bg-gray-700' : 'bg-gray-300'}`} />
          <img src="/Logo Numia.png" alt="Numia" className="h-7 w-auto" />
          <span className={`text-sm font-bold ${text}`} style={{ letterSpacing: '0.1em' }}>NUMIA</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>Extracto bancario</span>
        </div>
        <div className="flex items-center gap-2">
          <select value={banco} onChange={e => setBanco(e.target.value)} className={`text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:border-pink-500 ${inputCls}`}>
            <option value="banco-pichincha">Banco Pichincha</option>
            <option value="banco-produbanco">Produbanco</option>
            <option value="banco-guayaquil">Banco Guayaquil</option>
            <option value="banco-pacifico">Banco del Pacífico</option>
            <option value="banco-internacional">Banco Internacional</option>
          </select>
          <button onClick={limpiarDuplicados} className={`text-xs px-3 py-1.5 border rounded-lg transition-colors ${dark ? 'border-yellow-800 text-yellow-500 hover:bg-yellow-900' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}`}>🧹 Limpiar</button>
          <button onClick={toggleTema} className={`text-xs px-3 py-1.5 border rounded-lg transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {dark ? '☀️' : '🌙'}
          </button>
          <label className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' }}>
            {loading ? '⏳ Procesando...' : '+ Subir extracto'}
            <input type="file" accept=".xls,.xlsx,.html,.htm" onChange={handleFile} className="hidden" />
          </label>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {mensaje && (
          <div className="text-sm px-4 py-3 rounded-lg mb-4 border" style={{ background: dark ? '#1a0a12' : '#fdf2f8', borderColor: '#E91E8C', color: '#E91E8C' }}>
            {mensaje}
          </div>
        )}

        {/* MÉTRICAS */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Ingresos totales', valor: ingresos, color: '#10B981', sub: 'créditos' },
            { label: 'Total egresos', valor: totalEgresos, color: '#EF4444', sub: 'débitos' },
            { label: 'Gastos reales', valor: gastosReales, color: '#F97316', sub: 'consumo directo' },
            { label: '📥 Trans. recibidas', valor: transferenciasRecibidas, color: '#3B82F6', sub: 'pagos recibidos' },
            { label: '📤 Trans. enviadas', valor: transferenciasEnviadas, color: '#F59E0B', sub: 'pagos realizados' },
          ].map((m, i) => (
            <div key={i} className={`rounded-xl border p-4 ${card}`}>
              <div className={`text-xs mb-1 ${textSub}`}>{m.label}</div>
              <div className="text-xl font-bold" style={{ color: m.color }}>${m.valor.toFixed(2)}</div>
              <div className={`text-xs mt-1 ${textSub}`}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* TABS — sin gráficos ni proyecciones */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'movimientos', label: '📋 Movimientos' },
            { id: 'categorias', label: '📊 Categorías' },
            { id: 'presupuestos', label: '🎯 Presupuestos' },
            { id: 'agregar', label: '➕ Agregar' },
            { id: 'reglas', label: '🧠 Reglas' },
          ].map(v => (
            <button key={v.id} onClick={() => { setVistaActiva(v.id); setCategoriaFiltro(null) }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${vistaActiva === v.id ? 'text-white shadow-lg' : 'border ' + (dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}`}
              style={vistaActiva === v.id ? { background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' } : {}}>
              {v.label}
            </button>
          ))}
        </div>

        {/* MOVIMIENTOS */}
        {vistaActiva === 'movimientos' && (
          <div className={`rounded-xl border overflow-hidden ${card}`}>
            <div className={`px-4 py-3 border-b ${border} flex items-center justify-between`}>
              <div className={`text-sm font-semibold ${text}`}>Todos los movimientos ({movimientos.length})</div>
              <div className={`text-xs ${textSub}`}>✏️ clic en categoría para editar · ✕ eliminar</div>
            </div>
            <table className="w-full text-sm">
              <thead className={theadBg}>
                <tr>
                  {['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto', ''].map(h => (
                    <th key={h} className={`text-left px-4 py-3 text-xs font-medium ${textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movsPagina.map((m) => {
                  const info = categoriaInfo[m.categoria] || { label: m.categoria, emoji: '📦' }
                  return (
                    <tr key={m.id} className={`border-t ${border} ${rowHover} transition-colors`}>
                      <td className={`px-4 py-3 text-xs ${textSub}`}>{m.fecha}</td>
                      <td className={`px-4 py-3 text-xs ${text} max-w-xs truncate`}>{m.descripcion}</td>
                      <td className="px-4 py-3">
                        {editando === m.id ? (
                          <select autoFocus onBlur={() => setEditando(null)}
                            onChange={e => cambiarCategoria(m.id, e.target.value, m.descripcion)}
                            defaultValue={m.categoria}
                            className={`text-xs border rounded px-1 py-0.5 focus:outline-none ${inputCls}`}>
                            {todasLasCategorias.map(cat => {
                              const ci = categoriaInfo[cat]
                              return <option key={cat} value={cat}>{ci?.emoji} {ci?.label}</option>
                            })}
                          </select>
                        ) : (
                          <span onClick={() => setEditando(m.id)}
                            className={`text-xs cursor-pointer px-2 py-1 rounded-full border border-transparent transition-all ${dark ? 'hover:bg-pink-900 hover:text-pink-300' : 'hover:bg-pink-50 hover:text-pink-700'}`}>
                            {info.emoji} {info.label} ✏️
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.tipo === 'ingreso' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-xs ${m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${parseFloat(m.monto).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => eliminarMovimiento(m.id)} className={`text-xs transition-colors ${dark ? 'text-gray-600 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className={`px-4 py-3 flex items-center justify-between border-t ${border}`}>
              <div className={`text-xs ${textSub}`}>
                {Math.min((pagina - 1) * porPagina + 1, movimientos.length)}–{Math.min(pagina * porPagina, movimientos.length)} de {movimientos.length}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  className={`text-xs px-3 py-1.5 border rounded-lg disabled:opacity-30 ${dark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>← Ant</button>
                <span className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' }}>{pagina}/{totalPaginas || 1}</span>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}
                  className={`text-xs px-3 py-1.5 border rounded-lg disabled:opacity-30 ${dark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>Sig →</button>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORÍAS */}
        {vistaActiva === 'categorias' && (
          <div>
            {categoriaFiltro && (
              <div className={`rounded-xl border overflow-hidden mb-4 ${card}`}>
                <div className={`px-4 py-3 border-b ${border} flex items-center justify-between`}>
                  <div className={`text-sm font-semibold ${text}`}>
                    {categoriaInfo[categoriaFiltro]?.emoji} {categoriaInfo[categoriaFiltro]?.label} — {movimientos.filter(m => m.categoria === categoriaFiltro).length} movimientos
                  </div>
                  <button onClick={() => setCategoriaFiltro(null)} className={`text-xs px-3 py-1 border rounded-lg ${dark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>✕ Ver todas</button>
                </div>
                <table className="w-full text-sm">
                  <thead className={theadBg}>
                    <tr>
                      {['Fecha', 'Descripción', 'Categoría', 'Monto'].map(h => (
                        <th key={h} className={`text-left px-4 py-3 text-xs ${textSub}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.filter(m => m.categoria === categoriaFiltro).map((m, i) => (
                      <tr key={i} className={`border-t ${border} ${rowHover}`}>
                        <td className={`px-4 py-3 text-xs ${textSub}`}>{m.fecha}</td>
                        <td className={`px-4 py-3 text-xs ${text} truncate max-w-sm`}>{m.descripcion}</td>
                        <td className="px-4 py-3">
                          {editando === m.id ? (
                            <select autoFocus onBlur={() => setEditando(null)}
                              onChange={e => cambiarCategoria(m.id, e.target.value, m.descripcion)}
                              defaultValue={m.categoria}
                              className={`text-xs border rounded px-1 py-0.5 focus:outline-none ${inputCls}`}>
                              {todasLasCategorias.map(cat => {
                                const ci = categoriaInfo[cat]
                                return <option key={cat} value={cat}>{ci?.emoji} {ci?.label}</option>
                              })}
                            </select>
                          ) : (
                            <span onClick={() => setEditando(m.id)}
                              className={`text-xs cursor-pointer px-2 py-1 rounded-full border border-transparent transition-all ${dark ? 'hover:bg-pink-900 hover:text-pink-300' : 'hover:bg-pink-50 hover:text-pink-700'}`}>
                              {categoriaInfo[m.categoria]?.emoji} {categoriaInfo[m.categoria]?.label} ✏️
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right text-xs font-semibold ${m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${parseFloat(m.monto).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className={`px-4 py-3 border-t ${border} flex justify-between`}>
                  <div className={`text-xs ${textSub}`}>Total</div>
                  <div className={`text-xs font-bold ${text}`}>
                    ${movimientos.filter(m => m.categoria === categoriaFiltro).reduce((s, m) => s + parseFloat(m.monto), 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
            <div className={`rounded-xl border p-5 ${card}`}>
              <div className={`text-sm font-semibold ${text} mb-1`}>Por categoría</div>
              <div className={`text-xs ${textSub} mb-4`}>Haz clic para ver los movimientos de esa categoría</div>
              {topCategorias.map(([cat, val]) => {
                const info = categoriaInfo[cat] || { label: cat, emoji: '📦', color: '#E91E8C' }
                const presup = presupuestos[cat]
                const alerta = presup && val > presup
                return (
                  <div key={cat} onClick={() => setCategoriaFiltro(cat)}
                    className={`flex items-center gap-3 mb-3 cursor-pointer rounded-lg px-2 py-2 transition-all ${categoriaFiltro === cat ? (dark ? 'bg-pink-950' : 'bg-pink-50') : (dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50')}`}>
                    <div className="text-lg w-8">{info.emoji}</div>
                    <div className={`text-xs w-32 truncate ${text}`}>{info.label}</div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: dark ? '#1F2937' : '#F3F4F6' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${(val / maxCat) * 100}%`, background: alerta ? '#EF4444' : info.color }} />
                    </div>
                    <div className={`text-xs font-semibold w-20 text-right ${alerta ? 'text-red-400' : text}`}>${val.toFixed(2)}</div>
                    {alerta && <span className="text-xs text-red-400">⚠️</span>}
                    <div className={`text-xs w-6 text-right ${textSub}`}>{movimientos.filter(m => m.categoria === cat).length}x</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PRESUPUESTOS */}
        {vistaActiva === 'presupuestos' && (
          <div className={`rounded-xl border p-5 ${card}`}>
            <div className={`text-sm font-semibold ${text} mb-1`}>🎯 Presupuestos por categoría</div>
            <div className={`text-xs ${textSub} mb-4`}>Basado en {numMeses} mes(es) de datos. Haz clic en el monto para editar.</div>
            <div className="space-y-3">
              {Object.entries(proyecciones).map(([cat, p]) => {
                const info = categoriaInfo[cat] || { label: cat, emoji: '📦', color: '#E91E8C' }
                const pct = Math.min((p.promedio / p.presupuesto) * 100, 100)
                return (
                  <div key={cat} className={`rounded-lg p-3 border ${dark ? 'border-gray-800 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.emoji}</span>
                        <span className={`text-sm font-medium ${text}`}>{info.label}</span>
                        {p.alerta && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">⚠️ Supera presupuesto</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-xs ${textSub}`}>Promedio: <span className={`font-semibold ${text}`}>${p.promedio.toFixed(2)}/mes</span></div>
                        <div className={`text-xs ${textSub}`}>
                          Presupuesto:{' '}
                          {editandoPresupuesto === cat ? (
                            <input type="number" defaultValue={p.presupuesto.toFixed(2)} autoFocus
                              onBlur={e => guardarPresupuesto(cat, e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && guardarPresupuesto(cat, e.target.value)}
                              className={`text-xs border rounded px-1 py-0.5 w-20 focus:outline-none ${inputCls}`} />
                          ) : (
                            <span onClick={() => setEditandoPresupuesto(cat)} className="font-semibold cursor-pointer text-pink-400 hover:text-pink-300">
                              ${p.presupuesto.toFixed(2)} ✏️
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: dark ? '#1F2937' : '#E5E7EB' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.alerta ? '#EF4444' : info.color }} />
                    </div>
                    <div className={`flex justify-between mt-1 text-xs ${textSub}`}>
                      <span>{pct.toFixed(0)}% usado</span>
                      <span style={{ color: p.alerta ? '#EF4444' : '#10B981' }}>
                        {p.alerta ? `$${Math.abs(p.diferencia).toFixed(2)} sobre el límite` : `$${p.diferencia.toFixed(2)} disponible`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* AGREGAR */}
        {vistaActiva === 'agregar' && (
          <div className={`rounded-xl border p-6 ${card}`}>
            <div className={`text-sm font-semibold ${text} mb-4`}>Agregar movimiento manual</div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`text-xs mb-1 block ${textSub}`}>Fecha</label>
                <input type="date" value={nuevaMov.fecha} onChange={e => setNuevaMov(p => ({ ...p, fecha: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${textSub}`}>Monto ($)</label>
                <input type="number" value={nuevaMov.monto} onChange={e => setNuevaMov(p => ({ ...p, monto: e.target.value }))}
                  placeholder="0.00" className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 ${inputCls}`} />
              </div>
            </div>
            <div className="mb-4">
              <label className={`text-xs mb-1 block ${textSub}`}>Descripción</label>
              <input type="text" value={nuevaMov.descripcion} onChange={e => setNuevaMov(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Ej: Pago arriendo oficina"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 ${inputCls}`} />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className={`text-xs mb-1 block ${textSub}`}>Tipo</label>
                <select value={nuevaMov.tipo} onChange={e => setNuevaMov(p => ({ ...p, tipo: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 ${inputCls}`}>
                  <option value="gasto">Gasto</option>
                  <option value="ingreso">Ingreso</option>
                </select>
              </div>
              <div>
                <label className={`text-xs mb-1 block ${textSub}`}>Categoría</label>
                <select value={nuevaMov.categoria} onChange={e => setNuevaMov(p => ({ ...p, categoria: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 ${inputCls}`}>
                  {todasLasCategorias.map(cat => {
                    const ci = categoriaInfo[cat]
                    return <option key={cat} value={cat}>{ci?.emoji} {ci?.label}</option>
                  })}
                </select>
              </div>
            </div>
            <button onClick={agregarManual}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' }}>
              Agregar movimiento
            </button>
          </div>
        )}

        {/* REGLAS */}
        {vistaActiva === 'reglas' && (
          <div className={`rounded-xl border p-5 ${card}`}>
            <div className={`text-sm font-semibold ${text} mb-1`}>🧠 Reglas de categorización</div>
            <div className={`text-xs ${textSub} mb-4`}>Numia aplica estas reglas automáticamente al importar.</div>
            {reglas.length === 0 && (
              <div className={`text-sm ${textSub} py-6 text-center`}>
                Sin reglas aún. Cambia la categoría de un movimiento y Numia te preguntará si quieres guardar la regla.
              </div>
            )}
            {reglas.map(r => {
              const info = categoriaInfo[r.categoria]
              return (
                <div key={r.id} className={`flex items-center justify-between py-3 border-b ${border} last:border-0`}>
                  <div className="flex-1">
                    <div className={`text-sm ${text} flex items-center gap-2`}>
                      Si contiene{' '}
                      {editandoRegla === r.id ? (
                        <input type="text" defaultValue={r.contiene} autoFocus
                          onBlur={e => { actualizarRegla(r.id, 'contiene', e.target.value); setEditandoRegla(null) }}
                          onKeyDown={e => e.key === 'Enter' && (actualizarRegla(r.id, 'contiene', e.target.value), setEditandoRegla(null))}
                          className={`text-xs border rounded px-2 py-0.5 focus:outline-none w-40 ${inputCls}`} />
                      ) : (
                        <span onClick={() => setEditandoRegla(r.id)} className="font-semibold cursor-pointer text-pink-400 hover:text-pink-300">
                          "{r.contiene}" ✏️
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${textSub} mt-0.5 flex items-center gap-2`}>
                      → {info?.emoji}{' '}
                      <select defaultValue={r.categoria}
                        onChange={e => actualizarRegla(r.id, 'categoria', e.target.value)}
                        className={`text-xs border rounded px-1 py-0.5 focus:outline-none ${inputCls}`}>
                        {todasLasCategorias.map(cat => {
                          const ci = categoriaInfo[cat]
                          return <option key={cat} value={cat}>{ci?.emoji} {ci?.label}</option>
                        })}
                      </select>
                    </div>
                  </div>
                  <button onClick={() => eliminarRegla(r.id)} className={`text-xs px-2 py-1 ml-3 transition-colors ${dark ? 'text-gray-600 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}>✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}