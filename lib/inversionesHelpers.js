// Helpers para el módulo de Inversiones: cuestionario de perfil de riesgo, carteras modelo de ETFs
// y proyección de crecimiento. Fase 1: solo recomendación, no ejecuta órdenes (ver CLAUDE.md).

// Cuestionario de tolerancia al riesgo (5 preguntas, 0-3 puntos cada una → score 0-15)
export const preguntasPerfilRiesgo = [
  {
    id: 'horizonte',
    pregunta: '¿Cuándo piensas usar este dinero?',
    opciones: [
      { valor: 'corto', texto: 'En menos de 1 año', puntos: 0 },
      { valor: 'medio', texto: 'Entre 1 y 3 años', puntos: 1 },
      { valor: 'largo', texto: 'Entre 3 y 7 años', puntos: 2 },
      { valor: 'muy_largo', texto: 'En más de 7 años', puntos: 3 },
    ],
  },
  {
    id: 'objetivo',
    pregunta: '¿Cuál es tu objetivo principal al invertir?',
    opciones: [
      { valor: 'preservar', texto: 'Preservar mi capital, no quiero perder dinero', puntos: 0 },
      { valor: 'ingresos', texto: 'Generar ingresos estables', puntos: 1 },
      { valor: 'balanceado', texto: 'Crecimiento balanceado', puntos: 2 },
      { valor: 'crecimiento', texto: 'Maximizar el crecimiento a largo plazo', puntos: 3 },
    ],
  },
  {
    id: 'reaccion_caida',
    pregunta: 'Si tu inversión cae 20% en un mes, ¿qué harías?',
    opciones: [
      { valor: 'vendo_todo', texto: 'Vendo todo de inmediato', puntos: 0 },
      { valor: 'vendo_parte', texto: 'Vendo una parte para reducir el riesgo', puntos: 1 },
      { valor: 'espero', texto: 'No hago nada, espero a que se recupere', puntos: 2 },
      { valor: 'compro_mas', texto: 'Compro más, lo veo como una oportunidad', puntos: 3 },
    ],
  },
  {
    id: 'experiencia',
    pregunta: '¿Qué tanta experiencia tienes invirtiendo?',
    opciones: [
      { valor: 'ninguna', texto: 'Ninguna, sería mi primera vez', puntos: 0 },
      { valor: 'poca', texto: 'Poca (plazo fijo, fondos conservadores)', puntos: 1 },
      { valor: 'media', texto: 'Algo (acciones, ETFs)', puntos: 2 },
      { valor: 'alta', texto: 'Mucha (opciones, cripto, trading activo)', puntos: 3 },
    ],
  },
  {
    id: 'porcentaje_ingreso',
    pregunta: '¿Qué porcentaje de tus ingresos mensuales podrías invertir sin afectar tus gastos esenciales?',
    opciones: [
      { valor: 'bajo', texto: 'Menos del 5%', puntos: 0 },
      { valor: 'medio_bajo', texto: 'Entre 5% y 15%', puntos: 1 },
      { valor: 'medio_alto', texto: 'Entre 15% y 30%', puntos: 2 },
      { valor: 'alto', texto: 'Más del 30%', puntos: 3 },
    ],
  },
]

// Años aproximados de horizonte, usados solo para la proyección de crecimiento
export const horizonteAnios = { corto: 1, medio: 2, largo: 5, muy_largo: 10 }

// Suma los puntos de las opciones elegidas. `respuestas` es { [preguntaId]: valorOpcion }
export function calcularScoreRiesgo(respuestas = {}) {
  return preguntasPerfilRiesgo.reduce((total, p) => {
    const opcion = p.opciones.find(o => o.valor === respuestas[p.id])
    return total + (opcion ? opcion.puntos : 0)
  }, 0)
}

// Mapea el score (0-15) a uno de los 5 perfiles de riesgo
export function perfilPorScore(score) {
  if (score <= 2) return 'conservador'
  if (score <= 5) return 'moderado_conservador'
  if (score <= 8) return 'moderado'
  if (score <= 11) return 'moderado_agresivo'
  return 'agresivo'
}

