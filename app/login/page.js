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

  // Recuperar contraseña
  const [vistaRecuperar, setVistaRecuperar] = useState(false)
  const [emailRecuperar, setEmailRecuperar] = useState('')
  const [errorRecuperar, setErrorRecuperar] = useState('')
  const [okRecuperar, setOkRecuperar] = useState(false)
  const [loadingRecuperar, setLoadingRecuperar] = useState(false)

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

  function abrirRecuperar() {
    setEmailRecuperar(email)
    setErrorRecuperar('')
    setOkRecuperar(false)
    setVistaRecuperar(true)
  }

  function cerrarRecuperar() {
    setVistaRecuperar(false)
    setErrorRecuperar('')
    setOkRecuperar(false)
  }

  async function handleRecuperar() {
    setErrorRecuperar('')

    if (!emailRecuperar) {
      setErrorRecuperar('Ingresa tu correo electrónico')
      return
    }

    setLoadingRecuperar(true)
    const sitioBase = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperar, {
      redirectTo: `${sitioBase}/reset-password`
    })
    setLoadingRecuperar(false)

    if (error) {
      setErrorRecuperar('No se pudo enviar el correo. Intenta de nuevo en unos minutos.')
      return
    }

    setOkRecuperar(true)
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
          {!vistaRecuperar ? (
            <>
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

              <div className="mb-2">
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

              <div className="text-right mb-6">
                <button
                  type="button"
                  onClick={abrirRecuperar}
                  className="text-xs text-gray-500 hover:text-pink-400 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
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
            </>
          ) : (
            <>
              <h2 className="text-white font-bold text-lg mb-2">Recuperar contraseña</h2>

              {okRecuperar ? (
                <>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-3 rounded-lg mb-5">
                    Si el correo <strong>{emailRecuperar}</strong> tiene una cuenta con nosotros, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).
                  </div>
                  <button
                    onClick={cerrarRecuperar}
                    className="w-full py-3 rounded-xl text-sm font-bold text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all"
                  >
                    Volver a iniciar sesión
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-6">Ingresa tu correo y te enviamos un enlace para restablecer tu contraseña.</p>

                  {errorRecuperar && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">
                      {errorRecuperar}
                    </div>
                  )}

                  <div className="mb-6">
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Correo electrónico</label>
                    <input
                      type="email"
                      value={emailRecuperar}
                      onChange={e => setEmailRecuperar(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRecuperar()}
                      placeholder="tu@empresa.com"
                      className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
                    />
                  </div>

                  <button
                    onClick={handleRecuperar}
                    disabled={loadingRecuperar}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
                  >
                    {loadingRecuperar ? '⏳ Enviando...' : 'Enviar enlace de recuperación'}
                  </button>

                  <button
                    onClick={cerrarRecuperar}
                    className="w-full text-center text-xs text-gray-500 hover:text-pink-400 transition-colors mt-5"
                  >
                    ← Volver a iniciar sesión
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">© 2025 Numia · Finanzas inteligentes para Ecuador</p>
      </div>
    </div>
  )
}