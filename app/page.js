'use client'
import { useState } from 'react'

const FEATURES = [
  {
    icon: '🤖',
    titulo: 'Categorización automática',
    desc: 'Numia reconoce tus movimientos y los clasifica por categoría sin que muevas un dedo.'
  },
  {
    icon: '📊',
    titulo: 'Ratios financieros',
    desc: 'Visualiza 6 indicadores clave de tu salud financiera con semáforo de alertas en tiempo real.'
  },
  {
    icon: '📄',
    titulo: 'Lectura de balances con IA',
    desc: 'Sube tu Excel o PDF y deja que la inteligencia artificial extraiga la información por ti.'
  },
  {
    icon: '💰',
    titulo: 'Presupuestos inteligentes',
    desc: 'Define límites por categoría y recibe alertas antes de que te pases del presupuesto.'
  },
  {
    icon: '🧾',
    titulo: 'Gastos deducibles',
    desc: 'Identifica automáticamente qué gastos puedes deducir para optimizar tus impuestos.'
  },
  {
    icon: '🏛️',
    titulo: 'Integración con el SRI',
    desc: 'Mantén tus finanzas alineadas con la normativa tributaria ecuatoriana sin complicaciones.'
  }
]

const PASOS = [
  {
    numero: '01',
    titulo: 'Crea tu cuenta',
    desc: 'Regístrate gratis en menos de un minuto, sin tarjeta de crédito.'
  },
  {
    numero: '02',
    titulo: 'Conecta tus movimientos',
    desc: 'Sube tus balances o agrégalos manualmente. Numia los organiza por ti.'
  },
  {
    numero: '03',
    titulo: 'Toma mejores decisiones',
    desc: 'Visualiza tus ratios, presupuestos y deducibles en un solo lugar, siempre actualizado.'
  }
]

const PLANES = [
  {
    nombre: 'Gratis',
    precio: '$0',
    periodo: '/mes',
    desc: 'Para empezar a organizar tus finanzas',
    features: ['Hasta 50 movimientos/mes', 'Categorización básica', '1 presupuesto activo']
  },
  {
    nombre: 'Pro',
    precio: '$9',
    periodo: '/mes',
    desc: 'Para profesionales y emprendedores',
    features: ['Movimientos ilimitados', 'IA para leer balances', 'Ratios financieros', 'Presupuestos ilimitados'],
    destacado: true
  },
  {
    nombre: 'Empresarial',
    precio: '$29',
    periodo: '/mes',
    desc: 'Para empresas con equipos',
    features: ['Todo lo de Pro', 'Múltiples usuarios', 'Reportes SRI', 'Soporte prioritario']
  }
]

