'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Banco() {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(false)
  const [banco, setBanco] = useState('banco-pichincha')
  const supabase = createClient()

  async function handleFile(e) {
    setLoading(true)
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    const { data: { user } } = await supabase.auth.getUser()

    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/html')
    const rows = doc.querySelectorAll('tr')
    const movs = []
    const meses = {'ene':'01','feb':'02','mar':'03','abr':'04','may':'05','jun':'06','jul':'07','ago':'08','sep':'09','oct':'10','nov':'11','dic':'12'}

    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')].map(td => td.textContent.trim())
      if (cells.length >= 7 && cells[0] && cells[0].includes('-')) {
        const partes = cells[0].split('-')
        if (partes.length === 3) {
          const dia = partes[0].padStart(2,'0')
          const mes = meses[partes[1].toLowerCase().replace('.','')]||'01'
          const fecha = `2026-${mes}-${dia}`
          const debito = parseFloat(cells[4])||0
          const credito = parseFloat(cells[5])||0
          const desc = cells[3]
          if (debito > 0 || credito > 0) {
            const mov = {
              fecha,
              descripcion: desc,
              monto: credito > 0 ? credito : debito,
              tipo: credito > 0 ? 'ingreso' : 'gasto',
              cuenta: banco,
              categoria: 'otros',
              saldo: parseFloat(cells[6])||0
            }
            movs.push(mov)
            await supabase.from('movimientos').insert({
              user_id: user.id,
              fecha: mov.fecha,
              descripcion: mov.descripcion,
              monto: mov.monto,
              tipo: mov.tipo,
              cuenta: mov.cuenta,
              categoria: mov.categoria,
              nota: ''
            })
          }
        }
      }
    }
    setMovimientos(movs)
    setLoading(false)
  }

  const ingresos = movimientos.filter(m=>m.tipo==='ingreso').reduce((s,m)=>s+m.monto,0)
  const gastos = movimientos.filter(m=>m.tipo==='gasto').reduce((s,m)=>s+m.monto,0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← Dashboard</a>
        <h1 className="text-lg font-medium text-gray-900">Extracto bancario</h1>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="text-sm font-medium text-gray-900 mb-4">Selecciona tu banco</div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[['banco-pichincha','Banco Pichincha'],['banco-produbanco','Produbanco'],['banco-guayaquil','Banco Guayaquil']].map(([val,label])=>(
              <div key={val} onClick={()=>setBanco(val)}
                className={`border-2 rounded-lg p-3 text-center cursor-pointer text-sm ${banco===val?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-gray-200 text-gray-600'}`}>
                {label}
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-3">Sube el archivo XLS exportado desde tu banca en linea</div>
            <label className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer hover:bg-emerald-700">
              {loading ? 'Procesando...' : 'Seleccionar extracto'}
              <input type="file" accept=".xls,.xlsx,.html,.htm" onChange={handleFile} className="hidden"/>
            </label>
          </div>
        </div>
        {movimientos.length > 0 && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500">Movimientos</div>
                <div className="text-2xl font-medium text-gray-900">{movimientos.length}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500">Ingresos</div>
                <div className="text-2xl font-medium text-emerald-600">${ingresos.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500">Gastos</div>
                <div className="text-2xl font-medium text-red-500">${gastos.toFixed(2)}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Descripcion</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Tipo</th>
                    <th className="text-right px-4 py-3 text-xs text-gray-500">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.slice(0,20).map((m,i)=>(
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-4 py-3 text-gray-500">{m.fecha}</td>
                      <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{m.descripcion}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${m.tipo==='ingreso'?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${m.tipo==='ingreso'?'text-emerald-600':'text-red-500'}`}>
                        ${m.monto.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {movimientos.length > 20 && <div className="px-4 py-3 text-xs text-gray-500 text-center">Mostrando 20 de {movimientos.length} movimientos</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}