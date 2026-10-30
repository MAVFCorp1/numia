// Helpers para el módulo SRI: calendario tributario, cálculo de IVA y categorías exentas

export const TARIFA_IVA = 0.15 // 15% vigente en Ecuador (2024 en adelante)

// ---------- CALENDARIO TRIBUTARIO ----------
// El 9no dígito del RUC determina la fecha máxima de declaración mensual del IVA.
// Estas son las fechas estándar del SRI (día del mes siguiente al período declarado).

export const fechasPorDigito = {
  '1': 10,
  '2': 12,
  '3': 14,
  '4': 16,
  '5': 18,
  '6': 20,
  '7': 22,
  '8': 24,
  '9': 26,
  '0': 28
}

// Extrae el 9no dígito de un RUC (13 dígitos). Devuelve null si el RUC no es válido.
export function novenoDigito(ruc) {
  if (!ruc) return null
  const limpio = String(ruc).replace(/\D/g, '')
  if (limpio.length < 9) return null
  return limpio.charAt(8)
}

// Devuelve el día máximo de declaración según el RUC
export function diaDeclaracion(ruc) {
  const digito = novenoDigito(ruc)
  if (digito === null) return null
  return fechasPorDigito[digito] ?? null
}

// Calcula la próxima fecha de declaración a partir de hoy, según el día que corresponde.
// La declaración de IVA de un mes se hace en el mes siguiente.
export function proximaFechaDeclaracion(ruc, hoy = new Date()) {
  const dia = diaDeclaracion(ruc)
  if (dia === null) return null

  // El IVA del mes actual se declara el mes siguiente en el día correspondiente
  let anio = hoy.getFullYear()
  let mes = hoy.getMonth() // 0-indexado

  // Si ya pasó el día de declaración de este mes, la próxima es el mes siguiente
  const fechaEsteMes = new Date(anio, mes, dia)
  let objetivo
  if (hoy.getDate() <= dia) {
    objetivo = fechaEsteMes
  } else {
    objetivo = new Date(anio, mes + 1, dia)
  }
  return objetivo
}

// Formatea una fecha a texto legible en español
export function formatearFecha(fecha) {
  if (!fecha) return '—'
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`
}

// Días restantes desde hoy hasta la fecha objetivo
export function diasRestantes(fechaObjetivo, hoy = new Date()) {
  if (!fechaObjetivo) return null
  const msPorDia = 1000 * 60 * 60 * 24
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const o = new Date(fechaObjetivo.getFullYear(), fechaObjetivo.getMonth(), fechaObjetivo.getDate())
  return Math.round((o - h) / msPorDia)
}

// Fecha en formato YYYY-MM-DD (para comparar/guardar en Supabase)
export function fechaISO(fecha) {
  if (!fecha) return null
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

// El usuario marca "ya declaré" guardando la fecha límite del período vigente en su perfil
// (profiles.declaracion_confirmada_fecha). Como esa fecha límite avanza cada mes, la próxima
// vez que cambie de período la comparación deja de coincidir y la alerta vuelve sola.
export function declaracionConfirmada(perfil, proximaFecha) {
  if (!perfil?.declaracion_confirmada_fecha || !proximaFecha) return false
  return perfil.declaracion_confirmada_fecha === fechaISO(proximaFecha)
}

// Una vez confirmado un período, la "próxima declaración" a mostrar ya no es la que se acaba de
// confirmar, sino la del ciclo siguiente (un mes después). Se calcula reutilizando
// proximaFechaDeclaracion con la referencia de "hoy" corrida al día siguiente de la fecha confirmada.
export function proximaFechaTrasConfirmar(ruc, fechaConfirmada) {
  if (!fechaConfirmada) return null
  const diaSiguiente = new Date(fechaConfirmada.getFullYear(), fechaConfirmada.getMonth(), fechaConfirmada.getDate() + 1)
  return proximaFechaDeclaracion(ruc, diaSiguiente)
}

// ---------- CÁLCULO DE IVA ----------
// Dado un monto SIN IVA (base gravada), calcula el IVA que se le suma (tarifa 15%)
export function calcularIva(montoSinIva, tarifa = TARIFA_IVA) {
  return montoSinIva * tarifa
}

// Dado un monto que YA incluye IVA, separa base imponible e IVA
export function desglosarIva(montoConIva, tarifa = TARIFA_IVA) {
  const base = montoConIva / (1 + tarifa)
  const iva = montoConIva - base
  return { base, iva }
}