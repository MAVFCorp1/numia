'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase'
import { categorizarMovimiento, categoriaInfo, todasLasCategorias } from '@/lib/categorizador'

// ---------- Gráfico de pastel por categoría (SVG a mano, clickeable) ----------
function PieChart({ datos, dark, categoriaSeleccionada, onSelect }) {
  const [hoverCat, setHoverCat] = useState(null)
  const total = datos.reduce((s, [, v]) => s + v, 0) || 1
  const R = 62, C = 2 * Math.PI * R
  const activa = hoverCat || categoriaSeleccionada

  const segmentos = datos.reduce((acc, [cat, val]) => {
    const previo = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].frac : 0
    acc.push({ cat, val, frac: val / total, offset: previo })
    return acc
  }, [])

  const infoActiva = activa ? (categoriaInfo[activa] || { label: activa, emoji: '📦' }) : null
  const valorActivo = activa ? (datos.find(([c]) => c === activa)?.[1] || 0) : 0

  return (
    <div className="flex items-center gap-8 flex-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        <g transform="rotate(-90 80 80)">
          <circle cx="80" cy="80" r={R} fill="none" stroke={dark ? '#1F2937' : '#F3F4F6'} strokeWidth="26" />
          {segmentos.map(({ cat, val, frac, offset }, i) => {
            const info = categoriaInfo[cat] || { label: cat, emoji: '📦', color: '#9CA3AF' }
            const dash = frac * C
            const atenuada = activa && activa !== cat
            return (
              <circle key={cat} cx="80" cy="80" r={R} fill="none" stroke={info.color || '#9CA3AF'}
                strokeWidth={activa === cat ? 30 : 26}
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset * C}
                opacity={atenuada ? 0.35 : 1}
                className="cursor-pointer"
                onMouseEnter={() => setHoverCat(cat)}
                onMouseLeave={() => setHoverCat(null)}
                onClick={() => onSelect?.(cat)}
                style={{ transition: `stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 0.05}s, stroke-width 0.15s ease, opacity 0.15s ease` }}>
                <title>{info.emoji} {info.label}: ${val.toFixed(2)} ({(frac * 100).toFixed(0)}%)</title>
              </circle>
            )
          })}
        </g>
        <circle cx="80" cy="80" r="38" fill={dark ? '#111827' : '#ffffff'} className="pointer-events-none" />
        {infoActiva ? (
          <>
            <text x="80" y="74" textAnchor="middle" className="text-[15px]">{infoActiva.emoji}</text>
            <text x="80" y="89" textAnchor="middle" className="text-[9px] font-bold" fill={dark ? '#F3F4F6' : '#111827'}>${valorActivo.toFixed(0)}</text>
            <text x="80" y="100" textAnchor="middle" className="text-[7px]" fill={dark ? '#9CA3AF' : '#6B7280'}>{((valorActivo / total) * 100).toFixed(0)}% · {infoActiva.label}</text>
          </>
        ) : (
          <>
            <text x="80" y="76" textAnchor="middle" className="text-[11px] font-bold" fill={dark ? '#F3F4F6' : '#111827'}>${total.toFixed(0)}</text>
            <text x="80" y="90" textAnchor="middle" className="text-[8px]" fill={dark ? '#9CA3AF' : '#6B7280'}>total</text>
          </>
        )}
      </svg>
      <div className="space-y-2 min-w-[160px]">
        {datos.slice(0, 8).map(([cat, val]) => {
          const info = categoriaInfo[cat] || { label: cat, emoji: '📦', color: '#9CA3AF' }
          const seleccionada = categoriaSeleccionada === cat
          return (
            <div key={cat} onClick={() => onSelect?.(cat)}
              onMouseEnter={() => setHoverCat(cat)} onMouseLeave={() => setHoverCat(null)}
              className={`flex items-center gap-2 text-xs cursor-pointer rounded-md px-1.5 py-1 -mx-1.5 transition-colors ${seleccionada ? (dark ? 'bg-pink-950' : 'bg-pink-50') : (dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50')}`}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: info.color || '#9CA3AF' }} />
              <span className={`truncate ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{info.emoji} {info.label}</span>
              <span className={`ml-auto font-semibold ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{((val / total) * 100).toFixed(0)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Ícono de ayuda con tooltip al pasar el cursor (CSS puro, sin librería) ----------
function InfoTooltip({ texto, dark }) {
  return (
    <span className="relative inline-flex group/tooltip ml-1.5 align-middle">
      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold cursor-help select-none ${dark ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
        i
      </span>
      <span className={`pointer-events-none invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 text-[11px] font-normal leading-relaxed px-3 py-2.5 rounded-lg shadow-2xl ${dark ? 'bg-gray-800 text-gray-200 border border-gray-700' : 'bg-white text-gray-700 border border-gray-200'}`}>
        {texto}
      </span>
    </span>
  )
}

function BancoContenido() {
  const searchParams = useSearchParams()
  const tipoParam = searchParams.get('tipo')
  const [movimientos, setMovimientos] = useState([])
  const [reglas, setReglas] = useState([])
  const [archivos, setArchivos] = useState([])
  const [presupuestos, setPresupuestos] = useState({})
  const [filtroMes, setFiltroMes] = useState('todos')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroCuenta, setFiltroCuenta] = useState('todos')
  const [tema, setTema] = useState('claro')
  const [loading, setLoading] = useState(false)
  const [cargandoPagina, setCargandoPagina] = useState(true)
  const [banco, setBanco] = useState('banco-pichincha')
  const [editando, setEditando] = useState(null)
  const [editandoRegla, setEditandoRegla] = useState(null)
  const [mostrarNuevaRegla, setMostrarNuevaRegla] = useState(false)
  const [nuevaRegla, setNuevaRegla] = useState({ contiene: '', categoria: 'otros' })
  const [pagina, setPagina] = useState(1)
  const [mensaje, setMensaje] = useState('')
  const [vistaActiva, setVistaActiva] = useState(tipoParam === 'ingreso' || tipoParam === 'gasto' ? 'categorias' : 'movimientos')
  const [tipoFiltro, setTipoFiltro] = useState(tipoParam === 'ingreso' || tipoParam === 'gasto' ? tipoParam : 'todos')
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
      const [{ data: movs }, { data: regs }, { data: pref }, { data: pres }, { data: archs }] = await Promise.all([
        supabase.from('movimientos').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
        supabase.from('reglas_categoria').select('*').eq('user_id', user.id),
        supabase.from('preferencias').select('*').eq('user_id', user.id).single(),
        supabase.from('presupuestos').select('*').eq('user_id', user.id),
        supabase.from('extractos_subidos').select('*').eq('user_id', user.id).order('fecha_carga', { ascending: false })
      ])
      setMovimientos(movs || [])
      setReglas(regs || [])
      setArchivos(archs || [])
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

  // El extracto solo trae día y mes abreviado (sin año). Inferimos el año asumiendo que la
  // fecha no puede ser futura: si con el año actual cae en el futuro, es que pertenece al año anterior
  // (cubre extractos de cualquier mes, incluido el cruce de diciembre-enero).
  function inferirFecha(dia, mesNum) {
    const hoy = new Date()
    const anioActual = hoy.getFullYear()
    const candidata = new Date(anioActual, parseInt(mesNum, 10) - 1, parseInt(dia, 10))
    const margenMs = 3 * 24 * 60 * 60 * 1000
    const anio = (candidata - hoy > margenMs) ? anioActual - 1 : anioActual
    return `${anio}-${mesNum}-${dia}`
  }

  function leerArchivoBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function leerExcelTexto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          let texto = ''
          workbook.SheetNames.forEach(nombre => {
            texto += `\n--- Hoja: ${nombre} ---\n${XLSX.utils.sheet_to_csv(workbook.Sheets[nombre])}`
          })
          resolve(texto)
        } catch (err) { reject(err) }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  // Extrae movimientos con IA a partir de un PDF, imagen o Excel binario (formatos que el
  // parser rápido de tablas HTML no puede leer). Devuelve un array de { fecha, descripcion, monto, tipo }.
  async function extraerMovimientosConIA(file) {
    const nombre = file.name.toLowerCase()
    const prompt = `Eres un experto leyendo extractos bancarios de Ecuador. Analiza este documento y extrae TODOS los movimientos (transacciones) que encuentres, cada uno con:
- fecha en formato YYYY-MM-DD
- descripcion (el texto tal cual aparece)
- monto (número positivo, sin signo)
- tipo: "ingreso" si es un crédito/abono/depósito, "gasto" si es un débito/cargo/retiro

Responde SOLO con un JSON válido (un array), sin markdown ni explicaciones:
[{"fecha":"YYYY-MM-DD","descripcion":"texto","monto":0.00,"tipo":"ingreso"}]`

    let content
    if (nombre.endsWith('.pdf')) {
      const base64 = await leerArchivoBase64(file)
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: prompt }
      ]
    } else if (nombre.match(/\.(png|jpe?g)$/)) {
      const base64 = await leerArchivoBase64(file)
      const mediaType = nombre.endsWith('.png') ? 'image/png' : 'image/jpeg'
      content = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: prompt }
      ]
    } else {
      const texto = await leerExcelTexto(file)
      content = `${prompt}\n\nDatos del archivo:\n${texto}`
    }

    const response = await fetch('/api/leer-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content }] })
    })
    const data = await response.json()
    if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
    if (!data.content) throw new Error('Sin respuesta de IA')
    const texto = data.content.map(c => c.text || '').join('').trim()
    const clean = texto.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  }

  // Inserta un movimiento si no existe ya (mismo criterio de duplicado que el resto de la app)
  async function insertarMovimientoSiNuevo(user, { fecha, descripcion, monto, tipo, nota = '' }) {
    const { data: existentes } = await supabase.from('movimientos').select('id').eq('user_id', user.id).eq('fecha', fecha).eq('descripcion', descripcion).eq('monto', monto).eq('nota', nota)
    if (existentes && existentes.length > 0) return { insertado: false }
    const categoria = aplicarReglas(descripcion, tipo, reglas)
    const { data } = await supabase.from('movimientos').insert({ user_id: user.id, fecha, descripcion, monto, tipo, cuenta: banco, categoria, nota }).select().single()
    return { insertado: !!data, data }
  }

  async function handleFile(e) {
    setLoading(true)
    setMensaje('')
    setPagina(1)
    const file = e.target.files[0]
    if (!file) return
    const { data: { user } } = await supabase.auth.getUser()
    const nombreArchivo = file.name.toLowerCase()
    let nuevos = 0, duplicados = 0
    const idsInsertados = []

    try {
      // Los .html/.htm y muchos .xls de bancos ecuatorianos son en realidad tablas HTML — se intenta
      // primero ese parser rápido y gratuito; si no encuentra filas, se cae al bloque de IA de abajo.
      let filasHtml = []
      if (!nombreArchivo.match(/\.(pdf|png|jpe?g|xlsx)$/)) {
        const text = await file.text()
        const doc = new DOMParser().parseFromString(text, 'text/html')
        filasHtml = [...doc.querySelectorAll('tr')]
      }

      if (filasHtml.length > 0) {
        const meses = { 'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12' }
        for (const row of filasHtml) {
          const cells = [...row.querySelectorAll('td')].map(td => td.textContent.trim())
          if (cells.length >= 7 && cells[0] && cells[0].includes('-')) {
            const partes = cells[0].split('-')
            if (partes.length === 3) {
              const dia = partes[0].padStart(2, '0')
              const mes = meses[partes[1].toLowerCase().replace('.', '')] || '01'
              const fecha = inferirFecha(dia, mes)
              const debito = parseFloat(cells[4]) || 0
              const credito = parseFloat(cells[5]) || 0
              const desc = cells[3]
              const monto = credito > 0 ? credito : debito
              const saldo = cells[6] || ''
              if (debito > 0 || credito > 0) {
                const tipo = credito > 0 ? 'ingreso' : 'gasto'
                const { insertado, data } = await insertarMovimientoSiNuevo(user, { fecha, descripcion: desc, monto, tipo, nota: saldo })
                if (insertado) { setMovimientos(prev => [data, ...prev]); idsInsertados.push(data.id); nuevos++ }
                else duplicados++
              }
            }
          }
        }
      } else {
        setMensaje('🤖 Leyendo el documento con IA...')
        const extraidos = await extraerMovimientosConIA(file)
        for (const t of extraidos) {
          if (!t.fecha || !t.monto) continue
          const tipo = t.tipo === 'ingreso' ? 'ingreso' : 'gasto'
          const { insertado, data } = await insertarMovimientoSiNuevo(user, { fecha: t.fecha, descripcion: t.descripcion || 'Sin descripción', monto: parseFloat(t.monto), tipo })
          if (insertado) { setMovimientos(prev => [data, ...prev]); idsInsertados.push(data.id); nuevos++ }
          else duplicados++
        }
      }

      // Registrar el archivo subido y asociar los movimientos nuevos, para poder verlos/eliminarlos como lote después
      if (nuevos > 0) {
        const { data: lote } = await supabase.from('extractos_subidos').insert({
          user_id: user.id, nombre_archivo: file.name, banco, cantidad_movimientos: nuevos
        }).select().single()
        if (lote) {
          await supabase.from('movimientos').update({ lote_id: lote.id }).in('id', idsInsertados)
          setMovimientos(prev => prev.map(m => idsInsertados.includes(m.id) ? { ...m, lote_id: lote.id } : m))
          setArchivos(prev => [lote, ...prev])
        }
      }

      setMensaje(`✅ ${nuevos} nuevos · ${duplicados} duplicados ignorados`)
    } catch (err) {
      console.error(err)
      setMensaje('❌ No se pudo leer el archivo. Probá con otro formato o revisá que no esté dañado.')
    }

    setLoading(false)
    e.target.value = ''
  }

  async function eliminarArchivo(archivo) {
    if (!confirm(`¿Eliminar "${archivo.nombre_archivo}"? Se borrarán sus ${archivo.cantidad_movimientos} movimientos.`)) return
    await supabase.from('extractos_subidos').delete().eq('id', archivo.id)
    setArchivos(prev => prev.filter(a => a.id !== archivo.id))
    setMovimientos(prev => prev.filter(m => m.lote_id !== archivo.id))
    setMensaje(`✅ Archivo eliminado`)
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

  async function agregarReglaManual() {
    if (!nuevaRegla.contiene.trim()) { setMensaje('Escribe qué palabra o frase debe contener la descripción'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: regla } = await supabase.from('reglas_categoria').insert({
      user_id: user.id, contiene: nuevaRegla.contiene.trim(), categoria: nuevaRegla.categoria
    }).select().single()
    if (regla) {
      setReglas(prev => [...prev, regla])
      setNuevaRegla({ contiene: '', categoria: 'otros' })
      setMostrarNuevaRegla(false)
      setMensaje('✅ Regla guardada')
    }
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

  const mesesUnicos = [...new Set(movimientos.map(m => m.fecha?.slice(0, 7)))].filter(Boolean).sort()
  const nombresMesesBanco = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const labelMesBanco = (m) => {
    const [anio, mesNum] = m.split('-')
    return `${nombresMesesBanco[parseInt(mesNum, 10) - 1]} ${anio}`
  }

  const nombresCuentas = {
    'banco-pichincha': 'Banco Pichincha', 'banco-produbanco': 'Produbanco', 'banco-guayaquil': 'Banco Guayaquil',
    'banco-pacifico': 'Banco del Pacífico', 'banco-internacional': 'Banco Internacional',
    'sri-xml': 'Comprobantes SRI', 'patrimonio': 'Patrimonio'
  }
  const labelCuenta = (c) => nombresCuentas[c] || (c ? c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Sin cuenta')
  const cuentasUnicas = [...new Set(movimientos.map(m => m.cuenta))].filter(Boolean).sort()

  // Filtro por mes o por rango de fechas (el rango tiene prioridad si está activo), y por entidad financiera. Alimenta métricas, Movimientos y Categorías.
  const filtroFechaActivo = !!(filtroDesde || filtroHasta)
  const movimientosFiltrados = movimientos.filter(m => {
    if (!m.fecha) return false
    if (filtroCuenta !== 'todos' && m.cuenta !== filtroCuenta) return false
    if (filtroFechaActivo) {
      if (filtroDesde && m.fecha < filtroDesde) return false
      if (filtroHasta && m.fecha > filtroHasta) return false
      return true
    }
    if (filtroMes !== 'todos') return m.fecha.slice(0, 7) === filtroMes
    return true
  })

  const ingresos = movimientosFiltrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto), 0)
  const gastosReales = movimientosFiltrados.filter(m => m.tipo === 'gasto' && m.categoria !== 'transferencia-enviada' && m.categoria !== 'comisiones-banco').reduce((s, m) => s + parseFloat(m.monto), 0)
  const transferenciasEnviadas = movimientosFiltrados.filter(m => m.categoria === 'transferencia-enviada').reduce((s, m) => s + parseFloat(m.monto), 0)
  const transferenciasRecibidas = movimientosFiltrados.filter(m => m.categoria === 'transferencia-recibida').reduce((s, m) => s + parseFloat(m.monto), 0)
  const comisionesBanco = movimientosFiltrados.filter(m => m.categoria === 'comisiones-banco').reduce((s, m) => s + parseFloat(m.monto), 0)
  const totalEgresos = gastosReales + transferenciasEnviadas + comisionesBanco

  // Presupuestos se calcula siempre sobre el historial completo (es un promedio mensual, no tiene sentido acotarlo a un mes)
  const porCategoria = {}
  movimientos.forEach(m => { porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + parseFloat(m.monto) })

  // Vista de categorías filtrada por tipo (todos / ingreso / gasto) sobre los movimientos ya acotados por mes/fecha
  const movsTipoFiltro = tipoFiltro === 'todos' ? movimientosFiltrados : movimientosFiltrados.filter(m => m.tipo === tipoFiltro)
  const porCategoriaFiltro = {}
  movsTipoFiltro.forEach(m => { porCategoriaFiltro[m.categoria] = (porCategoriaFiltro[m.categoria] || 0) + parseFloat(m.monto) })
  const topCategoriasFiltro = Object.entries(porCategoriaFiltro).sort((a, b) => b[1] - a[1])
  const maxCatFiltro = topCategoriasFiltro[0]?.[1] || 1

  const numMeses = Math.max(mesesUnicos.length, 1)
  const proyecciones = {}
  Object.entries(porCategoria).forEach(([cat, total]) => {
    const promedio = total / numMeses
    const presupuesto = presupuestos[cat] || promedio * 1.1
    const diferencia = presupuesto - promedio
    const alerta = promedio > presupuesto
    proyecciones[cat] = { promedio, presupuesto, diferencia, alerta }
  })

  const totalPaginas = Math.ceil(movimientosFiltrados.length / porPagina)
  const movsPagina = movimientosFiltrados.slice((pagina - 1) * porPagina, pagina * porPagina)

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
            <input type="file" accept=".xls,.xlsx,.html,.htm,.pdf,.png,.jpg,.jpeg" onChange={handleFile} className="hidden" />
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

        {/* FILTRO POR MES / FECHA / ENTIDAD */}
        <div className={`rounded-xl border p-4 mb-6 flex items-center gap-3 flex-wrap ${card}`}>
          <span className={`text-xs font-semibold ${textSub}`}>📅 Período:</span>
          <select value={filtroMes} disabled={filtroFechaActivo}
            onChange={e => { setFiltroMes(e.target.value); setPagina(1) }}
            className={`text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:border-pink-500 disabled:opacity-40 ${inputCls}`}>
            <option value="todos">Todos los meses</option>
            {mesesUnicos.map(m => <option key={m} value={m}>{labelMesBanco(m)}</option>)}
          </select>
          <span className={`text-xs ${textSub}`}>o rango:</span>
          <input type="date" value={filtroDesde} onChange={e => { setFiltroDesde(e.target.value); setPagina(1) }}
            className={`text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:border-pink-500 ${inputCls}`} />
          <span className={`text-xs ${textSub}`}>—</span>
          <input type="date" value={filtroHasta} onChange={e => { setFiltroHasta(e.target.value); setPagina(1) }}
            className={`text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:border-pink-500 ${inputCls}`} />

          <div className={`h-5 w-px ${dark ? 'bg-gray-700' : 'bg-gray-300'}`} />

          <span className={`text-xs font-semibold ${textSub}`}>🏦 Entidad:</span>
          <select value={filtroCuenta} onChange={e => { setFiltroCuenta(e.target.value); setPagina(1) }}
            className={`text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:border-pink-500 ${inputCls}`}>
            <option value="todos">Todas</option>
            {cuentasUnicas.map(c => <option key={c} value={c}>{labelCuenta(c)}</option>)}
          </select>

          {(filtroMes !== 'todos' || filtroFechaActivo || filtroCuenta !== 'todos') && (
            <button onClick={() => { setFiltroMes('todos'); setFiltroDesde(''); setFiltroHasta(''); setFiltroCuenta('todos'); setPagina(1) }}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              ✕ Limpiar filtro
            </button>
          )}
        </div>

        {/* TABS — sin gráficos ni proyecciones */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'movimientos', label: '📋 Movimientos' },
            { id: 'categorias', label: '📊 Categorías' },
            { id: 'presupuestos', label: '🎯 Presupuestos' },
            { id: 'agregar', label: '➕ Agregar' },
            { id: 'reglas', label: '🧠 Reglas' },
            { id: 'archivos', label: '📁 Archivos' },
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
              <div className={`text-sm font-semibold ${text}`}>{filtroMes !== 'todos' || filtroFechaActivo || filtroCuenta !== 'todos' ? 'Movimientos filtrados' : 'Todos los movimientos'} ({movimientosFiltrados.length})</div>
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
                {Math.min((pagina - 1) * porPagina + 1, movimientosFiltrados.length)}–{Math.min(pagina * porPagina, movimientosFiltrados.length)} de {movimientosFiltrados.length}
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
            <div className="flex gap-2 mb-4">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'ingreso', label: '💰 Ingresos' },
                { id: 'gasto', label: '💸 Gastos' },
              ].map(t => (
                <button key={t.id} onClick={() => { setTipoFiltro(t.id); setCategoriaFiltro(null) }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tipoFiltro === t.id ? 'text-white shadow-lg' : 'border ' + (dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}`}
                  style={tipoFiltro === t.id ? { background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' } : {}}>
                  {t.label}
                </button>
              ))}
            </div>

            {categoriaFiltro && (
              <div className={`rounded-xl border overflow-hidden mb-4 ${card}`}>
                <div className={`px-4 py-3 border-b ${border} flex items-center justify-between`}>
                  <div className={`text-sm font-semibold ${text}`}>
                    {categoriaInfo[categoriaFiltro]?.emoji} {categoriaInfo[categoriaFiltro]?.label} — {movsTipoFiltro.filter(m => m.categoria === categoriaFiltro).length} movimientos
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
                    {movsTipoFiltro.filter(m => m.categoria === categoriaFiltro).map((m, i) => (
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
                    ${movsTipoFiltro.filter(m => m.categoria === categoriaFiltro).reduce((s, m) => s + parseFloat(m.monto), 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {topCategoriasFiltro.length > 0 && (
              <div className={`rounded-xl border p-5 mb-4 ${card}`}>
                <div className={`text-sm font-semibold ${text} mb-4`}>
                  {tipoFiltro === 'ingreso' ? '💰 Distribución de ingresos' : tipoFiltro === 'gasto' ? '💸 Distribución de gastos' : '📊 Distribución por categoría'}
                </div>
                <PieChart datos={topCategoriasFiltro} dark={dark} categoriaSeleccionada={categoriaFiltro} onSelect={setCategoriaFiltro} />
              </div>
            )}

            <div className={`rounded-xl border p-5 ${card}`}>
              <div className={`text-sm font-semibold ${text} mb-1 flex items-center`}>
                Por categoría
                <InfoTooltip dark={dark} texto="Aquí ves en qué gastas y de dónde vienen tus ingresos, agrupado por categoría. Haz clic en una categoría para ver sus movimientos." />
              </div>
              <div className={`text-xs ${textSub} mb-4`}>Haz clic para ver los movimientos de esa categoría</div>
              {topCategoriasFiltro.length === 0 ? (
                <div className={`text-sm text-center py-8 ${textSub}`}>Sin movimientos en esta vista todavía</div>
              ) : topCategoriasFiltro.map(([cat, val]) => {
                const info = categoriaInfo[cat] || { label: cat, emoji: '📦', color: '#E91E8C' }
                const presup = presupuestos[cat]
                const alerta = presup && val > presup
                return (
                  <div key={cat} onClick={() => setCategoriaFiltro(cat)}
                    className={`flex items-center gap-3 mb-3 cursor-pointer rounded-lg px-2 py-2 transition-all ${categoriaFiltro === cat ? (dark ? 'bg-pink-950' : 'bg-pink-50') : (dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50')}`}>
                    <div className="text-lg w-8">{info.emoji}</div>
                    <div className={`text-xs w-32 truncate ${text}`}>{info.label}</div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: dark ? '#1F2937' : '#F3F4F6' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${(val / maxCatFiltro) * 100}%`, background: alerta ? '#EF4444' : info.color }} />
                    </div>
                    <div className={`text-xs font-semibold w-20 text-right ${alerta ? 'text-red-400' : text}`}>${val.toFixed(2)}</div>
                    {alerta && <span className="text-xs text-red-400">⚠️</span>}
                    <div className={`text-xs w-6 text-right ${textSub}`}>{movsTipoFiltro.filter(m => m.categoria === cat).length}x</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PRESUPUESTOS */}
        {vistaActiva === 'presupuestos' && (
          <div className={`rounded-xl border p-5 ${card}`}>
            <div className={`text-sm font-semibold ${text} mb-1 flex items-center`}>
              🎯 Presupuestos por categoría
              <InfoTooltip dark={dark} texto="Numia sugiere un presupuesto por categoría según tu promedio mensual histórico. Si te pasas, se marca en rojo. Haz clic en el monto para editarlo." />
            </div>
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
            <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
              <div className={`text-sm font-semibold ${text} flex items-center`}>
                🧠 Reglas de categorización
                <InfoTooltip dark={dark} texto="Una regla dice: 'si la descripción de un movimiento contiene esta palabra, ponle esta categoría'. Se aplican solas al importar un extracto o agregar un movimiento manual — no hace falta categorizar a mano cada vez." />
              </div>
              <button onClick={() => setMostrarNuevaRegla(v => !v)}
                className="text-xs px-4 py-2 rounded-lg font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' }}>
                {mostrarNuevaRegla ? '✕ Cancelar' : '+ Nueva regla'}
              </button>
            </div>
            <div className={`text-xs ${textSub} mb-4`}>
              Todas las reglas de acá abajo están <span className="font-semibold text-emerald-400">activas</span> y se evalúan en orden — la <span className="font-semibold">primera que coincida con la descripción gana</span>. Si ninguna aplica, Numia categoriza automático con su propio criterio.
            </div>

            {mostrarNuevaRegla && (
              <div className={`rounded-lg p-4 mb-4 border ${dark ? 'border-pink-900/50 bg-pink-950/20' : 'border-pink-200 bg-pink-50'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={`text-xs mb-1 block ${textSub}`}>Si la descripción contiene...</label>
                    <input type="text" value={nuevaRegla.contiene} autoFocus
                      onChange={e => setNuevaRegla(p => ({ ...p, contiene: e.target.value }))}
                      placeholder="Ej: netflix, farmacia, uber..."
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 ${inputCls}`} />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${textSub}`}>...ponle esta categoría</label>
                    <select value={nuevaRegla.categoria} onChange={e => setNuevaRegla(p => ({ ...p, categoria: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 ${inputCls}`}>
                      {todasLasCategorias.map(cat => {
                        const ci = categoriaInfo[cat]
                        return <option key={cat} value={cat}>{ci?.emoji} {ci?.label}</option>
                      })}
                    </select>
                  </div>
                </div>
                <button onClick={agregarReglaManual}
                  className="text-xs px-4 py-2 rounded-lg font-bold text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' }}>
                  Guardar regla
                </button>
              </div>
            )}

            {reglas.length === 0 && !mostrarNuevaRegla && (
              <div className={`text-sm ${textSub} py-6 text-center`}>
                Sin reglas todavía. Creá una con &quot;+ Nueva regla&quot;, o cambiá la categoría de un movimiento en la pestaña Movimientos y Numia te va a ofrecer guardarla como regla.
              </div>
            )}
            {reglas.map((r, i) => {
              const info = categoriaInfo[r.categoria]
              return (
                <div key={r.id} className={`flex items-center justify-between py-3 border-b ${border} last:border-0`}>
                  <div className="flex items-start gap-3 flex-1">
                    <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                    <div className="flex-1">
                      <div className={`text-sm ${text} flex items-center gap-2 flex-wrap`}>
                        Si contiene{' '}
                        {editandoRegla === r.id ? (
                          <input type="text" defaultValue={r.contiene} autoFocus
                            onBlur={e => { actualizarRegla(r.id, 'contiene', e.target.value); setEditandoRegla(null) }}
                            onKeyDown={e => e.key === 'Enter' && (actualizarRegla(r.id, 'contiene', e.target.value), setEditandoRegla(null))}
                            className={`text-xs border rounded px-2 py-0.5 focus:outline-none w-40 ${inputCls}`} />
                        ) : (
                          <span onClick={() => setEditandoRegla(r.id)} className="font-semibold cursor-pointer text-pink-400 hover:text-pink-300">
                            &quot;{r.contiene}&quot; ✏️
                          </span>
                        )}
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>✓ Activa</span>
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
                  </div>
                  <button onClick={() => eliminarRegla(r.id)} className={`text-xs px-2 py-1 ml-3 transition-colors ${dark ? 'text-gray-600 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}>✕</button>
                </div>
              )
            })}
          </div>
        )}

        {/* ARCHIVOS SUBIDOS */}
        {vistaActiva === 'archivos' && (
          <div className={`rounded-xl border p-5 ${card}`}>
            <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
              <div className={`text-sm font-semibold ${text} flex items-center`}>
                📁 Archivos subidos
                <InfoTooltip dark={dark} texto="Cada extracto que subís queda registrado acá. Si subiste el archivo equivocado, elimínalo y se borran automáticamente los movimientos que trajo." />
              </div>
              <label className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)' }}>
                {loading ? '⏳ Procesando...' : '+ Subir extracto'}
                <input type="file" accept=".xls,.xlsx,.html,.htm,.pdf,.png,.jpg,.jpeg" onChange={handleFile} className="hidden" />
              </label>
            </div>
            <div className={`text-xs ${textSub} mb-4`}>{archivos.length} {archivos.length === 1 ? 'archivo' : 'archivos'} registrados</div>

            {archivos.length === 0 ? (
              <div className={`text-sm text-center py-10 ${textSub}`}>
                Todavía no subiste ningún extracto por acá. Los que subas van a aparecer en esta lista.
              </div>
            ) : (
              <div className="space-y-2">
                {archivos.map(a => (
                  <div key={a.id} className={`flex items-center justify-between gap-3 rounded-lg p-3 border ${dark ? 'border-gray-800 bg-gray-800/60' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">📄</span>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium truncate ${text}`}>{a.nombre_archivo}</div>
                        <div className={`text-xs ${textSub}`}>
                          {a.banco?.replace('banco-', '').replace('-', ' ')} · {new Date(a.fecha_carga).toLocaleDateString('es-EC')} · {a.cantidad_movimientos} movimientos
                        </div>
                      </div>
                    </div>
                    <button onClick={() => eliminarArchivo(a)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold shrink-0 transition-colors ${dark ? 'border-red-900 text-red-400 hover:bg-red-950' : 'border-red-200 text-red-500 hover:bg-red-50'}`}>
                      🗑️ Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Banco() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando Numia...</p>
        </div>
      </div>
    }>
      <BancoContenido />
    </Suspense>
  )
}