'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className='min-h-screen flex items-center justify-center'><p className='text-gray-500'>Cargando...</p></div>

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between'>
        <h1 className='text-lg font-medium text-gray-900'>Nu<span className='text-emerald-600'>mia</span></h1>
        <div className='flex items-center gap-4'>
          <span className='text-sm text-gray-500'>{user.email}</span>
          <button onClick={handleLogout} className='text-sm text-gray-500 hover:text-gray-900'>Salir</button>
        </div>
      </div>
      <div className='max-w-6xl mx-auto px-6 py-8'>
        <h2 className='text-xl font-medium text-gray-900 mb-6'>Bienvenido a Numia</h2>
        <div className='grid grid-cols-4 gap-4 mb-8'>
          <div className='bg-white rounded-xl border border-gray-100 p-4'>
            <div className='text-xs text-gray-500 mb-1'>Ingresos</div>
            <div className='text-2xl font-medium text-emerald-600'>0.00</div>
          </div>
          <div className='bg-white rounded-xl border border-gray-100 p-4'>
            <div className='text-xs text-gray-500 mb-1'>Gastos</div>
            <div className='text-2xl font-medium text-red-500'>0.00</div>
          </div>
          <div className='bg-white rounded-xl border border-gray-100 p-4'>
            <div className='text-xs text-gray-500 mb-1'>Utilidad</div>
            <div className='text-2xl font-medium text-gray-900'>0.00</div>
          </div>
          <div className='bg-white rounded-xl border border-gray-100 p-4'>
            <div className='text-xs text-gray-500 mb-1'>Movimientos</div>
            <div className='text-2xl font-medium text-gray-900'>0</div>
          </div>
        </div>
        <div className='grid grid-cols-3 gap-4'>
          <div className='bg-white rounded-xl border border-gray-100 p-6 text-center cursor-pointer hover:border-emerald-300'>
            <div className='text-3xl mb-3'>??</div>
            <div className='text-sm font-medium text-gray-900'>Subir XML del SRI</div>
            <div className='text-xs text-gray-500 mt-1'>Facturas electronicas</div>
          </div>
          <div className='bg-white rounded-xl border border-gray-100 p-6 text-center cursor-pointer hover:border-emerald-300'>
            <div className='text-3xl mb-3'>??</div>
            <div className='text-sm font-medium text-gray-900'>Extracto bancario</div>
            <div className='text-xs text-gray-500 mt-1'>Pichincha, Produbanco y mas</div>
          </div>
          <div className='bg-white rounded-xl border border-gray-100 p-6 text-center cursor-pointer hover:border-emerald-300'>
            <div className='text-3xl mb-3'>??</div>
            <div className='text-sm font-medium text-gray-900'>Movimiento manual</div>
            <div className='text-xs text-gray-500 mt-1'>Ingresar transaccion</div>
          </div>
        </div>
      </div>
    </div>
  )
}
