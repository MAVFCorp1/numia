'use client'
import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────
// HOOKS DE ANIMACIÓN
// ─────────────────────────────────────────────

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revelado')
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.15 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useCountUp(target, duration = 2200, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min((t - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration])
  return val
}

// ─────────────────────────────────────────────
// VISUAL: GRÁFICA DE PATRIMONIO (SVG animada)
// ─────────────────────────────────────────────

function GraficaPatrimonio({ animar }) {
  const path = "M0,150 C60,140 90,120 140,110 C190,100 220,105 270,85 C320,65 350,70 400,48 C450,26 480,32 520,18"
  return (
    <svg viewBox="0 0 520 170" className="w-full h-auto" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineaGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E91E8C" />
          <stop offset="100%" stopColor="#9C27B0" />
        </linearGradient>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E91E8C" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#E91E8C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L520,170 L0,170 Z`} fill="url(#areaGrad)"
        style={{ opacity: animar ? 1 : 0, transition: 'opacity 1.5s ease 0.8s' }} />
      <path d={path} fill="none" stroke="url(#lineaGrad)" strokeWidth="3" strokeLinecap="round"
        style={{
          strokeDasharray: 700,
          strokeDashoffset: animar ? 0 : 700,
          transition: 'stroke-dashoffset 2.2s ease 0.3s'
        }} />
      <circle cx="520" cy="18" r="5" fill="#E91E8C"
        style={{ opacity: animar ? 1 : 0, transition: 'opacity 0.4s ease 2.2s' }}>
        <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ─────────────────────────────────────────────
// VISUAL: MOCKUP DASHBOARD (hero)
// ─────────────────────────────────────────────

function MockupDashboard({ visible }) {
  const netWorth = useCountUp(48250, 2400, visible)
  return (
    <div className="rounded-[1.75rem] border border-white/10 p-1.5 sm:p-2"
      style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 60px 160px rgba(233,30,140,0.18), 0 20px 60px rgba(0,0,0,0.6)' }}>
      <div className="rounded-[1.4rem] overflow-hidden" style={{ background: 'linear-gradient(165deg, #0c0c10, #141019)' }}>

        {/* Barra de navegador */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
          <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
          <div className="ml-4 flex-1 max-w-xs rounded-md px-3 py-1 text-[11px] text-gray-500" style={{ background: 'rgba(255,255,255,0.05)' }}>
            numia.app/dashboard
          </div>
        </div>

        <div className="p-6 sm:p-9">
          {/* Header del mockup */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
            <div className="text-left">
              <p className="text-gray-500 text-xs sm:text-sm mb-1">Tu patrimonio neto</p>
              <p className="font-black text-white leading-none" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)' }}>
                ${netWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs sm:text-sm font-semibold mt-1.5" style={{ color: '#4ADE80' }}>▲ +12.4% este año</p>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.25)' }}>
              💚 Salud financiera: Buena
            </span>
          </div>

          {/* Gráfica */}
          <div className="mb-7">
            <GraficaPatrimonio animar={visible} />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1 px-1">
              <span>Ene</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
            </div>
          </div>

          {/* Tarjetas mini */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Activos', val: '$62,400', color: '#4ADE80', barra: 82 },
              { label: 'Pasivos', val: '$14,150', color: '#F87171', barra: 28 },
              { label: 'Ahorro/mes', val: '$1,240', color: '#E91E8C', barra: 55 },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-3.5 text-left" style={{ background: 'rgba(255,255,255,0.035)' }}>
                <p className="text-gray-500 text-[10px] sm:text-xs mb-0.5">{c.label}</p>
                <p className="font-bold text-sm sm:text-lg mb-2" style={{ color: c.color }}>{c.val}</p>
                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div className="h-1 rounded-full" style={{ width: visible ? `${c.barra}%` : '0%', background: c.color, transition: 'width 1.4s ease 1s' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Sugerencia IA */}
          <div className="rounded-xl p-4 flex items-start gap-3 text-left"
            style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.13), rgba(156,39,176,0.13))', border: '1px solid rgba(233,30,140,0.25)' }}>
            <span className="text-lg sm:text-xl shrink-0">💡</span>
            <div>
              <p className="text-white text-xs sm:text-sm font-bold">Sugerencia de Numia</p>
              <p className="text-gray-400 text-xs sm:text-sm">Tienes $1,240 de excedente. Destina el 40% a tu deuda de mayor interés y ahorra $312 en intereses este año.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VISUAL: MOCKUP CELULAR (alertas)
// ─────────────────────────────────────────────

function MockupCelular() {
  const alertas = [
    { emoji: '🔔', titulo: 'Se acerca tu declaración', desc: 'Declaras el IVA hasta el 16 de este mes', tiempo: 'ahora' },
    { emoji: '📈', titulo: 'Tu patrimonio subió', desc: '+$2,140 este mes. ¡Vas muy bien!', tiempo: '2h' },
    { emoji: '⚠️', titulo: 'Gasto inusual detectado', desc: 'Entretenimiento subió 40% vs tu promedio', tiempo: '1d' },
  ]
  return (
    <div className="mx-auto w-[270px] sm:w-[300px] rounded-[2.6rem] border border-white/12 p-2.5"
      style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 50px 130px rgba(156,39,176,0.22)' }}>
      <div className="rounded-[2.1rem] overflow-hidden pb-7" style={{ background: 'linear-gradient(175deg, #0d0d11, #15101b)' }}>
        {/* Notch */}
        <div className="flex justify-center pt-2.5 pb-5">
          <div className="w-24 h-6 rounded-full" style={{ background: '#000' }} />
        </div>
        <div className="px-4 text-left">
          <p className="text-gray-500 text-[10px] font-semibold mb-3 px-1 uppercase tracking-wider">Notificaciones</p>
          <div className="space-y-2.5">
            {alertas.map((a, i) => (
              <div key={i} className="rounded-2xl p-3.5 flex gap-3"
                style={{ background: 'rgba(255,255,255,0.055)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.25), rgba(156,39,176,0.25))' }}>
                  {a.emoji}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-xs font-bold truncate">{a.titulo}</p>
                    <span className="text-gray-600 text-[9px] shrink-0">{a.tiempo}</span>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-snug">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mini net worth en el cel */}
          <div className="mt-4 rounded-2xl p-4"
            style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}>
            <p className="text-white/70 text-[10px] mb-0.5">Patrimonio neto</p>
            <p className="text-white font-black text-xl">$48,250</p>
            <p className="text-white/80 text-[10px] font-semibold">▲ 12.4% este año</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VISUAL: MOCKUP CATEGORIZACIÓN
// ─────────────────────────────────────────────

function MockupCategorias() {
  const cats = [
    { emoji: '🛒', nombre: 'Alimentación', monto: '$399.87', pct: 72, color: '#10B981' },
    { emoji: '💊', nombre: 'Salud', monto: '$291.64', pct: 54, color: '#EC4899' },
    { emoji: '🚗', nombre: 'Transporte', monto: '$168.34', pct: 38, color: '#EF4444' },
    { emoji: '🎬', nombre: 'Entretenimiento', monto: '$94.20', pct: 24, color: '#F97316' },
  ]
  return (
    <div className="rounded-3xl border border-white/10 p-6 sm:p-7"
      style={{ background: 'linear-gradient(165deg, #0d0d11, #131017)', boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>
      <div className="flex items-center justify-between mb-5">
        <p className="text-white font-bold text-sm">🔴 Gastos por categoría</p>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(233,30,140,0.12)', color: '#F48FB1' }}>
          Categorizado con IA
        </span>
      </div>
      <div className="space-y-3.5">
        {cats.map(c => (
          <div key={c.nombre} className="flex items-center gap-3">
            <span className="text-base w-6">{c.emoji}</span>
            <span className="text-gray-300 text-xs w-28 truncate">{c.nombre}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
            </div>
            <span className="text-xs font-bold w-16 text-right" style={{ color: c.color }}>{c.monto}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl px-4 py-3 flex items-center gap-2.5 text-left"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)' }}>
        <span>📄</span>
        <p className="text-gray-500 text-xs">Extracto Banco Pichincha detectado · 149 movimientos organizados en 4 segundos</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VISUAL: MOCKUP SRI / CALENDARIO
// ─────────────────────────────────────────────

function MockupSri() {
  return (
    <div className="rounded-3xl border border-white/10 p-6 sm:p-7"
      style={{ background: 'linear-gradient(165deg, #0d0d11, #131017)', boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>
      <p className="text-white font-bold text-sm mb-5 text-left">🏛️ Tu situación con el SRI</p>

      <div className="rounded-2xl p-5 mb-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}>
        <div className="text-left">
          <p className="text-white/75 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Próxima declaración</p>
          <p className="text-white font-black text-lg sm:text-xl">16 de este mes</p>
          <p className="text-white/70 text-[11px]">Según el 9no dígito de tu RUC</p>
        </div>
        <div className="text-center rounded-xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.18)' }}>
          <p className="text-white font-black text-2xl leading-none">9</p>
          <p className="text-white/80 text-[9px] font-medium">días</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 text-left" style={{ background: 'rgba(255,255,255,0.035)' }}>
          <p className="text-gray-500 text-[10px] mb-0.5">IVA a pagar</p>
          <p className="font-black text-lg" style={{ color: '#F48FB1' }}>$105.71</p>
        </div>
        <div className="rounded-xl p-4 text-left" style={{ background: 'rgba(255,255,255,0.035)' }}>
          <p className="text-gray-500 text-[10px] mb-0.5">Deducibles del año</p>
          <p className="font-black text-lg" style={{ color: '#4ADE80' }}>$1,840</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

const PLANES = [
  {
    nombre: 'Gratis',
    precio: '$0',
    periodo: '/mes',
    desc: 'Para empezar a ordenar tus finanzas',
    features: ['Hasta 50 movimientos/mes', 'Categorización automática', '1 presupuesto activo']
  },
  {
    nombre: 'Pro',
    precio: '$13.99',
    periodo: '/mes',
    desc: 'Para quienes quieren control total',
    features: ['Movimientos ilimitados', 'IA para balances y facturas', 'Alertas y sugerencias', 'Activos, pasivos y net worth', 'Deducibles y SRI'],
    destacado: true
  },
  {
    nombre: 'Con Contador',
    precio: 'Desde $50',
    periodo: '/mes',
    desc: 'Un contador declara por ti',
    features: ['Todo lo de Pro', 'Un contador sube tu declaración', 'Revisión profesional', 'Hasta 50 gastos y 30 ingresos', 'Soporte prioritario']
  },
  {
    nombre: 'Empresarial',
    precio: 'Pronto',
    periodo: '',
    desc: 'Para empresas con equipos',
    features: ['Múltiples usuarios', 'Ratios avanzados', 'Reportes contables', 'Multi-sucursal'],
    proximamente: true
  }
]

// ─────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────

export default function Landing() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [heroVisible, setHeroVisible] = useState(false)
  useReveal()
  useEffect(() => { setHeroVisible(true) }, [])

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Estilos de animación reveal */}
      <style jsx global>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-reveal].revelado {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          [data-reveal] { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <img src="/Logo Numia.png" alt="Numia" className="h-14 w-auto" />

          <div className="hidden md:flex items-center gap-9">
            <a href="#producto" className="text-sm text-gray-400 hover:text-white transition-colors">Producto</a>
            <a href="#alertas" className="text-sm text-gray-400 hover:text-white transition-colors">Alertas</a>
            <a href="#sri" className="text-sm text-gray-400 hover:text-white transition-colors">SRI</a>
            <a href="#planes" className="text-sm text-gray-400 hover:text-white transition-colors">Planes</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/login" className="text-sm text-gray-300 hover:text-white transition-colors font-medium px-4 py-2">
              Iniciar sesión
            </a>
            <a href="/register" className="text-sm font-semibold text-white px-5 py-2.5 rounded-full transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}>
              Empezar gratis
            </a>
          </div>

          <button onClick={() => setMenuAbierto(!menuAbierto)} className="md:hidden text-2xl">
            {menuAbierto ? '✕' : '☰'}
          </button>
        </div>

        {menuAbierto && (
          <div className="md:hidden border-t border-white/5 px-6 py-5 flex flex-col gap-4" style={{ background: 'rgba(0,0,0,0.95)' }}>
            <a href="#producto" onClick={() => setMenuAbierto(false)} className="text-sm text-gray-300">Producto</a>
            <a href="#alertas" onClick={() => setMenuAbierto(false)} className="text-sm text-gray-300">Alertas</a>
            <a href="#sri" onClick={() => setMenuAbierto(false)} className="text-sm text-gray-300">SRI</a>
            <a href="#planes" onClick={() => setMenuAbierto(false)} className="text-sm text-gray-300">Planes</a>
            <a href="/login" className="text-sm text-gray-300 font-medium">Iniciar sesión</a>
            <a href="/register" className="text-sm font-semibold text-white px-5 py-2.5 rounded-full text-center"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}>
              Empezar gratis
            </a>
          </div>
        )}
      </nav>

      {/* ────────── HERO ────────── */}
      <section className="relative pt-36 sm:pt-44 pb-24 px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-1/2 -translate-x-1/2 -top-32 w-[1100px] h-[700px] rounded-full opacity-25"
            style={{ background: 'radial-gradient(ellipse, rgba(233,30,140,0.4), transparent 60%)', filter: 'blur(60px)' }} />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10 mb-16"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)', transition: 'all 1s cubic-bezier(0.22,1,0.36,1)' }}>

          <div className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full mb-8"
            style={{ background: 'rgba(233,30,140,0.1)', border: '1px solid rgba(233,30,140,0.3)', color: '#F48FB1' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#E91E8C' }} />
            Tu copiloto financiero · Hecho para Ecuador
          </div>

          <h1 className="font-black tracking-tight leading-[0.93] mb-7" style={{ fontSize: 'clamp(2.9rem, 8.5vw, 6.5rem)' }}>
            Tu dinero,
            <br />
            <span style={{ background: 'linear-gradient(120deg, #E91E8C 20%, #9C27B0 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              finalmente claro.
            </span>
          </h1>

          <p className="text-gray-400 mx-auto mb-11 max-w-xl" style={{ fontSize: 'clamp(1.05rem, 2vw, 1.3rem)' }}>
            Numia organiza tus finanzas, calcula tu patrimonio y te dice qué hacer para crecer. Impulsado por inteligencia artificial.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/register" className="w-full sm:w-auto text-base font-semibold text-white px-9 py-4 rounded-full transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 10px 50px rgba(233,30,140,0.45)' }}>
              Comenzar gratis
            </a>
            <a href="#producto" className="w-full sm:w-auto text-base font-semibold text-gray-300 px-9 py-4 rounded-full border border-white/12 hover:bg-white/5 transition-colors">
              Ver el producto
            </a>
          </div>
          <p className="text-gray-600 text-xs mt-6">Sin tarjeta de crédito · Configuración en minutos</p>
        </div>

        {/* Mockup del dashboard */}
        <div className="max-w-4xl mx-auto relative z-10"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(50px)', transition: 'all 1.2s cubic-bezier(0.22,1,0.36,1) 0.25s' }}>
          <MockupDashboard visible={heroVisible} />
        </div>
      </section>

      {/* ────────── CINTA DE CONFIANZA ────────── */}
      <section className="py-10 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center">
          {[
            '🏦 Lee extractos de bancos y cooperativas',
            '📄 Compatible con XMLs del SRI',
            '🔒 Tus datos, siempre tuyos',
            '🇪🇨 Diseñado para Ecuador'
          ].map(t => (
            <p key={t} className="text-gray-500 text-sm font-medium">{t}</p>
          ))}
        </div>
      </section>

      {/* ────────── FEATURE 1: CATEGORIZACIÓN ────────── */}
      <section id="producto" className="py-28 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div data-reveal className="text-left">
            <p className="text-sm font-bold mb-4 tracking-wide" style={{ color: '#E91E8C' }}>SUBE Y OLVÍDATE</p>
            <h2 className="font-black tracking-tight leading-tight mb-6" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)' }}>
              Tu extracto entra.
              <br />El orden sale.
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Sube el extracto de tu banco o cooperativa. Numia identifica de dónde viene, lee cada movimiento y lo categoriza automáticamente con IA. Tú solo miras el resultado.
            </p>
            <ul className="space-y-3">
              {['Detecta tu banco o cooperativa automáticamente', 'Categoriza cada gasto e ingreso con IA', 'Corrige cualquier categoría con un clic'].map(t => (
                <li key={t} className="flex items-start gap-3 text-gray-300">
                  <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}>✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal style={{ transitionDelay: '0.15s' }}>
            <MockupCategorias />
          </div>
        </div>
      </section>

      {/* ────────── FEATURE 2: ALERTAS (celular) ────────── */}
      <section id="alertas" className="py-28 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute right-0 top-1/4 w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(156,39,176,0.5), transparent 65%)', filter: 'blur(50px)' }} />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div data-reveal className="order-2 lg:order-1 flex justify-center">
            <MockupCelular />
          </div>
          <div data-reveal className="text-left order-1 lg:order-2" style={{ transitionDelay: '0.15s' }}>
            <p className="text-sm font-bold mb-4 tracking-wide" style={{ color: '#E91E8C' }}>TU COPILOTO TE HABLA</p>
            <h2 className="font-black tracking-tight leading-tight mb-6" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)' }}>
              Alertas que sí
              <br />te hacen ganar.
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Numia analiza tu situación real y te avisa a tiempo: cuándo declarar, cuándo invertir tu excedente, cómo atacar tus deudas y dónde estás gastando de más.
            </p>
            <ul className="space-y-3">
              {['Recordatorios de declaración según tu RUC', 'Sugerencias de inversión cuando tienes excedente', 'Estrategias para pagar deudas más rápido'].map(t => (
                <li key={t} className="flex items-start gap-3 text-gray-300">
                  <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}>✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ────────── FEATURE 3: SRI ────────── */}
      <section id="sri" className="py-28 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div data-reveal className="text-left">
            <p className="text-sm font-bold mb-4 tracking-wide" style={{ color: '#E91E8C' }}>IMPUESTOS SIN ESTRÉS</p>
            <h2 className="font-black tracking-tight leading-tight mb-6" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)' }}>
              El SRI, resuelto
              <br />antes de que preguntes.
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Sube tus facturas en XML o PDF y Numia calcula tu IVA, identifica tus gastos deducibles y te muestra exactamente cuándo declarar según tu RUC.
            </p>
            <ul className="space-y-3">
              {['Calendario de declaración automático por tu RUC', 'IVA a pagar o a favor, siempre actualizado', 'Deducibles detectados desde tus movimientos'].map(t => (
                <li key={t} className="flex items-start gap-3 text-gray-300">
                  <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}>✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal style={{ transitionDelay: '0.15s' }}>
            <MockupSri />
          </div>
        </div>
      </section>

      {/* ────────── STATS GRANDES ────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {[
            { num: '4 seg', label: 'para organizar 149 movimientos' },
            { num: '6', label: 'categorías de deducibles SRI detectadas solas' },
            { num: '24/7', label: 'tu copiloto nunca duerme' },
          ].map((s, i) => (
            <div key={s.label} data-reveal style={{ transitionDelay: `${i * 0.1}s` }}>
              <p className="font-black mb-2" style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {s.num}
              </p>
              <p className="text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ────────── PLANES ────────── */}
      <section id="planes" className="py-28 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16" data-reveal>
            <p className="text-sm font-bold mb-4 tracking-wide" style={{ color: '#E91E8C' }}>PRECIOS TRANSPARENTES</p>
            <h2 className="font-black tracking-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              Elige tu plan
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANES.map((p, i) => (
              <div key={p.nombre} data-reveal
                className={`rounded-3xl p-7 relative border flex flex-col ${p.proximamente ? 'opacity-50' : ''}`}
                style={{
                  transitionDelay: `${i * 0.07}s`,
                  borderColor: p.destacado ? '#E91E8C' : 'rgba(255,255,255,0.08)',
                  background: p.destacado ? 'linear-gradient(165deg, rgba(233,30,140,0.1), rgba(156,39,176,0.05))' : 'rgba(255,255,255,0.02)'
                }}>
                {p.destacado && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold text-white px-3 py-1 rounded-full whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}>
                    Más popular
                  </span>
                )}
                <p className="font-bold text-lg mb-1 text-left">{p.nombre}</p>
                <p className="mb-2 text-left">
                  <span className="font-black text-3xl">{p.precio}</span>
                  {p.periodo && <span className="text-gray-500 text-sm">{p.periodo}</span>}
                </p>
                <p className="text-gray-400 text-sm mb-6 text-left">{p.desc}</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="text-gray-300 text-sm flex items-start gap-2 text-left">
                      <span style={{ color: '#E91E8C' }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                {p.proximamente ? (
                  <div className="w-full text-center py-3 rounded-full text-sm font-bold cursor-not-allowed text-gray-500 border border-white/8">
                    Próximamente
                  </div>
                ) : (
                  <a href="/register" className="w-full block text-center py-3 rounded-full text-sm font-bold transition-transform hover:scale-105"
                    style={p.destacado
                      ? { background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}>
                    Elegir {p.nombre}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── CTA FINAL ────────── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto text-center" data-reveal>
          <div className="rounded-[2.2rem] p-12 sm:p-20 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)' }}>
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 -mr-24 -mt-24"
              style={{ background: 'radial-gradient(circle, #fff, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-10 -ml-20 -mb-20"
              style={{ background: 'radial-gradient(circle, #fff, transparent 70%)' }} />
            <h2 className="font-black tracking-tight mb-5 relative leading-tight" style={{ fontSize: 'clamp(2rem, 5.5vw, 3.8rem)' }}>
              Tu mejor decisión financiera empieza hoy
            </h2>
            <p className="text-white/85 max-w-xl mx-auto mb-10 relative sm:text-lg">
              Únete a las personas que dejaron de improvisar con su dinero.
            </p>
            <a href="/register" className="inline-block text-base font-bold px-10 py-4 rounded-full bg-white text-gray-900 transition-transform hover:scale-105 relative">
              Crear cuenta gratis
            </a>
          </div>
        </div>
      </section>

      {/* ────────── FOOTER ────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <img src="/Logo Numia.png" alt="Numia" className="h-12 w-auto" />
          <div className="flex gap-8 text-sm text-gray-500">
            <a href="#producto" className="hover:text-white transition-colors">Producto</a>
            <a href="#planes" className="hover:text-white transition-colors">Planes</a>
            <a href="/login" className="hover:text-white transition-colors">Iniciar sesión</a>
          </div>
          <p className="text-gray-600 text-sm">© 2025 Numia · Ecuador</p>
        </div>
      </footer>
    </div>
  )
}