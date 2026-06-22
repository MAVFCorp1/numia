'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
  const [perfil, setPerfil] = useState('')
  const [nombre, setNombre] = useState('')
  const [ruc, setRuc] = useState('')
  const [sector, setSector] = useState('Comercio')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleContinuar() {
    if (!perfil) { alert('Selecciona un perfil'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').upsert({ id: user.id, tipo: perfil, nombre: nombre || user.email, ruc: ruc || null, sector: sector, plan: 'gratis' })
    router.push('/dashboard')
  }

  const cardClass = (p) => perfil === p ? 'border-2 border-emerald-500 bg-emerald-50 rounded-xl p-4 text-center cursor-pointer' : 'border-2 border-gray-200 rounded-xl p-4 text-center cursor-pointer'

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md'>
        <div className='text-center mb-6'>
          <h1 className='text-2xl font-medium text-gray-900'>Nu<span className='text-emerald-600'>mia</span></h1>
          <p className='text-sm text-gray-500 mt-1'>Como usaras Numia?</p>
        </div>
        <div className='grid grid-cols-2 gap-3 mb-6'>
          <div onClick={()=>setPerfil('persona')} className={cardClass('persona')}>
            <div className='text-2xl mb-2'>??</div>
            <div className='text-sm font-medium'>Persona natural</div>
            <div className='text-xs text-gray-500 mt-1'>Gastos y deducibles</div>
          </div>
          <div onClick={()=>setPerfil('empresa')} className={cardClass('empresa')}>
            <div className='text-2xl mb-2'>??</div>
            <div className='text-sm font-medium'>Empresa PYME</div>
            <div className='text-xs text-gray-500 mt-1'>Contabilidad y banco</div>
          </div>
        </div>
        {perfil === 'empresa' && (
          <div>
            <div className='mb-4'>
              <label className='text-xs text-gray-500 mb-1 block'>Razon social</label>
              <input type='text' value={nombre} onChange={e=>setNombre(e.target.value)} className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm' placeholder='Mi Empresa S.A.S.'/>
            </div>
            <div className='mb-4'>
              <label className='text-xs text-gray-500 mb-1 block'>RUC</label>
              <input type='text' value={ruc} onChange={e=>setRuc(e.target.value)} className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm' placeholder='1790012345001'/>
            </div>
          </div>
        )}
        <button onClick={handleContinuar} disabled={loading||!perfil} className='w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50'>
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
