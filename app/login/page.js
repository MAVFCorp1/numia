'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Correo o contraseña incorrectos'); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-medium text-gray-900">Nu<span className="text-emerald-600">mia</span></h1>
          <p className="text-sm text-gray-500 mt-1">Tu copiloto financiero</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Correo electrónico</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            placeholder="tu@empresa.com"/>
        </div>
        <div className="mb-6">
          <label className="text-xs text-gray-500 mb-1 block">Contraseña</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            placeholder="••••••••"/>
        </div>
        <button onClick={handleLogin} disabled={loading}
          className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="text-center text-xs text-gray-500 mt-4">
          ¿No tienes cuenta? <a href="/register" className="text-emerald-600">Crear cuenta</a>
        </p>
      </div>
    </div>
  )
}
