// Categorizador de gastos deducibles, separado por tipo de perfil (persona / empresa)
// No afecta ni modifica la categorización de movimientos normales (categorizador.js)

// ---------- PERSONA NATURAL ----------
// Las 6 categorías oficiales del SRI Ecuador para deducibles de impuesto a la renta

export function categorizarDeduciblePersona(descripcion) {
    const d = descripcion.toLowerCase()
  
    if (d.match(/arriendo|alquiler|condominio|administracion edificio|inmobiliaria|hipoteca/)) return 'vivienda'
  
    if (d.match(/farmacia|fybeca|medicity|sana sana|cruz azul|clinica|hospital|medico|doctor|laboratorio|dental|optica|humana|salud sa|bupa|equivida|medicina|consulta/)) return 'salud'
  
    if (d.match(/universidad|escuela|colegio|instituto|curso|udemy|coursera|platzi|libro|libreria|educacion|matricula|pension escolar|uniforme escolar/)) return 'educacion'
  
    if (d.match(/supermaxi|megamaxi|santa maria|tia |aki|coral|supermercado|despensa|mercado|alimentos/)) return 'alimentacion'
  
    if (d.match(/zara|h&m|forever|tennis|adidas|nike|puma|bershka|calzado|ropa|moda|marathon|decathlon|vestimenta/)) return 'vestimenta'
  
    if (d.match(/hotel|hostal|airbnb|booking|despegar|latam|avianca|copa|american|vuelo|aeropuerto|turismo|paquete turistico/)) return 'turismo'
  
    return 'sin-clasificar'
  }
  
  // Topes anuales aproximados según normativa SRI Ecuador (referenciales, varían cada año fiscal)
  export const deduciblePersonaInfo = {
    'vivienda':       { label: 'Vivienda',      emoji: '🏠', color: '#3B82F6', topeAnual: 4326 },
    'salud':          { label: 'Salud',          emoji: '💊', color: '#EC4899', topeAnual: 17303 },
    'educacion':      { label: 'Educación',      emoji: '📚', color: '#84CC16', topeAnual: 4326 },
    'alimentacion':   { label: 'Alimentación',   emoji: '🛒', color: '#10B981', topeAnual: 4326 },
    'vestimenta':     { label: 'Vestimenta',     emoji: '👕', color: '#8B5CF6', topeAnual: 4326 },
    'turismo':        { label: 'Turismo',        emoji: '✈️', color: '#06B6D4', topeAnual: 4326 },
    'sin-clasificar': { label: 'Sin clasificar', emoji: '❓', color: '#D1D5DB', topeAnual: null }
  }
  
  export const categoriasDeduciblePersona = [
    'vivienda', 'salud', 'educacion', 'alimentacion', 'vestimenta', 'turismo', 'sin-clasificar'
  ]
  
  // ---------- EMPRESA ----------
  // Categorías de gasto deducible de renta para sociedades, según normativa SRI
  
  export function categorizarDeducibleEmpresa(descripcion) {
    const d = descripcion.toLowerCase()
  
    if (d.match(/sueldo|rol de pagos|nomina|decimo|beneficios sociales|iess|aporte patronal|liquidacion empleado/)) return 'sueldos-beneficios'
  
    if (d.match(/arriendo|alquiler local|alquiler oficina|arrendamiento/)) return 'arrendamientos'
  
    if (d.match(/agua potable|electricidad|empresa electrica|cnel|eerssa|emapa|gas|telefono fijo|internet oficina/)) return 'servicios-basicos'
  
    if (d.match(/suministros|papeleria|materiales oficina|insumos|ferreteria|libreria comercial/)) return 'suministros-materiales'
  
    if (d.match(/mantenimiento|reparacion|repuestos|taller|tecnico/)) return 'mantenimiento'
  
    if (d.match(/publicidad|marketing|agencia publicidad|redes sociales ads|facebook ads|google ads|imprenta|valla publicitaria/)) return 'publicidad-promocion'
  
    if (d.match(/gasolina|combustible|estacion|petrocomercial|primax|puma energy|transporte carga|flete|peaje|movilizacion/)) return 'transporte'
  
    if (d.match(/seguro|aseguradora|poliza/)) return 'seguros'
  
    if (d.match(/depreciacion|amortizacion activo/)) return 'depreciacion'
  
    if (d.match(/interes|comision bancaria|credito empresarial|prestamo bancario|financiamiento/)) return 'gastos-financieros'
  
    if (d.match(/impuesto|tasa municipal|patente|contribucion|predial|matricula vehicular/)) return 'impuestos-contribuciones'
  
    return 'otros-gastos-gestion'
  }
  
  export const deducibleEmpresaInfo = {
    'sueldos-beneficios':      { label: 'Sueldos y beneficios sociales', emoji: '👥', color: '#3B82F6' },
    'arrendamientos':          { label: 'Arrendamientos',                emoji: '🏢', color: '#8B5CF6' },
    'servicios-basicos':       { label: 'Servicios básicos',             emoji: '⚡', color: '#F59E0B' },
    'suministros-materiales':  { label: 'Suministros y materiales',      emoji: '📦', color: '#10B981' },
    'mantenimiento':           { label: 'Mantenimiento y reparaciones',  emoji: '🔧', color: '#EF4444' },
    'publicidad-promocion':    { label: 'Publicidad y promoción',        emoji: '📣', color: '#F97316' },
    'transporte':              { label: 'Transporte',                    emoji: '🚛', color: '#06B6D4' },
    'seguros':                 { label: 'Seguros',                       emoji: '🛡️', color: '#6366F1' },
    'depreciacion':            { label: 'Depreciación',                  emoji: '📉', color: '#9CA3AF' },
    'gastos-financieros':      { label: 'Gastos financieros',            emoji: '💳', color: '#DC2626' },
    'impuestos-contribuciones':{ label: 'Impuestos y contribuciones',    emoji: '🏛️', color: '#78716C' },
    'otros-gastos-gestion':    { label: 'Otros gastos de gestión',       emoji: '📋', color: '#D1D5DB' }
  }
  
  export const categoriasDeducibleEmpresa = [
    'sueldos-beneficios', 'arrendamientos', 'servicios-basicos', 'suministros-materiales',
    'mantenimiento', 'publicidad-promocion', 'transporte', 'seguros', 'depreciacion',
    'gastos-financieros', 'impuestos-contribuciones', 'otros-gastos-gestion'
  ]
  
  // ---------- MAPEO DESDE CATEGORÍAS DE MOVIMIENTOS (banco) ----------
  // Relaciona la categoría que ya usa categorizador.js con la categoría deducible correspondiente.
  // Solo se usa para auto-detectar candidatos a deducible desde movimientos ya categorizados.
  
  export const mapeoCategoriaMovimientoPersona = {
    'salud': 'salud',
    'educacion': 'educacion',
    'renta': 'vivienda',
    'alimentacion': 'alimentacion',
    'ropa-calzado': 'vestimenta',
    'viajes': 'turismo'
  }
  
  export const mapeoCategoriaMovimientoEmpresa = {
    'renta': 'arrendamientos',
    'servicios-basicos': 'servicios-basicos',
    'transporte': 'transporte',
    'tecnologia': 'suministros-materiales',
    'telecomunicaciones': 'servicios-basicos',
    'comisiones-banco': 'gastos-financieros',
    'impuestos': 'impuestos-contribuciones'
  }
  
  // Devuelve la categoría deducible sugerida a partir de la categoría de movimientos, o null si no aplica
  export function mapearCategoriaMovimiento(categoriaMovimiento, tipoPerfil) {
    const mapa = tipoPerfil === 'empresa' ? mapeoCategoriaMovimientoEmpresa : mapeoCategoriaMovimientoPersona
    return mapa[categoriaMovimiento] || null
  }
  
  // ---------- HELPERS GENERALES ----------
  
  // Devuelve la categoría sugerida según el tipo de perfil (persona o empresa)
  export function categorizarDeducible(descripcion, tipoPerfil) {
    if (tipoPerfil === 'empresa') return categorizarDeducibleEmpresa(descripcion)
    return categorizarDeduciblePersona(descripcion)
  }
  
  // Devuelve el objeto info (label/emoji/color) según tipo de perfil
  export function deducibleInfo(categoria, tipoPerfil) {
    if (tipoPerfil === 'empresa') return deducibleEmpresaInfo[categoria] || deducibleEmpresaInfo['otros-gastos-gestion']
    return deduciblePersonaInfo[categoria] || deduciblePersonaInfo['sin-clasificar']
  }
  
  // Devuelve la lista de categorías disponibles según tipo de perfil
  export function categoriasDeducible(tipoPerfil) {
    if (tipoPerfil === 'empresa') return categoriasDeducibleEmpresa
    return categoriasDeduciblePersona
  }