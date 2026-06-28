'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import * as XLSX from 'xlsx'


const RATIOS_CONFIG = [
  {
    id: 'liquidez_corriente',
    nombre: 'Liquidez Corriente',
    formula: 'Activo Corriente / Pasivo Corriente',
    descripcion: 'Mide la capacidad de pagar deudas a corto plazo.',
    icono: '💧',
    calcular: (v) => v.pasivo_corriente > 0 ? v.activo_corriente / v.pasivo_corriente : null,
    semaforo: [
      { min: 1.5, max: Infinity, color: 'verde', label: 'Óptimo', desc: 'Excelente liquidez. Los bancos lo ven muy bien.' },
      { min: 1.0, max: 1.5, color: 'amarillo', label: 'Aceptable', desc: 'Liquidez justa. Monitorea tus cobros.' },
      { min: -Infinity, max: 1.0, color: 'rojo', label: 'Crítico', desc: 'Riesgo de insolvencia. Urge mejorar.' },
    ],
    estandar: '≥ 1.5',
  },
  {
    id: 'prueba_acida',
    nombre: 'Prueba Ácida',
    formula: '(Activo Corriente - Inventario) / Pasivo Corriente',
    descripcion: 'Liquidez sin contar inventarios (más estricto).',
    icono: '⚗️',
    calcular: (v) => v.pasivo_corriente > 0 ? (v.activo_corriente - v.inventario) / v.pasivo_corriente : null,
    semaforo: [
      { min: 1.0, max: Infinity, color: 'verde', label: 'Óptimo', desc: 'Puedes cubrir deudas sin vender inventario.' },
      { min: 0.7, max: 1.0, color: 'amarillo', label: 'Aceptable', desc: 'Depende algo del inventario.' },
      { min: -Infinity, max: 0.7, color: 'rojo', label: 'Crítico', desc: 'Alta dependencia del inventario para pagar.' },
    ],
    estandar: '≥ 1.0',
  },
  {
    id: 'endeudamiento',
    nombre: 'Nivel de Endeudamiento',
    formula: 'Pasivo Total / Activo Total',
    descripcion: 'Porcentaje de activos financiados con deuda.',
    icono: '📊',
    calcular: (v) => v.activo_total > 0 ? v.pasivo_total / v.activo_total : null,
    semaforo: [
      { min: -Infinity, max: 0.5, color: 'verde', label: 'Óptimo', desc: 'Empresa sana. Poco dependiente de deuda.' },
      { min: 0.5, max: 0.7, color: 'amarillo', label: 'Moderado', desc: 'Nivel aceptable, vigila el crecimiento.' },
      { min: 0.7, max: Infinity, color: 'rojo', label: 'Alto riesgo', desc: 'Muy endeudado. Bancos lo penalizan.' },
    ],
    estandar: '≤ 0.5',
    porcentaje: true,
  },
  {
    id: 'roe',
    nombre: 'ROE',
    formula: 'Utilidad Neta / Patrimonio',
    descripcion: 'Rentabilidad sobre el capital de los socios.',
    icono: '💰',
    calcular: (v) => v.patrimonio > 0 ? v.utilidad_neta / v.patrimonio : null,
    semaforo: [
      { min: 0.15, max: Infinity, color: 'verde', label: 'Óptimo', desc: 'Excelente retorno para los accionistas.' },
      { min: 0.08, max: 0.15, color: 'amarillo', label: 'Aceptable', desc: 'Rentabilidad moderada.' },
      { min: -Infinity, max: 0.08, color: 'rojo', label: 'Bajo', desc: 'Rentabilidad insuficiente para el capital.' },
    ],
    estandar: '≥ 15%',
    porcentaje: true,
  },
  {
    id: 'roa',
    nombre: 'ROA',
    formula: 'Utilidad Neta / Activo Total',
    descripcion: 'Rentabilidad sobre todos los activos de la empresa.',
    icono: '🏦',
    calcular: (v) => v.activo_total > 0 ? v.utilidad_neta / v.activo_total : null,
    semaforo: [
      { min: 0.05, max: Infinity, color: 'verde', label: 'Óptimo', desc: 'Activos generando buen retorno.' },
      { min: 0.02, max: 0.05, color: 'amarillo', label: 'Aceptable', desc: 'Activos con retorno moderado.' },
      { min: -Infinity, max: 0.02, color: 'rojo', label: 'Bajo', desc: 'Activos poco productivos.' },
    ],
    estandar: '≥ 5%',
    porcentaje: true,
  },
  {
    id: 'margen_neto',
    nombre: 'Margen Neto',
    formula: 'Utilidad Neta / Ingresos Totales',
    descripcion: 'Cuánto gana la empresa por cada dólar de ventas.',
    icono: '📈',
    calcular: (v) => v.ingresos_totales > 0 ? v.utilidad_neta / v.ingresos_totales : null,
    semaforo: [
      { min: 0.1, max: Infinity, color: 'verde', label: 'Óptimo', desc: 'Gran margen de ganancia neta.' },
      { min: 0.05, max: 0.1, color: 'amarillo', label: 'Aceptable', desc: 'Margen moderado, hay espacio de mejora.' },
      { min: -Infinity, max: 0.05, color: 'rojo', label: 'Bajo', desc: 'Márgenes muy ajustados o pérdida.' },
    ],
    estandar: '≥ 10%',
    porcentaje: true,
  },
]


