'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Register() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister() {
    setError('')
    if (!nombre || !email || !password) { setError('Completa todos los campos'); return }
    if (password.length < 8) { setError('La contrasena debe tener minimo 8 caracteres'); return }
    if (password !== password2) { setError('Las contrasenas no coinciden'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { nombre } } })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/onboarding')
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md'>
        <div className='text-center mb-6'>
          <h1 className='text-2xl font-medium text-gray-900'>Nu<span className='text-emerald-600'>mia</span></h1>
          <p className='text-sm text-gray-500 mt-1'>Crea tu cuenta gratis</p>
        </div>
        {error && <div className='bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4'>{error}</div>}
        <div className='mb-4'>
          <label className='text-xs text-gray-500 mb-1 block'>Nombre</label>
          <input type='text' value={nombre} onChange={e=>setNombre(e.target.value)}
            className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500'
            placeholder='Tu nombre'/>
        </div>
        <div className='mb-4'>
          <label className='text-xs text-gray-500 mb-1 block'>Correo electronico</label>
          <input type='email' value={email} onChange={e=>setEmail(e.target.value)}
            className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500'
            placeholder='tu@empresa.com'/>
        </div>
        <div className='mb-4'>
          <label className='text-xs text-gray-500 mb-1 block'>Contrasena</label>
          <input type='password' value={password} onChange={e=>setPassword(e.target.value)}
            className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500'
            placeholder='Minimo 8 caracteres'/>
        </div>
        <div className='mb-6'>
          <label className='text-xs text-gray-500 mb-1 block'>Confirmar contrasena</label>
          <input type='password' value={password2} onChange={e=>setPassword2(e.target.value)}
            className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500'
            placeholder='Repite tu contrasena'/>
        </div>
        <button onClick={handleRegister} disabled={loading}
          className='w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50'>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
        <p className='text-center text-xs text-gray-500 mt-4'>
          Ya tienes cuenta? <a href='/login' className='text-emerald-600'>Ingresar</a>
        </p>
      </div>
    </div>
  )
}
