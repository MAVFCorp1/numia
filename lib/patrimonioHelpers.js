// Helpers para el módulo de Patrimonio: activos, pasivos, depreciación/apreciación, Net Worth y pagos de deuda
// Depreciación en línea recta según Art. 28 del Reglamento a la LRTI (Ecuador); apreciación con interés compuesto opcional

// comportamiento: 'deprecia' (línea recta, tasas SRI Ecuador) | 'aprecia' (interés compuesto, tasa opcional del usuario) | 'fijo' (no cambia)
export const categoriaActivoInfo = {
  'efectivo':          { label: 'Efectivo',            emoji: '💵', color: '#10B981', comportamiento: 'fijo' },
  'cuenta_bancaria':   { label: 'Cuenta bancaria',      emoji: '🏦', color: '#3B82F6', comportamiento: 'fijo' },
  'cuenta_por_cobrar': { label: 'Cuentas por cobrar',   emoji: '🧾', color: '#8B5CF6', comportamiento: 'fijo' },
  'otro_activo':       { label: 'Otros activos',        emoji: '📦', color: '#D1D5DB', comportamiento: 'fijo' },
  'inversion':         { label: 'Inversiones',          emoji: '📈', color: '#9C27B0', comportamiento: 'aprecia' },
  'bien_raiz':         { label: 'Inmuebles',            emoji: '🏠', color: '#F59E0B', comportamiento: 'aprecia' },
  'terreno':           { label: 'Terrenos',             emoji: '🌳', color: '#84CC16', comportamiento: 'aprecia' },
  'vehiculo':          { label: 'Vehículos',            emoji: '🚗', color: '#EF4444', comportamiento: 'deprecia', tasaAnual: 0.20,   vidaUtilAnios: 5 },
  'tecnologia':        { label: 'Tecnología',           emoji: '💻', color: '#06B6D4', comportamiento: 'deprecia', tasaAnual: 0.3333, vidaUtilAnios: 3 },
  'muebles_enseres':   { label: 'Muebles y enseres',    emoji: '🪑', color: '#8B5CF6', comportamiento: 'deprecia', tasaAnual: 0.10,   vidaUtilAnios: 10 },
  'maquinaria':        { label: 'Maquinaria',           emoji: '⚙️', color: '#F97316', comportamiento: 'deprecia', tasaAnual: 0.10,   vidaUtilAnios: 10 },
  // legacy: ya no se ofrece en el formulario, se mantiene solo para activos creados antes de esta versión
  'equipo':            { label: 'Equipos y muebles',    emoji: '💻', color: '#06B6D4', comportamiento: 'deprecia', tasaAnual: 0.10,   vidaUtilAnios: 10 },
}

export const categoriasActivo = [
  'efectivo', 'cuenta_bancaria', 'inversion', 'bien_raiz', 'terreno',
  'vehiculo', 'tecnologia', 'muebles_enseres', 'maquinaria', 'cuenta_por_cobrar', 'otro_activo'
]

export const categoriaPasivoInfo = {
  'hipoteca':            { label: 'Hipoteca',             emoji: '🏠', color: '#EF4444' },
  'prestamo_vehicular':  { label: 'Préstamo vehicular',   emoji: '🚗', color: '#F97316' },
  'tarjeta_credito':     { label: 'Tarjeta de crédito',   emoji: '💳', color: '#DC2626' },
  'prestamo_personal':   { label: 'Préstamo personal',    emoji: '💰', color: '#F59E0B' },
  'cuenta_por_pagar':    { label: 'Cuentas por pagar',    emoji: '🧾', color: '#EAB308' },
  'otro_pasivo':         { label: 'Otros pasivos',        emoji: '📦', color: '#9CA3AF' },
}

export const categoriasPasivo = [
  'hipoteca', 'prestamo_vehicular', 'tarjeta_credito',
  'prestamo_personal', 'cuenta_por_pagar', 'otro_pasivo'
]

// Diferencia fraccionaria en años entre una fecha de compra y hoy
export function aniosTranscurridos(fechaCompra, hoy = new Date()) {
  if (!fechaCompra) return 0
  const compra = new Date(fechaCompra)
  const dias = (hoy - compra) / (1000 * 60 * 60 * 24)
  return Math.max(dias, 0) / 365.25
}

// Valor actual de un activo según el comportamiento de su categoría:
// deprecia -> línea recta a 0 en `vidaUtilAnios` años (tasa fija SRI)
// aprecia  -> interés compuesto con la tasa opcional del usuario (si no la puso, queda fijo)
// fijo     -> no cambia
export function calcularValorActual({ valorInicial, categoria, fechaCompra, tasaApreciacion, hoy = new Date() }) {
  const inicial = parseFloat(valorInicial || 0)
  const info = categoriaActivoInfo[categoria]
  if (!info || info.comportamiento === 'fijo' || !fechaCompra) return inicial

  const anios = aniosTranscurridos(fechaCompra, hoy)

  if (info.comportamiento === 'deprecia') {
    const depreciacionAnual = inicial / info.vidaUtilAnios
    return Math.max(inicial - depreciacionAnual * anios, 0)
  }

  if (info.comportamiento === 'aprecia') {
    const tasa = parseFloat(tasaApreciacion)
    if (!tasa) return inicial
    return inicial * Math.pow(1 + tasa, anios)
  }

  return inicial
}

