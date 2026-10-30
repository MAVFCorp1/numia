'use client'
import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function XMLs() {
  const [darkMode, setDarkMode] = useState(true)
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loadingInit, setLoadingInit] = useState(true)
  const [facturas, setFacturas] = useState([])
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [editandoRuc, setEditandoRuc] = useState(false)
  const [nuevoRuc, setNuevoRuc] = useState('')
  const [guardandoRuc, setGuardandoRuc] = useState(false)
  const [errorRuc, setErrorRuc] = useState('')
  const supabase = createClient()

  useEffect(() => { inicializar() }, [])

  async function inicializar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)
    const [{ data: pref }, { data: prof }] = await Promise.all([
      supabase.from('preferencias').select('tema').eq('user_id', user.id).single(),
      supabase.from('profiles').select('*').eq('user_id', user.id).single()
    ])
    if (pref) setDarkMode(pref.tema === 'oscuro')
    if (prof) setPerfil(prof)
    setLoadingInit(false)
  }

  async function toggleDark() {
    const nuevo = !darkMode
    setDarkMode(nuevo)
    if (user) await supabase.from('preferencias').upsert({ user_id: user.id, tema: nuevo ? 'oscuro' : 'claro' }, { onConflict: 'user_id' })
  }

  async function guardarRuc() {
    setErrorRuc('')
    const limpio = nuevoRuc.replace(/\D/g, '')
    if (limpio.length !== 13) {
      setErrorRuc('El RUC debe tener 13 dígitos')
      return
    }
    setGuardandoRuc(true)
    const { error } = await supabase
      .from('profiles')
      .update({ ruc: limpio })
      .eq('user_id', user.id)

    if (error) {
      setErrorRuc('No se pudo guardar. Intenta de nuevo')
      setGuardandoRuc(false)
      return
    }

    setPerfil(prev => ({ ...prev, ruc: limpio }))
    setEditandoRuc(false)
    setGuardandoRuc(false)
    setNuevoRuc('')
  }

  // Limpia el RUC dejando solo dígitos, para comparaciones confiables
  function soloDigitos(v) {
    return String(v || '').replace(/\D/g, '')
  }

  function parseXML(xmlStr) {
    const parser = new DOMParser()
    let doc = parser.parseFromString(xmlStr, 'text/xml')
    const authEl = doc.querySelector('autorizacion')
    if (authEl) {
      const cdata = doc.querySelector('comprobante')
      if (cdata) doc = parser.parseFromString(cdata.textContent.trim(), 'text/xml')
    }
    function get(tag) { const el = doc.querySelector(tag); return el ? el.textContent.trim() : '' }

    // Sumar IVA de los impuestos (código 2 = IVA en el SRI). Fallback: total - subtotal.
    let iva = 0
    doc.querySelectorAll('totalImpuesto').forEach(t => {
      const codigo = t.querySelector('codigo')?.textContent?.trim()
      if (codigo === '2') {
        iva += parseFloat(t.querySelector('valor')?.textContent || 0)
      }
    })

    const subtotal = parseFloat(get('totalSinImpuestos') || 0)
    const total = parseFloat(get('importeTotal') || 0)
    if (iva === 0 && total > subtotal) iva = total - subtotal

    return {
      emisor: get('razonSocial'),
      rucEmisor: get('ruc'),
      cliente: get('razonSocialComprador'),
      rucComprador: get('identificacionComprador'),
      fecha: get('fechaEmision'),
      subtotal,
      iva,
      total,
      secuencial: get('estab') + '-' + get('ptoEmi') + '-' + get('secuencial')
    }
  }

  // Convierte fecha dd/mm/yyyy a yyyy-mm-dd; si ya viene ISO la deja igual
  function normalizarFecha(fechaStr) {
    if (!fechaStr) return new Date().toISOString().split('T')[0]
    if (fechaStr.includes('/')) return fechaStr.split('/').reverse().join('-')
    return fechaStr.split('T')[0]
  }

  // ---------- Extracción con IA para PDF / imagen / Excel (formatos sin estructura XML fija) ----------
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

  // Devuelve el mismo shape que parseXML(), para que el resto del flujo no distinga el origen
  async function extraerFacturaConIA(file) {
    const nombre = file.name.toLowerCase()
    const instrucciones = `Eres un experto en comprobantes electrónicos del SRI de Ecuador.
Analiza este comprobante (factura) y extrae los datos.
Responde SOLO con un JSON válido, sin markdown ni explicaciones:
{
  "emisor": "razón social del emisor",
  "rucEmisor": "RUC del emisor (13 dígitos)",
  "cliente": "razón social del comprador/cliente",
  "rucComprador": "RUC o cédula del comprador",
  "fecha": "YYYY-MM-DD",
  "subtotal": número (base gravada, sin IVA),
  "iva": número,
  "total": número,
  "secuencial": "número de factura, ej: 001-001-000000123"
}`

    let content
    if (nombre.endsWith('.pdf')) {
      const base64 = await leerArchivoBase64(file)
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: instrucciones }
      ]
    } else if (nombre.match(/\.(png|jpe?g)$/)) {
      const base64 = await leerArchivoBase64(file)
      const mediaType = nombre.endsWith('.png') ? 'image/png' : 'image/jpeg'
      content = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: instrucciones }
      ]
    } else {
      const texto = await leerExcelTexto(file)
      content = `${instrucciones}\n\nDatos del archivo:\n${texto}`
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
    const extraido = JSON.parse(clean)

    return {
      emisor: extraido.emisor || '',
      rucEmisor: extraido.rucEmisor || '',
      cliente: extraido.cliente || '',
      rucComprador: extraido.rucComprador || '',
      fecha: extraido.fecha || '',
      subtotal: parseFloat(extraido.subtotal) || 0,
      iva: parseFloat(extraido.iva) || 0,
      total: parseFloat(extraido.total) || 0,
      secuencial: extraido.secuencial || ''
    }
  }

  async function handleFiles(e) {
    const files = [...e.target.files]
    if (files.length === 0) return
    setProcesando(true)
    setMensaje('Procesando comprobantes...')

    const miRuc = soloDigitos(perfil?.ruc)
    const nuevas = []
    let errores = 0

    for (const file of files) {
      try {
        const esXml = file.name.toLowerCase().endsWith('.xml')
        if (esXml) setMensaje('Procesando comprobantes...')
        else setMensaje(`🤖 Leyendo ${file.name} con IA...`)

        const f = esXml ? parseXML(await file.text()) : await extraerFacturaConIA(file)
        const fechaISO = normalizarFecha(f.fecha)

        // Detección automática: si el RUC emisor es el mío, es una VENTA (ingreso); si no, COMPRA (gasto)
        const esVenta = miRuc && soloDigitos(f.rucEmisor) === miRuc
        const tipoMov = esVenta ? 'ingreso' : 'gasto'
        const tipoFactura = esVenta ? 'venta' : 'compra'

        // 1) Guardar en movimientos (flujo de caja)
        await supabase.from('movimientos').insert({
          user_id: user.id,
          fecha: fechaISO,
          descripcion: 'Factura ' + f.secuencial + ' - ' + (esVenta ? f.cliente : f.emisor),
          monto: f.total,
          tipo: tipoMov,
          cuenta: 'sri-xml',
          categoria: esVenta ? 'ventas' : 'otros',
          nota: esVenta ? f.cliente : f.emisor
        })

        // 2) Guardar en facturas_sri (para cálculo de IVA)
        await supabase.from('facturas_sri').insert({
          user_id: user.id,
          fecha: fechaISO,
          tipo: tipoFactura,
          ruc_emisor: f.rucEmisor || null,
          razon_social: esVenta ? f.cliente : f.emisor,
          numero_factura: f.secuencial,
          subtotal: f.subtotal,
          subtotal_exento: 0,
          iva: f.iva,
          total: f.total,
          origen: 'xml',
          nota: esXml ? 'Importado desde XML masivo' : 'Importado con IA (carga masiva)'
        })

        nuevas.push({ ...f, tipoFactura, esVenta })
      } catch (err) {
        console.log('Error:', err)
        errores++
      }
    }

    setFacturas(prev => [...prev, ...nuevas])
    setProcesando(false)
    setMensaje(
      errores > 0
        ? `✅ ${nuevas.length} procesadas · ⚠️ ${errores} con error`
        : `✅ ${nuevas.length} factura(s) procesada(s) correctamente`
    )
    e.target.value = ''
  }

  const totalVentas = facturas.filter(f => f.esVenta).reduce((s, f) => s + f.total, 0)
  const totalCompras = facturas.filter(f => !f.esVenta).reduce((s, f) => s + f.total, 0)
  const ivaTotal = facturas.reduce((s, f) => s + f.iva, 0)

  const dark = darkMode
  const bg = dark ? 'bg-gray-950' : 'bg-gray-100'
  const card = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const text = dark ? 'text-gray-100' : 'text-gray-900'
  const textSub = dark ? 'text-gray-400' : 'text-gray-500'

  if (loadingInit) return (
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
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <img src="/Logo Numia.png" alt="Numia" className="h-8 w-auto" />
            </Link>
            <div className={`h-5 w-px ${dark ? 'bg-gray-700' : 'bg-gray-300'}`} />
            <div>
              <h1 className="font-bold text-sm" style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                XMLs del SRI
              </h1>
              <p className={`text-xs ${textSub}`}>Carga masiva de comprobantes electrónicos</p>
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

      <div className="max-w-5xl mx-auto px-4 py-8">

        {!perfil?.ruc && (
          <div className="mb-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-yellow-400">No tienes RUC configurado</p>
                <p className={`text-sm mt-1 ${textSub}`}>Sin RUC no podemos detectar automáticamente si un comprobante es venta o compra, así que se marcarán como compra por defecto. Configúralo aquí para mejor precisión.</p>

                {!editandoRuc ? (
                  <button
                    onClick={() => { setEditandoRuc(true); setNuevoRuc(''); setErrorRuc('') }}
                    className="mt-3 text-xs px-4 py-2 rounded-lg font-bold text-white transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
                  >
                    Configurar RUC
                  </button>
                ) : (
                  <div className="mt-3">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <input
                        type="text"
                        value={nuevoRuc}
                        onChange={e => setNuevoRuc(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && guardarRuc()}
                        placeholder="1792345678001"
                        maxLength={13}
                        className={`px-3 py-2 rounded-lg border text-sm outline-none transition-all ${dark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-pink-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-pink-500'}`}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={guardarRuc}
                          disabled={guardandoRuc}
                          className="text-xs px-4 py-2 rounded-lg font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}
                        >
                          {guardandoRuc ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => { setEditandoRuc(false); setErrorRuc('') }}
                          className={`text-xs px-4 py-2 rounded-lg font-medium border transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                    {errorRuc && <p className="text-red-400 text-xs mt-2">{errorRuc}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ZONA DE SUBIDA */}
        <div className={`rounded-2xl border p-6 mb-6 ${card}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #E91E8C22, #9C27B022)', border: '1px solid #E91E8C55' }}>
              📄
            </div>
            <div>
              <h2 className={`font-bold text-sm ${text}`}>Sube tus facturas del SRI</h2>
              <p className={`text-xs ${textSub}`}>Puedes subir varios comprobantes a la vez (XML, PDF, foto o Excel). Detectamos automáticamente venta o compra según tu RUC.</p>
            </div>
          </div>

          <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${procesando ? 'opacity-50 cursor-not-allowed' : 'hover:border-pink-500 hover:bg-pink-500/5'} ${dark ? 'border-gray-700' : 'border-gray-300'}`}>
            {procesando ? (
              <div className="text-center">
                <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-2" style={{ border: '3px solid #E91E8C', borderTopColor: 'transparent' }} />
                <p className="text-sm font-medium" style={{ color: '#E91E8C' }}>{mensaje}</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-3xl mb-2">⬆️</p>
                <p className={`text-sm font-semibold ${text}`}>Arrastra o haz clic para subir tus comprobantes</p>
                <p className={`text-xs mt-1 ${textSub}`}>XML, PDF, imagen (.png/.jpg) o Excel · varios a la vez</p>
              </div>
            )}
            <input type="file" accept=".xml,.pdf,.png,.jpg,.jpeg,.xls,.xlsx" multiple onChange={handleFiles} disabled={procesando} className="hidden" />
          </label>

          {mensaje && !procesando && (
            <div className={`mt-3 text-sm px-4 py-2 rounded-lg border ${mensaje.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
              {mensaje}
            </div>
          )}
        </div>

        {facturas.length > 0 && (
          <>
            {/* RESUMEN */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className={`rounded-2xl border p-4 ${card}`}>
                <div className={`text-xs ${textSub}`}>Facturas cargadas</div>
                <div className={`text-2xl font-black ${text}`}>{facturas.length}</div>
              </div>
              <div className={`rounded-2xl border p-4 ${card}`}>
                <div className={`text-xs ${textSub}`}>Total ventas</div>
                <div className="text-2xl font-black text-emerald-400">${totalVentas.toFixed(2)}</div>
              </div>
              <div className={`rounded-2xl border p-4 ${card}`}>
                <div className={`text-xs ${textSub}`}>Total compras</div>
                <div className="text-2xl font-black text-red-400">${totalCompras.toFixed(2)}</div>
              </div>
              <div className={`rounded-2xl border p-4 ${card}`}>
                <div className={`text-xs ${textSub}`}>IVA total</div>
                <div className="text-2xl font-black" style={{ color: '#E91E8C' }}>${ivaTotal.toFixed(2)}</div>
              </div>
            </div>

            {/* TABLA */}
            <div className={`rounded-2xl border overflow-hidden ${card}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={dark ? 'bg-gray-800' : 'bg-gray-50'}>
                    <tr>
                      {['Tipo', 'Emisor / Cliente', 'Fecha', 'Factura', 'Subtotal', 'IVA', 'Total'].map(h => (
                        <th key={h} className={`text-left px-4 py-3 text-xs font-medium ${textSub} ${['Subtotal', 'IVA', 'Total'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {facturas.map((f, i) => (
                      <tr key={i} className={`border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${f.esVenta ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {f.tipoFactura}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${text}`}>
                          <span className="block truncate max-w-[180px]">{f.esVenta ? f.cliente : f.emisor}</span>
                        </td>
                        <td className={`px-4 py-3 ${textSub}`}>{f.fecha}</td>
                        <td className={`px-4 py-3 ${textSub}`}>{f.secuencial}</td>
                        <td className={`px-4 py-3 text-right ${text}`}>${f.subtotal.toFixed(2)}</td>
                        <td className={`px-4 py-3 text-right ${text}`}>${f.iva.toFixed(2)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${f.esVenta ? 'text-emerald-400' : 'text-red-400'}`}>${f.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className={`text-xs mt-4 ${textSub}`}>
              ✓ Guardadas en tus movimientos (flujo de caja) y en el módulo SRI (para cálculo de IVA). Revisa el
              {' '}<Link href="/dashboard/sri" className="text-pink-400 hover:text-pink-300 font-semibold">módulo SRI</Link> para ver el resumen de IVA.
            </p>
          </>
        )}
      </div>
    </div>
  )
}