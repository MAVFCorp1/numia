// Motor de alertas de Numia
// Analiza los datos del usuario y genera alertas priorizadas por reglas.
// Las sugerencias personalizadas de inversión/deudas se generan aparte con IA.

// Tipos de alerta y su estilo visual
export const TIPOS_ALERTA = {
    urgente:    { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   borde: 'rgba(239,68,68,0.35)',   label: 'Urgente' },
    atencion:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  borde: 'rgba(245,158,11,0.35)',  label: 'Atención' },
    sugerencia: { color: '#E91E8C', bg: 'rgba(233,30,140,0.1)',  borde: 'rgba(233,30,140,0.35)',  label: 'Sugerencia' },
    positivo:   { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  borde: 'rgba(16,185,129,0.35)',  label: 'Buen trabajo' },
    ia:         { color: '#9C27B0', bg: 'rgba(156,39,176,0.12)', borde: 'rgba(156,39,176,0.4)',   label: 'Numia IA' },
  }
  
  // Devuelve el mes en formato YYYY-MM de una fecha string
  function mesDe(fechaStr) {
    return String(fechaStr || '').slice(0, 7)
  }
  
  // Genera la lista de alertas por reglas. Menor prioridad numérica = más importante.
  export function generarAlertas({ movimientos = [], facturas = [], deducibles = [], perfil = null, diasDeclaracion = null, ivaSaldo = 0 }) {
    const alertas = []
  
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto || 0), 0)
    const gastos = movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + parseFloat(m.monto || 0), 0)
    const ahorro = ingresos - gastos
  
    // ── 1. Declaración de IVA próxima ──
    if (diasDeclaracion !== null && diasDeclaracion >= 0 && diasDeclaracion <= 7) {
      alertas.push({
        id: 'declaracion-proxima',
        tipo: diasDeclaracion <= 3 ? 'urgente' : 'atencion',
        emoji: '📅',
        titulo: diasDeclaracion === 0 ? '¡Hoy es tu día de declaración!' : `Tu declaración de IVA es en ${diasDeclaracion} ${diasDeclaracion === 1 ? 'día' : 'días'}`,
        desc: 'Revisa tus facturas y prepara tu declaración para no pagar multas.',
        href: '/dashboard/sri',
        prioridad: diasDeclaracion <= 3 ? 1 : 2
      })
    }
  
    // ── 2. IVA a pagar acumulado ──
    if (ivaSaldo > 0) {
      alertas.push({
        id: 'iva-pendiente',
        tipo: 'atencion',
        emoji: '🏛️',
        titulo: `Tienes $${ivaSaldo.toFixed(2)} de IVA por pagar`,
        desc: 'Según tus facturas registradas de este período.',
        href: '/dashboard/sri',
        prioridad: 3
      })
    }
  
    // ── 3. Gastos superan ingresos ──
    if (movimientos.length > 0 && gastos > ingresos) {
      alertas.push({
        id: 'gastos-superan',
        tipo: 'urgente',
        emoji: '🔴',
        titulo: 'Estás gastando más de lo que ingresas',
        desc: `Tus gastos ($${gastos.toFixed(2)}) superan tus ingresos ($${ingresos.toFixed(2)}). Revisa dónde recortar.`,
        href: '/dashboard/banco',
        prioridad: 1
      })
    }
  
    // ── 4. Categoría con gasto disparado vs promedio histórico ──
    // Compara el mes más reciente contra el promedio de los meses anteriores por categoría
    const meses = {}
    movimientos.filter(m => m.tipo === 'gasto').forEach(m => {
      const mes = mesDe(m.fecha)
      if (!meses[mes]) meses[mes] = {}
      meses[mes][m.categoria] = (meses[mes][m.categoria] || 0) + parseFloat(m.monto || 0)
    })
    const listaMeses = Object.keys(meses).sort()
    if (listaMeses.length >= 2) {
      const mesActual = listaMeses[listaMeses.length - 1]
      const anteriores = listaMeses.slice(0, -1)
      const actual = meses[mesActual]
  
      for (const cat of Object.keys(actual)) {
        // ignorar transferencias y sin categorizar para no dar ruido
        if (['transferencia-enviada', 'otros', 'comisiones-banco'].includes(cat)) continue
        const historico = anteriores.map(m => meses[m][cat] || 0)
        const promedio = historico.reduce((a, b) => a + b, 0) / anteriores.length
        if (promedio > 20 && actual[cat] > promedio * 1.4) {
          const subida = Math.round(((actual[cat] - promedio) / promedio) * 100)
          alertas.push({
            id: `gasto-disparado-${cat}`,
            tipo: 'atencion',
            emoji: '⚠️',
            titulo: `Tu gasto en ${cat.replace(/-/g, ' ')} subió ${subida}%`,
            desc: `Este mes llevas $${actual[cat].toFixed(2)} vs tu promedio de $${promedio.toFixed(2)}.`,
            href: '/dashboard/banco',
            prioridad: 4
          })
        }
      }
    }
  
    // ── 5. Buen ahorro (positivo) ──
    if (ingresos > 0 && ahorro > 0 && (ahorro / ingresos) >= 0.15) {
      alertas.push({
        id: 'buen-ahorro',
        tipo: 'positivo',
        emoji: '🌟',
        titulo: `Estás ahorrando el ${Math.round((ahorro / ingresos) * 100)}% de tus ingresos`,
        desc: `Llevas $${ahorro.toFixed(2)} de excedente. ¡Sigue así!`,
        href: null,
        prioridad: 6
      })
    }
  
    // ── 6. Deducibles acumulados (positivo) ──
    const totalDeducibles = deducibles.reduce((s, d) => s + parseFloat(d.monto || 0), 0)
    if (totalDeducibles > 100) {
      alertas.push({
        id: 'deducibles-acumulados',
        tipo: 'positivo',
        emoji: '🧾',
        titulo: `Llevas $${totalDeducibles.toFixed(2)} en gastos deducibles`,
        desc: 'Eso puede reducir tu impuesto a la renta este año.',
        href: '/dashboard/deducibles',
        prioridad: 7
      })
    }
  
    // ── 7. Sin RUC configurado ──
    if (!perfil?.ruc) {
      alertas.push({
        id: 'sin-ruc',
        tipo: 'sugerencia',
        emoji: '🪪',
        titulo: 'Configura tu RUC',
        desc: 'Activa tu calendario tributario y la detección automática de facturas.',
        href: '/dashboard/xmls',
        prioridad: 5
      })
    }
  
    // ── 8. Sin datos todavía ──
    if (movimientos.length === 0) {
      alertas.push({
        id: 'sin-datos',
        tipo: 'sugerencia',
        emoji: '🚀',
        titulo: 'Empieza subiendo tu primer extracto',
        desc: 'Numia lo categorizará automáticamente y activará tus alertas.',
        href: '/dashboard/banco',
        prioridad: 2
      })
    }
  
    return alertas.sort((a, b) => a.prioridad - b.prioridad)
  }
  
  // Construye el prompt para pedir sugerencias personalizadas a la IA
  export function construirPromptSugerencias({ movimientos = [], perfil = null, ivaSaldo = 0, totalDeducibles = 0 }) {
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto || 0), 0)
    const gastos = movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + parseFloat(m.monto || 0), 0)
  
    // Top categorías de gasto para dar contexto
    const cats = {}
    movimientos.filter(m => m.tipo === 'gasto').forEach(m => {
      cats[m.categoria] = (cats[m.categoria] || 0) + parseFloat(m.monto || 0)
    })
    const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([c, v]) => `${c}: $${v.toFixed(2)}`).join(', ')
  
    const gastoDeudas = cats['deudas'] || 0
  
    return `Eres Numia, un copiloto financiero para personas en Ecuador. Analiza esta situación financiera real y genera exactamente 2 sugerencias accionables, específicas y amigables (tuteo).
  
  DATOS DEL USUARIO:
  - Ingresos totales registrados: $${ingresos.toFixed(2)}
  - Gastos totales: $${gastos.toFixed(2)}
  - Excedente (ahorro): $${(ingresos - gastos).toFixed(2)}
  - Pago mensual en deudas/préstamos: $${gastoDeudas.toFixed(2)}
  - Top gastos por categoría: ${topCats || 'sin datos'}
  - IVA pendiente de pagar: $${Math.max(ivaSaldo, 0).toFixed(2)}
  - Deducibles acumulados del año: $${totalDeducibles.toFixed(2)}
  
  REGLAS:
  - Si tiene excedente positivo alto, sugiere qué hacer con él (fondo de emergencia, inversión conservadora en Ecuador como pólizas o fondos, o abonar a deudas si las tiene, comparando el beneficio).
  - Si tiene deudas y excedente, sugiere una estrategia concreta de pago (método avalancha o bola de nieve, con montos).
  - Si gasta más de lo que ingresa, prioriza recortes específicos según sus top categorías.
  - Usa montos reales de sus datos. Sé concreto, no genérico.
  - NO des consejos legales ni garantices retornos. Usa "considera" o "podrías".
  
  Responde SOLO con un JSON válido, sin markdown ni texto adicional:
  {"sugerencias":[{"emoji":"un emoji","titulo":"máx 8 palabras","desc":"máx 30 palabras con montos concretos"},{"emoji":"un emoji","titulo":"máx 8 palabras","desc":"máx 30 palabras con montos concretos"}]}`
  }