// Aplica calcularValorActual a una fila de la tabla `activos`
export function valorActualActivo(activo, hoy = new Date()) {
  return calcularValorActual({
    valorInicial: activo.valor_inicial,
    categoria: activo.categoria,
    fechaCompra: activo.fecha_compra,
    tasaApreciacion: activo.tasa_apreciacion_anual,
    hoy
  })
}

// Info de depreciación de una categoría, o null si no deprecia (para el texto informativo del formulario)
export function infoDepreciacion(categoria) {
  const info = categoriaActivoInfo[categoria]
  if (!info || info.comportamiento !== 'deprecia') return null
  return { tasaAnual: info.tasaAnual, vidaUtilAnios: info.vidaUtilAnios }
}

// Totales y patrimonio neto a partir de los arrays cargados
export function calcularPatrimonioNeto(activos = [], pasivos = [], hoy = new Date()) {
  const totalActivos = activos.reduce((s, a) => s + valorActualActivo(a, hoy), 0)
  const totalPasivos = pasivos.reduce((s, p) => s + parseFloat(p.saldo_actual || 0), 0)
  return { totalActivos, totalPasivos, patrimonioNeto: totalActivos - totalPasivos }
}

// Reconstruye una serie mensual del patrimonio neto de los últimos `meses`.
// Los activos que deprecian/aprecian recalculan su valor en cada mes pasado;
// los de valor fijo y los pasivos se mantienen planos (no hay histórico real de esos valores).
export function reconstruirSerieHistorica({ activos = [], pasivos = [], meses = 12, hoy = new Date() }) {
  const serie = []
  for (let i = meses - 1; i >= 0; i--) {
    const fechaMes = new Date(hoy.getFullYear(), hoy.getMonth() - i, hoy.getDate())
    const { totalActivos, totalPasivos, patrimonioNeto } = calcularPatrimonioNeto(activos, pasivos, fechaMes)
    serie.push({
      fecha: fechaMes.toISOString().split('T')[0],
      totalActivos,
      totalPasivos,
      patrimonioNeto
    })
  }
  return serie
}

// Superpone snapshots reales sobre la serie reconstruida: donde exista un snapshot
// para una fecha (mismo año-mes), prevalece el valor real registrado
export function combinarSerieConSnapshots(serieReconstruida = [], snapshots = []) {
  const porMes = {}
  snapshots.forEach(s => {
    const mes = String(s.fecha).slice(0, 7)
    porMes[mes] = s
  })

  return serieReconstruida.map(punto => {
    const mes = punto.fecha.slice(0, 7)
    const real = porMes[mes]
    if (!real) return punto
    return {
      fecha: real.fecha,
      totalActivos: parseFloat(real.total_activos),
      totalPasivos: parseFloat(real.total_pasivos),
      patrimonioNeto: parseFloat(real.patrimonio_neto)
    }
  })
}

// Normaliza una serie a puntos {x, y} en [0,1] para dibujar un SVG
export function puntosParaGrafica(serie = [], campo = 'patrimonioNeto') {
  if (serie.length === 0) return []
  const valores = serie.map(p => p[campo])
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = (max - min) || 1

  return serie.map((p, i) => ({
    x: serie.length > 1 ? i / (serie.length - 1) : 0,
    y: 1 - ((p[campo] - min) / rango),
    valor: p[campo],
    fecha: p.fecha
  }))
}

// Categoría de movimientos que representa pago de deudas/préstamos (ver lib/categorizador.js)
export const CATEGORIA_MOVIMIENTO_DEUDA = 'deudas'

// Compara dos montos en centavos para evitar errores de punto flotante
function montosIguales(a, b) {
  return Math.round(parseFloat(a || 0) * 100) === Math.round(parseFloat(b || 0) * 100)
}

// Detecta pagos de deuda: cruza movimientos de categoría 'deudas' contra la cuota (pago_mensual)
// de cada pasivo. Devuelve matches únicos listos para aplicar automáticamente, y casos ambiguos
// (dos o más pasivos con la misma cuota) para que el usuario elija a cuál aplicarlos.
// No incluye movimientos cuyo id ya esté en `abonosExistentes` (evita aplicar el mismo pago dos veces).
export function detectarPagosDeuda({ movimientos = [], pasivos = [], abonosExistentes = [] }) {
  const yaAplicados = new Set(abonosExistentes.map(a => a.movimiento_id))

  const movimientosDeuda = movimientos.filter(m =>
    m.categoria === CATEGORIA_MOVIMIENTO_DEUDA && !yaAplicados.has(m.id)
  )

  const aplicables = []
  const ambiguos = []

  for (const mov of movimientosDeuda) {
    const monto = parseFloat(mov.monto || 0)
    if (monto <= 0) continue

    const candidatos = pasivos.filter(p => p.pago_mensual && montosIguales(p.pago_mensual, monto))

    if (candidatos.length === 1) {
      aplicables.push({ movimiento: mov, pasivo: candidatos[0] })
    } else if (candidatos.length > 1) {
      ambiguos.push({ movimiento: mov, opciones: candidatos })
    }
  }

  return { aplicables, ambiguos }
}
