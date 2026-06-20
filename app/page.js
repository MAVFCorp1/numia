const features = [
  {
    title: "XMLs SRI",
    description:
      "Importa y procesa automáticamente tus comprobantes electrónicos del SRI. Concilia facturas de compra y venta sin esfuerzo.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: "Extractos bancarios",
    description:
      "Conecta tus cuentas y sube extractos en PDF o Excel. Numia categoriza movimientos y detecta discrepancias al instante.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    title: "Dashboard",
    description:
      "Visualiza ingresos, gastos y flujo de caja en tiempo real. Toma decisiones con datos claros, no con suposiciones.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    title: "Ratios financieros",
    description:
      "Liquidez, rentabilidad y endeudamiento calculados automáticamente. Entiende la salud de tu negocio de un vistazo.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
      </svg>
    ),
  },
  {
    title: "Reportes PDF",
    description:
      "Genera estados financieros y reportes listos para compartir con contadores, bancos o inversionistas en segundos.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
];

const plans = [
  {
    name: "Gratis",
    price: 0,
    description: "Para emprendedores que recién empiezan a ordenar sus finanzas.",
    features: [
      "Hasta 50 XMLs al mes",
      "1 cuenta bancaria",
      "Dashboard básico",
      "1 reporte PDF al mes",
    ],
    cta: "Comenzar gratis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 19,
    description: "Para PYMES que necesitan control financiero completo.",
    features: [
      "XMLs ilimitados",
      "5 cuentas bancarias",
      "Ratios financieros",
      "Reportes PDF ilimitados",
      "Soporte prioritario",
    ],
    cta: "Probar Pro",
    highlighted: true,
  },
  {
    name: "Empresa",
    price: 49,
    description: "Para equipos y empresas con múltiples sucursales.",
    features: [
      "Todo lo de Pro",
      "Usuarios ilimitados",
      "Multi-sucursal",
      "API e integraciones",
      "Asesor financiero dedicado",
    ],
    cta: "Contactar ventas",
    highlighted: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-full bg-white text-zinc-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D9E75] text-sm font-bold text-white">
              N
            </span>
            <span className="text-xl font-bold tracking-tight text-zinc-900">Numia</span>
          </a>
          <div className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
            <a href="#features" className="transition-colors hover:text-[#1D9E75]">Funciones</a>
            <a href="#precios" className="transition-colors hover:text-[#1D9E75]">Precios</a>
            <a href="#" className="transition-colors hover:text-[#1D9E75]">Iniciar sesión</a>
            <a
              href="#precios"
              className="rounded-full bg-[#1D9E75] px-5 py-2 text-white transition-colors hover:bg-[#178a66]"
            >
              Empezar gratis
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#1D9E75]/10 blur-3xl" />
          </div>
          <div className="mx-auto max-w-4xl text-center">
            <span className="mb-6 inline-block rounded-full border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-4 py-1.5 text-sm font-medium text-[#1D9E75]">
              Copiloto financiero para PYMES
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-zinc-900 md:text-6xl md:leading-tight">
              Tu copiloto financiero para toda{" "}
              <span className="text-[#1D9E75]">Latinoamérica</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 md:text-xl">
              Numia automatiza tu contabilidad, concilia bancos y genera reportes
              financieros. Diseñado para PYMES ecuatorianas y latinoamericanas
              que quieren crecer con claridad.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#precios"
                className="w-full rounded-full bg-[#1D9E75] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#1D9E75]/25 transition-all hover:bg-[#178a66] sm:w-auto"
              >
                Empezar gratis
              </a>
              <a
                href="#features"
                className="w-full rounded-full border border-zinc-200 px-8 py-3.5 text-base font-semibold text-zinc-700 transition-colors hover:border-[#1D9E75] hover:text-[#1D9E75] sm:w-auto"
              >
                Ver funciones
              </a>
            </div>
            <p className="mt-6 text-sm text-zinc-500">
              Sin tarjeta de crédito · Configuración en 5 minutos
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-zinc-50 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
                Todo lo que tu PYME necesita
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600">
                Desde la importación de XMLs del SRI hasta reportes listos para
                tu contador. Numia centraliza tus finanzas en un solo lugar.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:border-[#1D9E75]/40 hover:shadow-lg hover:shadow-[#1D9E75]/5"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#1D9E75]/10 text-[#1D9E75] transition-colors group-hover:bg-[#1D9E75] group-hover:text-white">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="precios" className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
                Planes simples, sin sorpresas
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600">
                Empieza gratis y escala cuando tu negocio crezca. Precios en USD
                por mes.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    plan.highlighted
                      ? "border-[#1D9E75] bg-[#1D9E75]/5 shadow-xl shadow-[#1D9E75]/10"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#1D9E75] px-4 py-1 text-xs font-semibold text-white">
                      Más popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-zinc-900">${plan.price}</span>
                    <span className="text-zinc-500">/mes</span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-600">{plan.description}</p>
                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#1D9E75]"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#"
                    className={`mt-8 block rounded-full py-3 text-center text-sm font-semibold transition-colors ${
                      plan.highlighted
                        ? "bg-[#1D9E75] text-white hover:bg-[#178a66]"
                        : "border border-zinc-200 text-zinc-700 hover:border-[#1D9E75] hover:text-[#1D9E75]"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-zinc-50 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <a href="#" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D9E75] text-sm font-bold text-white">
                  N
                </span>
                <span className="text-xl font-bold tracking-tight text-zinc-900">Numia</span>
              </a>
              <p className="mt-3 max-w-xs text-sm text-zinc-500">
                Copiloto financiero para PYMES en Latinoamérica.
              </p>
            </div>
            <div className="flex gap-8 text-sm text-zinc-600">
              <a href="#features" className="transition-colors hover:text-[#1D9E75]">Funciones</a>
              <a href="#precios" className="transition-colors hover:text-[#1D9E75]">Precios</a>
              <a href="#" className="transition-colors hover:text-[#1D9E75]">Privacidad</a>
              <a href="#" className="transition-colors hover:text-[#1D9E75]">Contacto</a>
            </div>
          </div>
          <div className="mt-10 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-400">
            © {new Date().getFullYear()} Numia. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
