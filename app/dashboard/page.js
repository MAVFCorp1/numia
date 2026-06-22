'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase
        .from('movimientos')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })
      setMovimientos(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-sm">Cargando...</p>
    </div>
  )

  const ingresos = movimientos.filter(m=>m.tipo==='ingreso').reduce((s,m)=>s+parseFloat(m.monto),0)
  const gastos = movimientos.filter(m=>m.tipo==='gasto').reduce((s,m)=>s+parseFloat(m.monto),0)
  const utilidad = ingresos - gastos
  const salud = Math.min(100, Math.max(0, Math.round((utilidad/Math.max(ingresos,1))*100 + 50)))

  const porCategoria = {}
  movimientos.filter(m=>m.tipo==='gasto').forEach(m => {
    porCategoria[m.categoria] = (porCategoria[m.categoria]||0) + parseFloat(m.monto)
  })
  const topCategorias = Object.entries(porCategoria).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const maxCat = topCategorias[0]?.[1] || 1

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-medium text-gray-900">Nu<span className="text-emerald-600">mia</span></h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900">Salir</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-gray-900">Tu resumen financiero</h2>
          <div className="flex gap-3">
            <a href="/dashboard/xmls" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">+ XML SRI</a>
            <a href="/dashboard/banco" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">+ Extracto banco</a>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-500 mb-1">Total ingresos</div>
            <div className="text-2xl font-medium text-emerald-600">${ingresos.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-500 mb-1">Total gastos</div>
            <div className="text-2xl font-medium text-red-500">${gastos.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-500 mb-1">Utilidad neta</div>
            <div className={`text-2xl font-medium ${utilidad>=0?'text-emerald-600':'text-red-500'}`}>${utilidad.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-500 mb-1">Movimientos</div>
            <div className="text-2xl font-medium text-gray-900">{movimientos.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-sm font-medium text-gray-900 mb-4">Salud financiera</div>
            <div className="flex items-center gap-4 mb-3">
              <div className={`text-4xl font-medium ${salud>=70?'text-emerald-600':salud>=50?'text-amber-500':'text-red-500'}`}>{salud}</div>
              <div className="text-sm text-gray-500">{salud>=70?'Buena salud':salud>=50?'Puede mejorar':'Requiere atencion'}</div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${salud>=70?'bg-emerald-500':salud>=50?'bg-amber-500':'bg-red-500'}`} style={{width:`${salud}%`}}></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-sm font-medium text-gray-900 mb-4">Top gastos por categoria</div>
            {topCategorias.length === 0 && <div className="text-sm text-gray-400">Sin datos aun</div>}
            {topCategorias.map(([cat, val]) => (
              <div key={cat} className="flex items-center gap-3 mb-2">
                <div className="text-xs text-gray-500 w-24 truncate">{cat}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{width:`${(val/maxCat)*100}%`}}></div>
                </div>
                <div className="text-xs font-medium text-gray-900 w-16 text-right">${val.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="text-sm font-medium text-gray-900">Ultimos movimientos</div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Fecha</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Descripcion</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Cuenta</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Tipo</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.slice(0,10).map((m,i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-4 py-3 text-gray-500">{m.fecha}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{m.descripcion}</td>
                  <td className="px-4 py-3 text-gray-500">{m.cuenta}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${m.tipo==='ingreso'?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${m.tipo==='ingreso'?'text-emerald-600':'text-red-500'}`}>
                    ${parseFloat(m.monto).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {movimientos.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Sin movimientos aun. Sube un XML del SRI o un extracto bancario.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}