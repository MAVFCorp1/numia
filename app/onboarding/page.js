'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const SECTORES = [
  'Comercio',
  'Servicios',
  'Manufactura',
  'Construcción',
  'Tecnología',
  'Salud',
  'Educación',
  'Alimentos y bebidas',
  'Turismo',
  'Agricultura',
  'Transporte',
  'Finanzas',
  'Otro'
]

const TAMANOS = [
  { value: 'pequena', label: 'Pequeña', desc: 'Hasta 9 empleados' },
  { value: 'mediana', label: 'Mediana', desc: '10 a 49 empleados' },
  { value: 'grande', label: 'Grande', desc: '50 o más empleados' }
]

const PLANES = [
  {
    value: 'gratis',
    nombre: 'Gratis',
    precio: '$0',
    periodo: '/mes',
    desc: 'Para empezar a organizar tus finanzas',
    features: ['Hasta 50 movimientos/mes', 'Categorización automática', '1 presupuesto activo']
  },
  {
    value: 'pro',
    nombre: 'Pro',
    precio: '$13.99',
    periodo: '/mes',
    desc: 'Para quienes quieren control total',
    features: ['Movimientos ilimitados', 'IA para leer balances y facturas', 'Alertas y sugerencias', 'Activos, pasivos y net worth', 'Deducibles y SRI'],
    destacado: true
  },
  {
    value: 'contador',
    nombre: 'Con Contador',
    precio: 'Desde $50',
    periodo: '/mes',
    desc: 'Un contador sube tu declaración por ti',
    features: ['Todo lo de Pro', 'Un contador sube tu declaración', 'Revisión profesional', 'Hasta 50 gastos y 30 ingresos', 'Soporte prioritario']
  }
]

