'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [verificando, setVerificando] = useState(true)
  const [sesionValida, setSesionValida] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSesionValida(true)
        setVerificando(false)
      }
    })

    async function verificar() {
      // Link con token_hash (funciona en cualquier navegador/dispositivo, template de correo actualizado)
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const type = params.get('type')

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        if (!error) {
          setSesionValida(true)
          setVerificando(false)
          return
        }
      }

      // Fallback: link con ?code= (PKCE), solo funciona en el mismo navegador donde se pidió el reset.
      // Si la pestaña ya tenía una sesión de recuperación activa, getSession la confirma.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setSesionValida(true)
      setVerificando(false)
    }
    verificar()

    return () => listener?.subscription?.unsubscribe()
  }, [])

  async function handleGuardar() {
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('No se pudo actualizar la contraseña. Solicita un nuevo enlace e intenta de nuevo.')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
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
          <h2 className="text-white font-bold text-lg mb-6">Nueva contraseña</h2>

          {verificando ? (
            <p className="text-gray-400 text-sm text-center py-4">Verificando enlace...</p>
          ) : !sesionValida ? (
            <>
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">
                Este enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de inicio de sesión.
              </div>
              <a
                href="/login"
                className="block w-full text-center py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
              >
                Ir a iniciar sesión
              </a>
            </>
          ) : success ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-3 rounded-lg">
              Contraseña actualizada. Te llevamos a tu dashboard...
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-6">Elige una nueva contraseña para tu cuenta.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGuardar()}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
                />
              </div>

              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGuardar()}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
                />
              </div>

              <button
                onClick={handleGuardar}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
              >
                {loading ? '⏳ Guardando...' : 'Guardar contraseña'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">© 2025 Numia · Finanzas inteligentes para Ecuador</p>
      </div>
    </div>
  )
}
