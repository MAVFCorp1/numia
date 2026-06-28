export function categorizarMovimiento(descripcion, tipo) {
    const d = descripcion.toLowerCase()
  
    if (tipo === 'ingreso') {
      if (d.includes('transferencia interbancaria recibida')) return 'transferencia-recibida'
      if (d.includes('cobro interbancario recibido')) return 'transferencia-recibida'
      if (d.includes('transferencia internet')) return 'transferencia-recibida'
      if (d.includes('deposito')) return 'deposito'
      if (d.includes('devolucion') || d.includes('sri')) return 'devolucion-sri'
      return 'otros-ingresos'
    }
  
    // GASTOS
    if (d.includes('transferencia internet')) return 'transferencia-enviada'
    if (d.includes('transferencia interbancaria enviada')) return 'transferencia-enviada'
  
    if (d.match(/supermaxi|megamaxi|santa maria|tia |aki|coral|supermercado|despensa/)) return 'alimentacion'
    if (d.match(/pedidosya|uber eats|rappi|restaurante|kfc|mcdonalds|burger|pizza|subway|sushi|ceviche|panaderia|pasteleria|cafeteria|starbucks|juan valdez|briciola|panecu|listo|pasticcino|cacao|titan|food/)) return 'alimentacion'
  
    if (d.match(/zara|h&m|forever|tennis|adidas|nike|puma|bershka|calzado|ropa|moda|marathon|decathlon/)) return 'ropa-calzado'
  
    if (d.match(/arriendo|alquiler|condominio|administracion edificio|inmobiliaria/)) return 'renta'
  
    if (d.match(/meer|empresa publica metro|agua potable|epmaps|cnel|eerssa|emapa|gas domiciliario/)) return 'servicios-basicos'
    if (d.match(/netlife|tv cable|claro hogar|movistar hogar|internet hogar/)) return 'servicios-basicos'
  
    if (d.match(/gasolina|combustible|estacion|petrocomercial|primax|puma energy|mobil|chevron|diesel|terpel/)) return 'transporte'
    if (d.match(/uber|cabify|indriver|beat|taxi|parqueadero|parking|peaje/)) return 'transporte'
  
    if (d.match(/farmacia|fybeca|medicity|sana sana|cruz azul|clinica|hospital|medico|doctor|laboratorio|dental|optica|humana|salud sa|bupa|equivida/)) return 'salud'
    if (d.match(/smart fit|bodytech|gimnasio|gym|spinning|yoga|pilates/)) return 'salud'
  
    if (d.match(/netflix|spotify|amazon prime|hbo|disney|apple tv|youtube premium|steam|playstation|xbox/)) return 'entretenimiento'
    if (d.match(/cine|cinemark|supercines|multicines|teatro|concierto|evento/)) return 'entretenimiento'
  
    if (d.match(/hotel|hostal|airbnb|booking|despegar|latam|avianca|copa|american|vuelo|aeropuerto/)) return 'viajes'
  
    if (d.match(/universidad|escuela|colegio|instituto|curso|udemy|coursera|platzi|libro|libreria|educacion|matricula/)) return 'educacion'
  
    if (d.match(/apple|microsoft|google|icloud|dropbox|adobe|canva|notion|office/)) return 'tecnologia'
    if (d.match(/celular|computador|laptop|tablet|samsung|huawei|xiaomi|lenovo/)) return 'tecnologia'
  
    if (d.match(/claro|movistar|cnt|tuenti|conecel|otecel|recargas|plan datos/)) return 'telecomunicaciones'
  
    if (d.match(/cuota|prestamo|credito|hipoteca|financiamiento|cfcra|corporacion/)) return 'deudas'
  
    if (d.match(/comision|costo oper|costo iva|isd|impuesto salida|tarifa mantenimiento/)) return 'comisiones-banco'
  
    if (d.match(/iva cobrado|declaracion/)) return 'impuestos'
  
    return 'otros'
  }
  
  export const categoriaInfo = {
    'alimentacion':           { label: 'Alimentacion',            emoji: '🛒', color: '#10B981' },
    'ropa-calzado':           { label: 'Ropa y calzado',          emoji: '👕', color: '#8B5CF6' },
    'renta':                  { label: 'Renta / arriendo',        emoji: '🏠', color: '#3B82F6' },
    'servicios-basicos':      { label: 'Servicios basicos',       emoji: '⚡', color: '#F59E0B' },
    'transporte':             { label: 'Transporte',               emoji: '🚗', color: '#EF4444' },
    'salud':                  { label: 'Salud',                    emoji: '💊', color: '#EC4899' },
    'entretenimiento':        { label: 'Entretenimiento',          emoji: '🎬', color: '#F97316' },
    'viajes':                 { label: 'Viajes',                   emoji: '✈️', color: '#06B6D4' },
    'educacion':              { label: 'Educacion',                emoji: '📚', color: '#84CC16' },
    'tecnologia':             { label: 'Tecnologia',               emoji: '💻', color: '#6366F1' },
    'telecomunicaciones':     { label: 'Telecomunicaciones',       emoji: '📱', color: '#14B8A6' },
    'deudas':                 { label: 'Deudas / prestamos',      emoji: '💰', color: '#DC2626' },
    'comisiones-banco':       { label: 'Comisiones banco',        emoji: '🏦', color: '#9CA3AF' },
    'impuestos':              { label: 'Impuestos',                emoji: '🏛️', color: '#78716C' },
    'transferencia-enviada':  { label: 'Transferencia enviada',   emoji: '📤', color: '#F97316' },
    'transferencia-recibida': { label: 'Transferencia recibida',  emoji: '📥', color: '#10B981' },
    'deposito':               { label: 'Deposito',                 emoji: '💵', color: '#10B981' },
    'devolucion-sri':         { label: 'Devolucion SRI',           emoji: '🏛️', color: '#10B981' },
    'otros-ingresos':         { label: 'Otros ingresos',           emoji: '➕', color: '#10B981' },
    'otros':                  { label: 'Sin categorizar',          emoji: '❓', color: '#D1D5DB' },
  }
  
  export const todasLasCategorias = [
    'alimentacion', 'ropa-calzado', 'renta', 'servicios-basicos',
    'transporte', 'salud', 'entretenimiento', 'viajes', 'educacion',
    'tecnologia', 'telecomunicaciones', 'deudas', 'comisiones-banco',
    'impuestos', 'transferencia-enviada', 'transferencias', 'otros'
  ]