export default function Onboarding() {
  const [paso, setPaso] = useState(1)
  const [tipo, setTipo] = useState('')
  const [nombre, setNombre] = useState('')
  const [ruc, setRuc] = useState('')
  const [sector, setSector] = useState('')
  const [tamanoEmpresa, setTamanoEmpresa] = useState('')
  const [plan, setPlan] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function precargarNombre() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.nombre) {
        setNombre(user.user_metadata.nombre)
      }
    }
    precargarNombre()
  }, [])

  function seleccionarTipo(t) {
    setTipo(t)
    setError('')
    setPaso(2)
  }

  function avanzarPaso2() {
    setError('')
    if (!nombre) {
      setError(tipo === 'empresa' ? 'Ingresa el nombre comercial' : 'Ingresa tu nombre')
      return
    }
    if (tipo === 'empresa' && !tamanoEmpresa) {
      setError('Selecciona el tamaño de tu empresa')
      return
    }
    setPaso(3)
  }

  async function finalizar() {
    setError('')
    if (!plan) {
      setError('Selecciona un plan para continuar')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('No se pudo verificar tu sesión. Inicia sesión de nuevo')
      setLoading(false)
      return
    }

    const payload = {
      user_id: user.id,
      tipo,
      nombre,
      ruc: ruc || null,
      sector: sector || null,
      plan
    }

    if (tipo === 'empresa') {
      payload.tamano_empresa = tamanoEmpresa
    }

    const { error: dbError } = await supabase.from('profiles').insert(payload)

    if (dbError) {
      setError('No se pudo guardar tu perfil. Intenta de nuevo')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  function volver() {
    setError('')
    setPaso(paso - 1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #E91E8C, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #9C27B0, transparent)' }} />
      </div>

      <div className="w-full max-w-2xl px-6 relative z-10 py-10">

        {/* Logo */}
        <div className="text-center mb-6">
          <img src="/Logo Numia.png" alt="Numia" className="h-32 w-auto mx-auto mb-2" />
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={
                  n <= paso
                    ? { background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', color: '#fff' }
                    : { background: '#1f2937', color: '#6b7280' }
                }
              >
                {n}
              </div>
              {n < 3 && (
                <div
                  className="w-10 h-0.5"
                  style={{ background: n < paso ? '#E91E8C' : '#374151' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          {/* PASO 1: Tipo de cuenta */}
          {paso === 1 && (
            <>
              <h2 className="text-white font-bold text-lg mb-1">¿Cómo vas a usar Numia?</h2>
              <p className="text-gray-400 text-sm mb-6">Esto nos ayuda a personalizar tu experiencia</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-left relative opacity-60 cursor-not-allowed">
                  <span
                    className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(156,39,176,0.2)', color: '#CE93D8', border: '1px solid rgba(156,39,176,0.4)' }}
                  >
                    Próximamente
                  </span>
                  <div
                    className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl grayscale"
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}
                  >
                    🏢
                  </div>
                  <p className="text-white font-bold mb-1">Empresa</p>
                  <p className="text-gray-400 text-xs">Gestiona las finanzas de tu negocio</p>
                </div>

                <button
                  onClick={() => seleccionarTipo('persona')}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-left transition-all hover:scale-105 hover:border-pink-500"
                >
                  <div
                    className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl"
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}
                  >
                    👤
                  </div>
                  <p className="text-white font-bold mb-1">Persona</p>
                  <p className="text-gray-400 text-xs">Organiza tus finanzas personales</p>
                </button>
              </div>
            </>
          )}

          {/* PASO 2: Datos según tipo */}
          {paso === 2 && (
            <>
              <h2 className="text-white font-bold text-lg mb-1">
                {tipo === 'empresa' ? 'Datos de tu empresa' : 'Tus datos'}
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                {tipo === 'empresa' ? 'Cuéntanos sobre tu negocio' : 'Cuéntanos un poco sobre ti'}
              </p>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">
                  {tipo === 'empresa' ? 'Nombre comercial' : 'Nombre completo'}
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder={tipo === 'empresa' ? 'Ej: Mi Empresa S.A.' : 'Tu nombre'}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
                />
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">
                  RUC <span className="text-gray-600 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={ruc}
                  onChange={e => setRuc(e.target.value)}
                  placeholder="1792345678001"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
                />
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 mb-1.5 block">
                  Sector <span className="text-gray-600 font-normal">(opcional)</span>
                </label>
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                >
                  <option value="">Selecciona un sector</option>
                  {SECTORES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {tipo === 'empresa' && (
                <div className="mb-6">
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Tamaño de la empresa</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TAMANOS.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTamanoEmpresa(t.value)}
                        className="rounded-xl p-3 text-left transition-all border"
                        style={
                          tamanoEmpresa === t.value
                            ? { background: 'rgba(233,30,140,0.1)', borderColor: '#E91E8C' }
                            : { background: '#1f2937', borderColor: '#374151' }
                        }
                      >
                        <p className="text-white text-xs font-bold mb-0.5">{t.label}</p>
                        <p className="text-gray-500 text-[10px]">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={volver}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300 bg-gray-800 border border-gray-700 transition-all hover:bg-gray-700"
                >
                  ← Atrás
                </button>
                <button
                  onClick={avanzarPaso2}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
                >
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* PASO 3: Plan */}
          {paso === 3 && (
            <>
              <h2 className="text-white font-bold text-lg mb-1">Elige tu plan</h2>
              <p className="text-gray-400 text-sm mb-6">Puedes cambiarlo cuando quieras desde tu cuenta</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {PLANES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPlan(p.value)}
                    className="rounded-xl p-5 text-left transition-all border relative"
                    style={
                      plan === p.value
                        ? { background: 'rgba(233,30,140,0.08)', borderColor: '#E91E8C' }
                        : { background: '#1f2937', borderColor: p.destacado ? '#9C27B0' : '#374151' }
                    }
                  >
                    {p.destacado && (
                      <span
                        className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}
                      >
                        Popular
                      </span>
                    )}
                    <p className="text-white font-bold text-sm mb-1">{p.nombre}</p>
                    <p className="mb-2">
                      <span className="text-white font-bold text-xl">{p.precio}</span>
                      <span className="text-gray-500 text-xs">{p.periodo}</span>
                    </p>
                    <p className="text-gray-500 text-[11px] mb-3">{p.desc}</p>
                    <ul className="space-y-1">
                      {p.features.map(f => (
                        <li key={f} className="text-gray-400 text-[10px] flex items-start gap-1">
                          <span className="text-pink-400">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={volver}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300 bg-gray-800 border border-gray-700 transition-all hover:bg-gray-700 disabled:opacity-50"
                >
                  ← Atrás
                </button>
                <button
                  onClick={finalizar}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                  style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
                >
                  {loading ? '⏳ Guardando...' : 'Finalizar →'}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">© 2025 Numia · Finanzas inteligentes para Ecuador</p>
      </div>
    </div>
  )
}