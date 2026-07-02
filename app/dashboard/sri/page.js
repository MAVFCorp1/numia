'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  TARIFA_IVA,
  diaDeclaracion,
  proximaFechaDeclaracion,
  formatearFecha,
  diasRestantes,
  fechasPorDigito
} from '@/lib/sriHelpers'

export default function SriPage() {
  const [darkMode, setDarkMode] = useState(true)
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  const [facturas, setFacturas] = useState([])

  // RUC editable para el calendario
  const [rucCalendario, setRucCalendario] = useState('')

  // Subida XML con IA
  const [procesandoIA, setProcesandoIA] = useState(false)
  const [mensajeIA, setMensajeIA] = useState('')

  // Modal factura (agregar / editar)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [error, setError] = useState('')
  const [fFecha, setFFecha] = useState('')
  const [fTipo, setFTipo] = useState('compra')
  const [fRucEmisor, setFRucEmisor] = useState('')
  const [fRazon, setFRazon] = useState('')
  const [fNumero, setFNumero] = useState('')
  const [fSubtotal, setFSubtotal] = useState('')
  const [fSubtotalExento, setFSubtotalExento] = useState('')
  const [fNota, setFNota] = useState('')

  const supabase = createClient()

  useEffect(() => { inicializar() }, [])

  async function inicializar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)

    const [{ data: pref }, { data: prof }, { data: facts }] = await Promise.all([
      supabase.from('preferencias').select('tema').eq('user_id', user.id).single(),
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('facturas_sri').select('*').eq('user_id', user.id).order('fecha', { ascending: false })
    ])

    if (pref) setDarkMode(pref.tema === 'oscuro')
    if (prof) {
      setPerfil(prof)
      setRucCalendario(prof.ruc || '')
    }
    if (facts) setFacturas(facts)

    setLoading(false)
  }

  async function toggleDark() {
    const nuevo = !darkMode
    setDarkMode(nuevo)
    if (user) await supabase.from('preferencias').upsert({ user_id: user.id, tema: nuevo ? 'oscuro' : 'claro' }, { onConflict: 'user_id' })
  }

  async function recargarFacturas() {
    const { data: facts } = await supabase
      .from('facturas_sri')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
    if (facts) setFacturas(facts)
  }

  // ---------- Subida XML con IA ----------
  function leerArchivoTexto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  async function procesarXml(e) {
    const file = e.target.files[0]
    if (!file) return
    setProcesandoIA(true)
    setMensajeIA('🤖 Leyendo el comprobante...')

    try {
      const texto = await leerArchivoTexto(file)

      const messages = [{
        role: 'user',
        content: `Eres un experto en comprobantes electrónicos del SRI de Ecuador.
Analiza este XML de factura y extrae los datos. Distingue entre base gravada con IVA 15% y base exenta/0%.
Responde SOLO con un JSON válido, sin markdown ni explicaciones:
{
  "fecha": "YYYY-MM-DD",
  "tipo": "compra" o "venta",
  "ruc_emisor": "texto",
  "razon_social": "texto",
  "numero_factura": "texto",
  "subtotal": número (base gravada con IVA 15%),
  "subtotal_exento": número (base 0% o exenta),
  "iva": número,
  "total": número
}

XML:
${texto}`
      }]

      setMensajeIA('🤖 Extrayendo datos de la factura...')

      const response = await fetch('/api/leer-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      })

      const data = await response.json()
      if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      if (!data.content) throw new Error('Sin respuesta de IA')
      const textoResp = data.content.map(c => c.text || '').join('').trim()
      const clean = textoResp.replace(/```json|```/g, '').trim()
      const extraido = JSON.parse(clean)

      // Abrir el modal precargado con lo que extrajo la IA, para revisar/editar antes de guardar
      setEditandoId(null)
      setFFecha(extraido.fecha || new Date().toISOString().split('T')[0])
      setFTipo(extraido.tipo === 'venta' ? 'venta' : 'compra')
      setFRucEmisor(extraido.ruc_emisor || '')
      setFRazon(extraido.razon_social || '')
      setFNumero(extraido.numero_factura || '')
      setFSubtotal(extraido.subtotal?.toString() || '')
      setFSubtotalExento(extraido.subtotal_exento?.toString() || '')
      setFNota('Importado desde XML')
      setError('')
      setMostrarForm(true)
      setMensajeIA('✅ Datos extraídos. Revisa y guarda.')
    } catch (err) {
      console.error(err)
      setMensajeIA('❌ No se pudo leer el XML. Puedes ingresar la factura manualmente.')
    }

    setProcesandoIA(false)
    e.target.value = ''
  }

  // ---------- CRUD facturas ----------
  function abrirNueva() {
    setEditandoId(null)
    setFFecha(new Date().toISOString().split('T')[0])
    setFTipo('compra')
    setFRucEmisor('')
    setFRazon('')
    setFNumero('')
    setFSubtotal('')
    setFSubtotalExento('')
    setFNota('')
    setError('')
    setMostrarForm(true)
  }

  function abrirEditar(f) {
    setEditandoId(f.id)
    setFFecha(f.fecha)
    setFTipo(f.tipo)
    setFRucEmisor(f.ruc_emisor || '')
    setFRazon(f.razon_social || '')
    setFNumero(f.numero_factura || '')
    setFSubtotal(String(f.subtotal || ''))
    setFSubtotalExento(String(f.subtotal_exento || ''))
    setFNota(f.nota || '')
    setError('')
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
    setError('')
  }

  async function guardarFactura() {
    setError('')
    if (!fFecha || !fTipo) { setError('Fecha y tipo son obligatorios'); return }

    const subtotal = parseFloat(fSubtotal) || 0
    const subtotalExento = parseFloat(fSubtotalExento) || 0
    if (subtotal <= 0 && subtotalExento <= 0) {
      setError('Ingresa al menos un subtotal (gravado o exento)')
      return
    }

    const iva = subtotal * TARIFA_IVA
    const total = subtotal + subtotalExento + iva

    const payload = {
      user_id: user.id,
      fecha: fFecha,
      tipo: fTipo,
      ruc_emisor: fRucEmisor || null,
      razon_social: fRazon || null,
      numero_factura: fNumero || null,
      subtotal,
      subtotal_exento: subtotalExento,
      iva,
      total,
      origen: (fNota && fNota.includes('XML')) ? 'xml' : 'manual',
      nota: fNota || null
    }

    if (editandoId) {
      const { error: dbErr } = await supabase.from('facturas_sri').update(payload).eq('id', editandoId)
      if (dbErr) { setError('No se pudo actualizar'); return }
    } else {
      const { error: dbErr } = await supabase.from('facturas_sri').insert(payload)
      if (dbErr) { setError('No se pudo guardar'); return }
    }

    cerrarForm()
    recargarFacturas()
  }

  async function eliminarFactura(id) {
    if (!confirm('¿Eliminar esta factura?')) return
    await supabase.from('facturas_sri').delete().eq('id', id)
    recargarFacturas()
  }

  // ---------- Cálculos derivados de facturas ----------
  const ivaFacturasVenta = facturas.filter(f => f.tipo === 'venta').reduce((s, f) => s + parseFloat(f.iva || 0), 0)
  const ivaFacturasCompra = facturas.filter(f => f.tipo === 'compra').reduce((s, f) => s + parseFloat(f.iva || 0), 0)
  const saldoFacturas = ivaFacturasVenta - ivaFacturasCompra
  const baseVentas = facturas.filter(f => f.tipo === 'venta').reduce((s, f) => s + parseFloat(f.subtotal || 0), 0)
  const baseCompras = facturas.filter(f => f.tipo === 'compra').reduce((s, f) => s + parseFloat(f.subtotal || 0), 0)

  // Calendario
  const dia = diaDeclaracion(rucCalendario)
  const proxima = proximaFechaDeclaracion(rucCalendario)
  const dias = diasRestantes(proxima)

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
                SRI e IVA
              </h1>
              <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>IVA, obligaciones y comprobantes electrónicos</p>
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

        {/* RESUMEN IVA (desde facturas) */}
        <div className="mb-8">
          <h2 className={`font-bold text-sm mb-1 ${text}`}>Resumen de IVA</h2>
          <p className={`text-xs mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            Calculado desde tus facturas registradas (ventas y compras). El IVA solo se sustenta con comprobantes, por eso se calcula sobre facturas y no sobre movimientos bancarios sueltos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`rounded-2xl border p-5 ${card}`}>
              <p className={`text-xs font-semibold mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>IVA cobrado (ventas)</p>
              <p className="text-2xl font-black text-emerald-400">${ivaFacturasVenta.toFixed(2)}</p>
              <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Base gravada: ${baseVentas.toFixed(2)}</p>
            </div>
            <div className={`rounded-2xl border p-5 ${card}`}>
              <p className={`text-xs font-semibold mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>IVA pagado (compras)</p>
              <p className="text-2xl font-black text-red-400">${ivaFacturasCompra.toFixed(2)}</p>
              <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Base gravada: ${baseCompras.toFixed(2)}</p>
            </div>
            <div className={`rounded-2xl border-2 p-5 ${saldoFacturas >= 0 ? 'border-pink-500 bg-pink-500/5' : 'border-emerald-500 bg-emerald-500/5'}`}>
              <p className={`text-xs font-semibold mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {saldoFacturas >= 0 ? 'IVA a pagar' : 'Saldo a favor'}
              </p>
              <p className={`text-2xl font-black ${saldoFacturas >= 0 ? 'text-pink-400' : 'text-emerald-400'}`}>
                ${Math.abs(saldoFacturas).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* CALENDARIO TRIBUTARIO */}
        <div className={`rounded-2xl border p-6 mb-8 ${card}`}>
          <h2 className={`font-bold text-sm mb-1 ${text}`}>📅 Calendario de obligaciones</h2>
          <p className={`text-xs mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            La fecha máxima de declaración del IVA depende del 9no dígito de tu RUC. Se calcula automáticamente, pero puedes editarlo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Tu RUC</label>
              <input
                type="text"
                value={rucCalendario}
                onChange={e => setRucCalendario(e.target.value)}
                placeholder="1792345678001"
                className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all ${inputClass}`}
              />
              {dia && (
                <p className={`text-xs mt-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  9no dígito: <span className="font-bold" style={{ color: '#E91E8C' }}>{rucCalendario.replace(/\D/g, '').charAt(8)}</span> → declaras hasta el día <span className="font-bold">{dia}</span> de cada mes.
                </p>
              )}
            </div>

            <div className={`md:col-span-2 rounded-xl p-5 ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              {dia ? (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Próxima declaración de IVA</p>
                    <p className={`text-lg font-bold ${text}`}>{formatearFecha(proxima)}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-center ${dias !== null && dias <= 5 ? 'bg-red-500/20 text-red-400' : dias !== null && dias <= 12 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    <p className="text-2xl font-black">{dias}</p>
                    <p className="text-xs font-medium">{dias === 1 ? 'día restante' : 'días restantes'}</p>
                  </div>
                </div>
              ) : (
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Ingresa un RUC válido (13 dígitos) para ver tu fecha de declaración.
                </p>
              )}
            </div>
          </div>

          {/* Tabla referencial de todos los dígitos */}
          <div className="mt-6">
            <p className={`text-xs font-semibold mb-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Referencia: día de declaración según 9no dígito del RUC</p>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {Object.entries(fechasPorDigito).map(([digito, diaDecl]) => {
                const esMio = dia && rucCalendario.replace(/\D/g, '').charAt(8) === digito
                return (
                  <div key={digito}
                    className={`rounded-lg p-2 text-center border ${esMio ? 'border-pink-500 bg-pink-500/10' : dark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`text-xs font-bold ${esMio ? 'text-pink-400' : text}`}>{digito}</p>
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>día {diaDecl}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* SUBIR XML CON IA */}
        <div className={`rounded-2xl border p-6 mb-6 ${card}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #E91E8C22, #9C27B022)', border: '1px solid #E91E8C55' }}>
              🤖
            </div>
            <div>
              <h2 className={`font-bold text-sm ${text}`}>Importar comprobante XML</h2>
              <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Sube el XML del SRI — la IA extrae los datos y podrás revisarlos antes de guardar</p>
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
                <p className={`text-sm font-semibold ${text}`}>Arrastra o haz clic para subir XML</p>
                <p className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Comprobante electrónico (.xml)</p>
              </div>
            )}
            <input type="file" accept=".xml,text/xml,application/xml" onChange={procesarXml} disabled={procesandoIA} className="hidden" />
          </label>

          {mensajeIA && !procesandoIA && (
            <div className={`mt-3 text-sm px-4 py-2 rounded-lg border ${mensajeIA.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
              {mensajeIA}
            </div>
          )}
        </div>

        {/* FACTURAS REGISTRADAS */}
        <div className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className={`font-bold text-sm ${text}`}>🧾 Facturas registradas</h2>
              <p className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {facturas.length} {facturas.length === 1 ? 'factura' : 'facturas'} · sube un XML o agrégalas manualmente
              </p>
            </div>
            <button onClick={abrirNueva}
              className="text-xs px-4 py-2 rounded-lg font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
              + Agregar factura
            </button>
          </div>

          {facturas.length === 0 ? (
            <div className="py-10 text-center">
              <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No hay facturas todavía. Sube un XML o agrégala manualmente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-left ${dark ? 'text-gray-400 border-gray-800' : 'text-gray-500 border-gray-200'} border-b`}>
                    <th className="py-2 pr-4 font-semibold">Fecha</th>
                    <th className="py-2 pr-4 font-semibold">Tipo</th>
                    <th className="py-2 pr-4 font-semibold">Emisor</th>
                    <th className="py-2 pr-4 font-semibold text-right">Base 15%</th>
                    <th className="py-2 pr-4 font-semibold text-right">Exento</th>
                    <th className="py-2 pr-4 font-semibold text-right">IVA</th>
                    <th className="py-2 pr-4 font-semibold text-right">Total</th>
                    <th className="py-2 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map(f => (
                    <tr key={f.id} className={`border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
                      <td className={`py-2 pr-4 ${text}`}>{f.fecha}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${f.tipo === 'venta' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {f.tipo}
                        </span>
                      </td>
                      <td className={`py-2 pr-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="block truncate max-w-[160px]">{f.razon_social || f.ruc_emisor || '—'}</span>
                        {f.origen === 'xml' && <span className="text-pink-400 text-xs">XML</span>}
                      </td>
                      <td className={`py-2 pr-4 text-right ${text}`}>${parseFloat(f.subtotal || 0).toFixed(2)}</td>
                      <td className={`py-2 pr-4 text-right ${dark ? 'text-gray-400' : 'text-gray-500'}`}>${parseFloat(f.subtotal_exento || 0).toFixed(2)}</td>
                      <td className={`py-2 pr-4 text-right ${text}`}>${parseFloat(f.iva || 0).toFixed(2)}</td>
                      <td className={`py-2 pr-4 text-right font-bold ${text}`}>${parseFloat(f.total || 0).toFixed(2)}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button onClick={() => abrirEditar(f)} className="text-gray-400 hover:text-pink-400 text-xs mr-3 transition-colors">Editar</button>
                        <button onClick={() => eliminarFactura(f.id)} className="text-gray-400 hover:text-red-400 text-xs transition-colors">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* NOTA */}
        <div className={`mt-8 p-5 rounded-2xl border ${card}`}>
          <h3 className={`font-bold mb-2 flex items-center gap-2 ${text}`}>ℹ️ Importante</h3>
          <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Los cálculos de IVA y fechas son referenciales y se basan en la tarifa general del {(TARIFA_IVA * 100).toFixed(0)}% y el calendario estándar del SRI. Algunos bienes y servicios tienen tarifa 0% o son exentos. Consulta siempre con tu contador y verifica las fechas oficiales en el portal del SRI para tu caso.
          </p>
        </div>

      </div>

      {/* MODAL FACTURA */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className={`rounded-2xl border p-8 w-full max-w-lg my-8 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h2 className={`font-bold text-lg mb-6 ${text}`}>
              {editandoId ? 'Editar factura' : 'Nueva factura'}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Fecha</label>
                <input type="date" value={fFecha} onChange={e => setFFecha(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Tipo</label>
                <select value={fTipo} onChange={e => setFTipo(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`}>
                  <option value="compra">Compra (IVA pagado)</option>
                  <option value="venta">Venta (IVA cobrado)</option>
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>RUC emisor</label>
                <input type="text" value={fRucEmisor} onChange={e => setFRucEmisor(e.target.value)} placeholder="Opcional"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Razón social</label>
                <input type="text" value={fRazon} onChange={e => setFRazon(e.target.value)} placeholder="Opcional"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>N° factura</label>
                <input type="text" value={fNumero} onChange={e => setFNumero(e.target.value)} placeholder="001-001-000..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Base gravada 15%</label>
                <input type="number" step="0.01" value={fSubtotal} onChange={e => setFSubtotal(e.target.value)} placeholder="0.00"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Base exenta / 0%</label>
                <input type="number" step="0.01" value={fSubtotalExento} onChange={e => setFSubtotalExento(e.target.value)} placeholder="0.00"
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Nota (opcional)</label>
                <input type="text" value={fNota} onChange={e => setFNota(e.target.value)} placeholder="Detalle adicional..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`} />
              </div>
            </div>

            {/* Preview de cálculo */}
            <div className={`mt-4 p-3 rounded-lg text-sm ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
              IVA calculado ({(TARIFA_IVA * 100).toFixed(0)}%): <span className="font-bold" style={{ color: '#E91E8C' }}>${((parseFloat(fSubtotal) || 0) * TARIFA_IVA).toFixed(2)}</span>
              {' · '}Total: <span className="font-bold">${(((parseFloat(fSubtotal) || 0) * (1 + TARIFA_IVA)) + (parseFloat(fSubtotalExento) || 0)).toFixed(2)}</span>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={cerrarForm}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${dark ? 'text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700' : 'text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200'}`}>
                Cancelar
              </button>
              <button onClick={guardarFactura}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}>
                {editandoId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}