export const perfilRiesgoInfo = {
  conservador: {
    label: 'Conservador', emoji: '🛡️', color: '#3B82F6',
    descripcion: 'Prioriza proteger tu capital por encima del crecimiento.',
    retornoEsperadoAnual: 0.045,
  },
  moderado_conservador: {
    label: 'Moderado-Conservador', emoji: '⚖️', color: '#06B6D4',
    descripcion: 'Busca estabilidad, con algo de crecimiento a cambio de un poco más de riesgo.',
    retornoEsperadoAnual: 0.06,
  },
  moderado: {
    label: 'Moderado', emoji: '📊', color: '#9C27B0',
    descripcion: 'Balance entre crecimiento y riesgo, para horizontes de mediano a largo plazo.',
    retornoEsperadoAnual: 0.075,
  },
  moderado_agresivo: {
    label: 'Moderado-Agresivo', emoji: '📈', color: '#E91E8C',
    descripcion: 'Prioriza el crecimiento y tolera caídas temporales marcadas.',
    retornoEsperadoAnual: 0.09,
  },
  agresivo: {
    label: 'Agresivo', emoji: '🚀', color: '#EF4444',
    descripcion: 'Maximiza el crecimiento a largo plazo; tolera alta volatilidad en el camino.',
    retornoEsperadoAnual: 0.105,
  },
}

export const ordenPerfiles = ['conservador', 'moderado_conservador', 'moderado', 'moderado_agresivo', 'agresivo']

// Carteras modelo por perfil: ETFs líquidos y ampliamente diversificados (listados en USD).
// Pesos ilustrativos para un MVP de recomendación — no son asesoría financiera personalizada.
// Info fija por ETF (nombre, tipo de activo, color para el gráfico) — el peso varía según la cartera
export const etfInfo = {
  BND:  { nombre: 'Vanguard Total Bond Market', tipo: 'Bonos EE.UU.', color: '#10B981' },
  VTI:  { nombre: 'Vanguard Total Stock Market', tipo: 'Acciones EE.UU.', color: '#3B82F6' },
  VXUS: { nombre: 'Vanguard Total International Stock', tipo: 'Acciones internacionales', color: '#06B6D4' },
  GLD:  { nombre: 'SPDR Gold Shares', tipo: 'Oro', color: '#F59E0B' },
  QQQ:  { nombre: 'Invesco QQQ (Nasdaq-100)', tipo: 'Crecimiento / Tecnología', color: '#E91E8C' },
}

export const carterasModelo = {
  conservador: [
    { ticker: 'BND', peso: 0.60 },
    { ticker: 'VTI', peso: 0.20 },
    { ticker: 'VXUS', peso: 0.10 },
    { ticker: 'GLD', peso: 0.10 },
  ],
  moderado_conservador: [
    { ticker: 'BND', peso: 0.45 },
    { ticker: 'VTI', peso: 0.30 },
    { ticker: 'VXUS', peso: 0.15 },
    { ticker: 'GLD', peso: 0.10 },
  ],
  moderado: [
    { ticker: 'VTI', peso: 0.35 },
    { ticker: 'BND', peso: 0.30 },
    { ticker: 'VXUS', peso: 0.20 },
    { ticker: 'GLD', peso: 0.10 },
    { ticker: 'QQQ', peso: 0.05 },
  ],
  moderado_agresivo: [
    { ticker: 'VTI', peso: 0.40 },
    { ticker: 'VXUS', peso: 0.20 },
    { ticker: 'QQQ', peso: 0.15 },
    { ticker: 'BND', peso: 0.15 },
    { ticker: 'GLD', peso: 0.10 },
  ],
  agresivo: [
    { ticker: 'VTI', peso: 0.45 },
    { ticker: 'VXUS', peso: 0.20 },
    { ticker: 'QQQ', peso: 0.25 },
    { ticker: 'GLD', peso: 0.05 },
    { ticker: 'BND', peso: 0.05 },
  ],
}

// Proyección de crecimiento compuesto mensual con aportes recurrentes (ilustrativa, no garantizada).
// Devuelve una serie anual [{ anio, aportado, valor }] desde el año 0 hasta `anios`.
export function proyectarCrecimiento({ capitalInicial, aporteMensual = 0, anios, retornoAnual }) {
  const tasaMensual = retornoAnual / 12
  const meses = Math.max(Math.round(anios * 12), 1)
  const aporte = parseFloat(aporteMensual || 0)

  const serie = []
  let valor = parseFloat(capitalInicial || 0)
  let aportado = valor
  serie.push({ anio: 0, aportado, valor })

  for (let m = 1; m <= meses; m++) {
    valor = valor * (1 + tasaMensual) + aporte
    aportado += aporte
    if (m % 12 === 0 || m === meses) {
      serie.push({ anio: Math.round((m / 12) * 10) / 10, aportado, valor })
    }
  }
  return serie
}