const COLORES_SEMAFORO = {
  verde: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', dot: 'bg-emerald-400', badge: 'bg-emerald-500/30 text-emerald-300' },
  amarillo: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', dot: 'bg-yellow-400', badge: 'bg-yellow-500/30 text-yellow-300' },
  rojo: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', dot: 'bg-red-400', badge: 'bg-red-500/30 text-red-300' },
}


function evaluarSemaforo(ratio, valor) {
  if (valor === null || isNaN(valor)) return null
  for (const s of ratio.semaforo) {
    if (valor >= s.min && valor < s.max) return s
  }
  return ratio.semaforo[ratio.semaforo.length - 1]
}


function formatearValor(valor, porcentaje) {
  if (valor === null || isNaN(valor)) return '—'
  if (porcentaje) return (valor * 100).toFixed(1) + '%'
  return valor.toFixed(2) + 'x'
}


export default function RatiosPage() {
  const [darkMode, setDarkMode] = useState(true)
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [procesandoIA, setProcesandoIA] = useState(false)
  const [mensajeIA, setMensajeIA] = useState('')
  const [valores, setValores] = useState({
    activo_corriente: '',
    pasivo_corriente: '',
    inventario: '',
    activo_total: '',
    pasivo_total: '',
    patrimonio: '',
    utilidad_neta: '',
    ingresos_totales: '',
  })
  const [calculado, setCalculado] = useState(false)
  const [resumenMovimientos, setResumenMovimientos] = useState(null)
  const supabase = createClient()


  useEffect(() => { inicializar() }, [])


  async function inicializar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)
    const [{ data: pref }, { data: prof }, { data: movs }] = await Promise.all([
      supabase.from('preferencias').select('tema').eq('user_id', user.id).single(),
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('movimientos').select('monto, tipo').eq('user_id', user.id),
    ])
    if (pref) setDarkMode(pref.tema === 'oscuro')
    if (prof) setPerfil(prof)
    if (movs && movs.length > 0) {
      const ingresos = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
      const gastos = movs.filter(m => m.tipo === 'gasto').reduce((s, m) => s + Number(m.monto), 0)
      setResumenMovimientos({ ingresos, gastos, utilidad: ingresos - gastos })
    }
    setLoading(false)
  }


  async function toggleDark() {
    const nuevo = !darkMode
    setDarkMode(nuevo)
    if (user) await supabase.from('preferencias').upsert({ user_id: user.id, tema: nuevo ? 'oscuro' : 'claro' }, { onConflict: 'user_id' })
  }


  function handleInput(campo, valor) {
    setValores(prev => ({ ...prev, [campo]: valor }))
    setCalculado(false)
  }


  function usarDatosReales() {
    if (!resumenMovimientos) return
    setValores(prev => ({
      ...prev,
      ingresos_totales: resumenMovimientos.ingresos.toFixed(2),
      utilidad_neta: resumenMovimientos.utilidad.toFixed(2),
    }))
  }


  function leerExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          let texto = ''
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName]
            texto += `\n--- Hoja: ${sheetName} ---\n`
            texto += XLSX.utils.sheet_to_csv(sheet)
          })
          resolve(texto)
        } catch (err) { reject(err) }
      }
      reader.readAsArrayBuffer(file)
    })
  }


  function leerPDFBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }


  async function procesarArchivo(e) {
    const file = e.target.files[0]
    if (!file) return
    setProcesandoIA(true)
    setMensajeIA('🤖 Leyendo el archivo...')
    setCalculado(false)


    try {
      const esPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')
      let messages


      if (esPDF) {
        setMensajeIA('🤖 Analizando PDF con IA...')
        const base64 = await leerPDFBase64(file)
        messages = [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            },
            {
              type: 'text',
              text: `Eres un contador experto en balances generales ecuatorianos. 
Analiza este documento y extrae los siguientes valores financieros.
Si no encuentras un valor exacto, estímalo basándote en el contexto del balance.
Responde SOLO con un JSON válido, sin texto adicional, sin markdown, sin explicaciones:
{
  "activo_corriente": número,
  "pasivo_corriente": número,
  "inventario": número,
  "activo_total": número,
  "pasivo_total": número,
  "patrimonio": número,
  "utilidad_neta": número,
  "ingresos_totales": número
}`
            }
          ]
        }]
      } else {
        setMensajeIA('🤖 Analizando Excel con IA...')
        const textoExcel = await leerExcel(file)
        messages = [{
          role: 'user',
          content: `Eres un contador experto en balances generales ecuatorianos.
Analiza este balance en formato CSV/Excel y extrae los valores financieros clave.
Si no encuentras un valor exacto, estímalo basándote en el contexto.
Responde SOLO con un JSON válido, sin texto adicional, sin markdown, sin explicaciones:
{
  "activo_corriente": número,
  "pasivo_corriente": número,
  "inventario": número,
  "activo_total": número,
  "pasivo_total": número,
  "patrimonio": número,
  "utilidad_neta": número,
  "ingresos_totales": número
}


DATOS DEL BALANCE:
${textoExcel}`
        }]
      }


      setMensajeIA('🤖 Extrayendo valores financieros...')


      const response = await fetch('/api/leer-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      })


      const data = await response.json()
      if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      if (!data.content) throw new Error('Sin respuesta de IA')
      const texto = data.content.map(c => c.text || '').join('').trim()
      if (!texto) throw new Error('Texto vacío')
      const clean = texto.replace(/```json|```/g, '').trim()
      const extraido = JSON.parse(clean)


      setValores({
        activo_corriente: extraido.activo_corriente?.toString() || '',
        pasivo_corriente: extraido.pasivo_corriente?.toString() || '',
        inventario: extraido.inventario?.toString() || '',
        activo_total: extraido.activo_total?.toString() || '',
        pasivo_total: extraido.pasivo_total?.toString() || '',
        patrimonio: extraido.patrimonio?.toString() || '',
        utilidad_neta: extraido.utilidad_neta?.toString() || '',
        ingresos_totales: extraido.ingresos_totales?.toString() || '',
      })


      setMensajeIA('✅ Valores extraídos correctamente. Revisa y calcula.')
    } catch (err) {
      console.error(err)
      setMensajeIA('❌ No se pudo leer el archivo. Intenta con otro formato o ingresa los datos manualmente.')
    }


    setProcesandoIA(false)
    e.target.value = ''
  }


  const valoresNum = Object.fromEntries(
    Object.entries(valores).map(([k, v]) => [k, parseFloat(v) || 0])
  )


  const resultados = RATIOS_CONFIG.map(ratio => {
    const valor = calculado ? ratio.calcular(valoresNum) : null
    const semaforo = valor !== null ? evaluarSemaforo(ratio, valor) : null
    return { ...ratio, valor, semaforo }
  })


  const totalVerde = resultados.filter(r => r.semaforo?.color === 'verde').length
  const totalAmarillo = resultados.filter(r => r.semaforo?.color === 'amarillo').length
  const totalRojo = resultados.filter(r => r.semaforo?.color === 'rojo').length


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
                Ratios Financieros
              </h1>
              <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Semáforo vs estándares bancarios Ecuador</p>
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


        {perfil?.tipo === 'persona' && (
          <div className="mb-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-400">Módulo orientado a empresas</p>
              <p className={`text-sm mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Estos ratios son principalmente para personas jurídicas. Puedes usarlo de referencia.</p>
            </div>
          </div>
        )}


        {/* SUBIR ARCHIVO CON IA */}
        <div className={`rounded-2xl border p-6 mb-6 ${card}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #E91E8C22, #9C27B022)', border: '1px solid #E91E8C55' }}>
              🤖
            </div>
            <div>
              <h2 className={`font-bold text-sm ${text}`}>Subir balance con IA</h2>
              <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Sube tu balance en Excel o PDF — la IA extrae los valores automáticamente</p>
            </div>
          </div>


          <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${procesandoIA ? 'opacity-50 cursor-not-allowed' : 'hover:border-pink-500 hover:bg-pink-500/5'} ${dark ? 'border-gray-700' : 'border-gray-300'}`}>
            {procesandoIA ? (
              <div className="text-center">
                <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-2" style={{ border: '3px solid #E91E8C', borderTopColor: 'transparent' }} />
                <p className="text-sm font-medium" style={{ color: '#E91E8C' }}>{mensajeIA}</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-3xl mb-2">📄</p>
                <p className={`text-sm font-semibold ${text}`}>Arrastra o haz clic para subir</p>
                <p className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Excel (.xlsx, .xls) o PDF</p>
              </div>
            )}
            <input type="file" accept=".xlsx,.xls,.pdf" onChange={procesarArchivo} disabled={procesandoIA} className="hidden" />
          </label>


          {mensajeIA && !procesandoIA && (
            <div className={`mt-3 text-sm px-4 py-2 rounded-lg border ${mensajeIA.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
              {mensajeIA}
            </div>
          )}
        </div>


        {/* INGRESO MANUAL */}
        <div className={`rounded-2xl border p-6 mb-8 ${card}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`font-bold text-sm ${text}`}>📋 Datos del Balance</h2>
              <p className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Los campos se llenan automáticamente al subir un archivo, o ingrésalos manualmente</p>
            </div>
            {resumenMovimientos && (
              <button onClick={usarDatosReales}
                className="text-xs px-4 py-2 rounded-lg font-medium transition-all"
                style={{ background: 'linear-gradient(135deg, #E91E8C22, #9C27B022)', border: '1px solid #E91E8C55', color: '#E91E8C' }}>
                📥 Usar datos de Numia
              </button>
            )}
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { campo: 'activo_corriente', label: 'Activo Corriente', emoji: '🟢', hint: 'Caja, bancos, cuentas por cobrar' },
              { campo: 'pasivo_corriente', label: 'Pasivo Corriente', emoji: '🔴', hint: 'Deudas a pagar en menos de 1 año' },
              { campo: 'inventario', label: 'Inventario', emoji: '📦', hint: 'Mercadería en stock' },
              { campo: 'activo_total', label: 'Activo Total', emoji: '🏢', hint: 'Todos los bienes y derechos' },
              { campo: 'pasivo_total', label: 'Pasivo Total', emoji: '💳', hint: 'Todas las deudas y obligaciones' },
              { campo: 'patrimonio', label: 'Patrimonio', emoji: '🏛️', hint: 'Capital + utilidades acumuladas' },
              { campo: 'utilidad_neta', label: 'Utilidad Neta', emoji: '💵', hint: 'Ganancia después de impuestos' },
              { campo: 'ingresos_totales', label: 'Ingresos Totales', emoji: '📊', hint: 'Ventas del período' },
            ].map(({ campo, label, emoji, hint }) => (
              <div key={campo}>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {emoji} {label}
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={valores[campo]}
                  onChange={e => handleInput(campo, e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all ${inputClass} ${valores[campo] ? 'border-pink-500/50' : ''}`}
                />
                <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{hint}</p>
              </div>
            ))}
          </div>


          <div className="mt-6 flex justify-end">
            <button onClick={() => setCalculado(true)}
              className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
              ⚡ Calcular Ratios
            </button>
          </div>
        </div>


        {/* RESUMEN SEMÁFORO */}
        {calculado && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { count: totalVerde, label: 'Óptimos', emoji: '🟢', bg: 'bg-emerald-500/10 border-emerald-500/30', textColor: 'text-emerald-400' },
              { count: totalAmarillo, label: 'Aceptables', emoji: '🟡', bg: 'bg-yellow-500/10 border-yellow-500/30', textColor: 'text-yellow-400' },
              { count: totalRojo, label: 'Críticos', emoji: '🔴', bg: 'bg-red-500/10 border-red-500/30', textColor: 'text-red-400' },
            ].map(({ count, label, emoji, bg, textColor }) => (
              <div key={label} className={`rounded-xl border p-4 text-center ${bg}`}>
                <div className="text-3xl mb-1">{emoji}</div>
                <div className={`text-3xl font-black ${textColor}`}>{count}</div>
                <div className={`text-sm font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
              </div>
            ))}
          </div>
        )}


        {/* GRID DE RATIOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {resultados.map((ratio) => {
            const colores = ratio.semaforo ? COLORES_SEMAFORO[ratio.semaforo.color] : null
            return (
              <div key={ratio.id}
                className={`rounded-2xl border-2 p-6 transition-all duration-300 ${colores ? `${colores.bg} ${colores.border}` : card}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ratio.icono}</span>
                    <div>
                      <h3 className={`font-bold text-sm ${text}`}>{ratio.nombre}</h3>
                      <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Estándar: {ratio.estandar}</p>
                    </div>
                  </div>
                  {ratio.semaforo && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${colores.badge}`}>
                      <div className={`w-2 h-2 rounded-full ${colores.dot} animate-pulse`} />
                      {ratio.semaforo.label}
                    </div>
                  )}
                </div>


                <div className="my-4 text-center">
                  <div className={`text-4xl font-black ${colores ? colores.text : dark ? 'text-gray-600' : 'text-gray-300'}`}>
                    {calculado ? formatearValor(ratio.valor, ratio.porcentaje) : '—'}
                  </div>
                </div>


                {calculado && ratio.valor !== null && !isNaN(ratio.valor) && (
                  <div className={`h-2 rounded-full mb-4 ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${ratio.semaforo?.color === 'verde' ? 'bg-emerald-500' : ratio.semaforo?.color === 'amarillo' ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.max(5, ratio.porcentaje ? Math.abs(ratio.valor) * 100 * 2 : Math.abs(ratio.valor) * 30))}%` }}
                    />
                  </div>
                )}


                <p className={`text-xs mb-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{ratio.descripcion}</p>


                <div className={`text-xs px-3 py-1.5 rounded-lg font-mono mb-3 ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                  {ratio.formula}
                </div>


                {ratio.semaforo && (
                  <div className={`text-xs p-2 rounded-lg ${colores.bg}`}>
                    <span className={`font-semibold ${colores.text}`}>Diagnóstico: </span>
                    <span className={dark ? 'text-gray-300' : 'text-gray-700'}>{ratio.semaforo.desc}</span>
                  </div>
                )}


                {!calculado && (
                  <div className={`text-center text-xs py-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                    Ingresa los datos y calcula
                  </div>
                )}
              </div>
            )
          })}
        </div>


        {/* NOTA */}
        <div className={`mt-8 p-5 rounded-2xl border ${card}`}>
          <h3 className={`font-bold mb-3 flex items-center gap-2 ${text}`}>ℹ️ Sobre los estándares bancarios en Ecuador</h3>
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            <div>
              <p className="font-semibold mb-1" style={{ color: '#E91E8C' }}>Superintendencia de Bancos</p>
              <p>Ratios basados en estándares de instituciones financieras del Ecuador para evaluar crédito empresarial.</p>
            </div>
            <div>
              <p className="font-semibold mb-1" style={{ color: '#E91E8C' }}>Frecuencia recomendada</p>
              <p>Calcula estos ratios mínimo una vez al trimestre, idealmente al cierre de cada mes.</p>
            </div>
            <div>
              <p className="font-semibold mb-1" style={{ color: '#E91E8C' }}>Importante</p>
              <p>Valores referenciales. Consulta con tu contador para un análisis personalizado.</p>
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}