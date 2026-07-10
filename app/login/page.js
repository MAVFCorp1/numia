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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    // Revisar si el usuario ya completó su onboarding (tiene perfil en profiles)
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', data.user.id)
      .single()

    if (perfil) {
      router.push('/dashboard')
    } else {
      router.push('/onboarding')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #E91E8C, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #9C27B0, transparent)' }} />
      </div>

      <div className="w-full max-w-md px-6 relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/Logo Numia.png" alt="Numia" className="h-60 w-auto mx-auto mb-4" />
          <p className="text-gray-400 text-sm mt-2">Tu copiloto financiero inteligente</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-white font-bold text-lg mb-6">Iniciar sesión</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="tu@empresa.com"
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
            />
          </div>

          <div className="mb-6">
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
          >
            {loading ? '⏳ Ingresando...' : 'Ingresar →'}
          </button>

          <p className="text-center text-xs text-gray-500 mt-5">
            ¿No tienes cuenta?{' '}
            <a href="/register" className="text-pink-400 hover:text-pink-300 font-semibold transition-colors">
              Crear cuenta gratis
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">© 2025 Numia · Finanzas inteligentes para Ecuador</p>
      </div>
    </div>
  )
}