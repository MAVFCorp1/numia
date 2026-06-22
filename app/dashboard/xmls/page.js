'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function XMLs() {
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function parseXML(xmlStr) {
    const parser = new DOMParser()
    let doc = parser.parseFromString(xmlStr, 'text/xml')
    const authEl = doc.querySelector('autorizacion')
    if (authEl) {
      const cdata = doc.querySelector('comprobante')
      if (cdata) doc = parser.parseFromString(cdata.textContent.trim(), 'text/xml')
    }
    function get(tag) { const el = doc.querySelector(tag); return el ? el.textContent.trim() : '' }
    const items = []
    doc.querySelectorAll('detalle').forEach(d => {
      items.push({
        descripcion: d.querySelector('descripcion')?.textContent || '',
        cantidad: parseFloat(d.querySelector('cantidad')?.textContent || 0),
        total: parseFloat(d.querySelector('precioTotalSinImpuesto')?.textContent || 0)
      })
    })
    return {
      emisor: get('razonSocial'),
      ruc: get('ruc'),
      cliente: get('razonSocialComprador'),
      fecha: get('fechaEmision'),
      subtotal: parseFloat(get('totalSinImpuestos') || 0),
      total: parseFloat(get('importeTotal') || 0),
      secuencial: get('estab') + '-' + get('ptoEmi') + '-' + get('secuencial'),
      items
    }
  }

  async function handleFiles(e) {
    setLoading(true)
    const files = [...e.target.files]
    const { data: { user } } = await supabase.auth.getUser()
    const nuevas = []
    for (const file of files) {
      const text = await file.text()
      try {
        const f = parseXML(text)
        nuevas.push(f)
        await supabase.from('movimientos').insert({
          user_id: user.id,
          fecha: f.fecha.split('/').reverse().join('-'),
          descripcion: 'Factura ' + f.secuencial + ' - ' + f.emisor,
          monto: f.total,
          tipo: 'ingreso',
          cuenta: 'sri-xml',
          categoria: 'ventas',
          nota: f.cliente
        })
      } catch(err) { console.log('Error:', err) }
    }
    setFacturas(prev => [...prev, ...nuevas])
    setLoading(false)
  }

  const total = facturas.reduce((s, f) => s + f.total, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← Dashboard</a>
          <h1 className="text-lg font-medium text-gray-900">XMLs del SRI</h1>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 text-center">
          <div className="text-3xl mb-3">📄</div>
          <div className="text-sm font-medium text-gray-900 mb-2">Sube tus facturas del SRI</div>
          <div className="text-xs text-gray-500 mb-4">Acepta XMLs autorizados con autorizacion y CDATA</div>
          <label className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer hover:bg-emerald-700">
            {loading ? 'Procesando...' : 'Seleccionar XMLs'}
            <input type="file" accept=".xml" multiple onChange={handleFiles} className="hidden"/>
          </label>
        </div>
        {facturas.length > 0 && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500">Facturas cargadas</div>
                <div className="text-2xl font-medium text-gray-900">{facturas.length}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500">Total ingresos</div>
                <div className="text-2xl font-medium text-emerald-600">${total.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500">Guardado en</div>
                <div className="text-sm font-medium text-gray-900 mt-1">Base de datos ✓</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Emisor</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Factura</th>
                    <th className="text-right px-4 py-3 text-xs text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-4 py-3 text-gray-900">{f.emisor}</td>
                      <td className="px-4 py-3 text-gray-500">{f.fecha}</td>
                      <td className="px-4 py-3 text-gray-500">{f.secuencial}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">${f.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}