export default function Landing() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="min-h-screen bg-gray-950">

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/Logo Numia.png" alt="Numia" className="h-9 w-auto" />
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Funciones</a>
            <a href="#como-funciona" className="text-sm text-gray-400 hover:text-white transition-colors">Cómo funciona</a>
            <a href="#planes" className="text-sm text-gray-400 hover:text-white transition-colors">Planes</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/login" className="text-sm text-gray-300 hover:text-white transition-colors font-semibold px-4 py-2">
              Iniciar sesión
            </a>
            <a
              href="/register"
              className="text-sm font-bold text-white px-5 py-2.5 rounded-xl transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
            >
              Crear cuenta gratis
            </a>
          </div>

          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="md:hidden text-gray-300 text-2xl"
          >
            {menuAbierto ? '✕' : '☰'}
          </button>
        </div>

        {menuAbierto && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 px-6 py-4 flex flex-col gap-4">
            <a href="#features" onClick={() => setMenuAbierto(false)} className="text-sm text-gray-300">Funciones</a>
            <a href="#como-funciona" onClick={() => setMenuAbierto(false)} className="text-sm text-gray-300">Cómo funciona</a>
            <a href="#planes" onClick={() => setMenuAbierto(false)} className="text-sm text-gray-300">Planes</a>
            <a href="/login" className="text-sm text-gray-300 font-semibold">Iniciar sesión</a>
            <a
              href="/register"
              className="text-sm font-bold text-white px-5 py-2.5 rounded-xl text-center"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}
            >
              Crear cuenta gratis
            </a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden pt-40 pb-24 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #E91E8C, transparent)' }} />
          <div className="absolute top-60 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #9C27B0, transparent)' }} />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div
            className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(233,30,140,0.1)', color: '#E91E8C', border: '1px solid rgba(233,30,140,0.3)' }}
          >
            ✨ Hecho para Ecuador
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Tu copiloto financiero
            <br />
            <span style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              impulsado por IA
            </span>
          </h1>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
            Numia organiza tus movimientos, calcula tus ratios financieros y te ayuda a tomar mejores decisiones, ya seas persona o empresa.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/register"
              className="w-full sm:w-auto text-sm font-bold text-white px-8 py-4 rounded-xl transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
            >
              Comenzar gratis →
            </a>
            <a
              href="#como-funciona"
              className="w-full sm:w-auto text-sm font-bold text-gray-300 px-8 py-4 rounded-xl bg-gray-900 border border-gray-800 transition-all hover:bg-gray-800"
            >
              Ver cómo funciona
            </a>
          </div>

          <p className="text-gray-600 text-xs mt-6">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Todo lo que necesitas, en un solo lugar</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Numia combina inteligencia artificial con finanzas para que dejes de perder tiempo en hojas de cálculo.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.titulo} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 transition-all hover:border-pink-500/40 hover:scale-[1.02]">
                <div
                  className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl"
                  style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}
                >
                  {f.icon}
                </div>
                <h3 className="text-white font-bold mb-2">{f.titulo}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-24 px-6 bg-gray-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Empieza en 3 pasos</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Sin curva de aprendizaje. En minutos tendrás tus finanzas organizadas.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {PASOS.map(p => (
              <div key={p.numero} className="text-center">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
                >
                  {p.numero}
                </div>
                <h3 className="text-white font-bold mb-2">{p.titulo}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Planes para cada etapa</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Empieza gratis y crece a tu ritmo. Cambia de plan cuando quieras.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PLANES.map(p => (
              <div
                key={p.nombre}
                className="rounded-2xl p-6 relative border bg-gray-900"
                style={{ borderColor: p.destacado ? '#E91E8C' : '#1f2937' }}
              >
                {p.destacado && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold text-white px-3 py-1 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}
                  >
                    Más popular
                  </span>
                )}
                <p className="text-white font-bold mb-1">{p.nombre}</p>
                <p className="mb-2">
                  <span className="text-white font-bold text-3xl">{p.precio}</span>
                  <span className="text-gray-500 text-sm">{p.periodo}</span>
                </p>
                <p className="text-gray-400 text-sm mb-5">{p.desc}</p>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="text-gray-300 text-sm flex items-start gap-2">
                      <span className="text-pink-400 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/register"
                  className="w-full block text-center py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                  style={
                    p.destacado
                      ? { background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', color: '#fff', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }
                      : { background: '#1f2937', color: '#fff', border: '1px solid #374151' }
                  }
                >
                  Elegir {p.nombre}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-12 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Toma el control de tus finanzas hoy</h2>
            <p className="text-white/80 max-w-xl mx-auto mb-8">Únete a las personas y empresas que ya confían en Numia para organizar su dinero.</p>
            <a
              href="/register"
              className="inline-block text-sm font-bold px-8 py-4 rounded-xl bg-white text-gray-900 transition-all hover:scale-105 hover:shadow-lg"
            >
              Crear cuenta gratis →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/Logo Numia.png" alt="Numia" className="h-8 w-auto" />
          <p className="text-gray-600 text-xs">© 2025 Numia · Finanzas inteligentes para Ecuador</p>
        </div>
      </footer>
    </div>
  )
}