'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Register() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister() {
    setError('')

    if (!nombre || !email || !password || !confirmPassword) {
      setError('Completa todos los campos')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } }
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        setError('Este correo ya está registrado')
      } else {
        setError('No se pudo crear la cuenta. Intenta de nuevo')
      }
      setLoading(false)
      return
    }

    setLoading(false)

    // Si Supabase requiere confirmación de correo, no habrá sesión activa todavía
    if (!data.session) {
      setSuccess(true)
      return
    }

    router.push('/onboarding')
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

          {success ? (
            <>
              <div className="text-center mb-2">
                <div
                  className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
                  style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}
                >
                  ✓
                </div>
                <h2 className="text-white font-bold text-lg mb-2">¡Cuenta creada!</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Revisa tu correo <span className="text-pink-400 font-semibold">{email}</span> para confirmar tu cuenta antes de iniciar sesión.
                </p>
              </div>

              <a
                href="/login"
                className="w-full block text-center py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
              >
                Ir a iniciar sesión →
              </a>
            </>
          ) : (
            <>
              <h2 className="text-white font-bold text-lg mb-6">Crear cuenta gratis</h2>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  placeholder="Tu nombre"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
                />
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  placeholder="tu@empresa.com"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
                />
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
                />
              </div>

              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  placeholder="Repite tu contraseña"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
                />
              </div>

              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
              >
                {loading ? '⏳ Creando cuenta...' : 'Crear cuenta →'}
              </button>

              <p className="text-center text-xs text-gray-500 mt-5">
                ¿Ya tienes cuenta?{' '}
                <a href="/login" className="text-pink-400 hover:text-pink-300 font-semibold transition-colors">
                  Iniciar sesión
                </a>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">© 2025 Numia · Finanzas inteligentes para Ecuador</p>
      </div>
    </div>
  )
}