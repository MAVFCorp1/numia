'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  categorizarDeducible,
  deducibleInfo,
  categoriasDeducible,
  deduciblePersonaInfo,
  mapearCategoriaMovimiento
} from '@/lib/categorizadorDeducibles'

export default function Deducibles() {
  const [perfil, setPerfil] = useState(null)
  const [deducibles, setDeducibles] = useState([])
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [error, setError] = useState('')

  // Formulario manual
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [fecha, setFecha] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [nota, setNota] = useState('')

  // Filtro
  const [filtroCategoria, setFiltroCategoria] = useState('')

  const supabase = createClient()

  useEffect(() => {
    cargarTodo()
  }, [])

  function tipoPerfil(perfilActual) {
    return (perfilActual || perfil)?.tipo === 'empresa' ? 'empresa' : 'persona'
  }

  async function cargarTodo() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: perfilData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    setPerfil(perfilData)

    // Auto-sincronizar deducibles desde movimientos de banco ya categorizados
    await sincronizarDesdeMovimientos(user.id, perfilData)

    const { data: deduciblesData } = await supabase
      .from('deducibles')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })

    setDeducibles(deduciblesData || [])
    setLoading(false)
  }

  // Revisa movimientos de gasto, detecta candidatos a deducible por su categoría,
  // e inserta en 'deducibles' los que aún no estén vinculados (no duplica)
  async function sincronizarDesdeMovimientos(userId, perfilData) {
    setSincronizando(true)
    const tipo = tipoPerfil(perfilData)

    const { data: movimientos } = await supabase
      .from('movimientos')
      .select('*')
      .eq('user_id', userId)
      .eq('tipo', 'gasto')

    if (!movimientos || movimientos.length === 0) {
      setSincronizando(false)
      return
    }

    const { data: existentes } = await supabase
      .from('deducibles')
      .select('movimiento_id')
      .eq('user_id', userId)
      .not('movimiento_id', 'is', null)

    const idsYaVinculados = new Set((existentes || []).map(e => e.movimiento_id))

    const nuevos = []
    for (const mov of movimientos) {
      if (idsYaVinculados.has(mov.id)) continue

      const categoriaDeducible = mapearCategoriaMovimiento(mov.categoria, tipo)
      if (!categoriaDeducible) continue

      nuevos.push({
        user_id: userId,
        movimiento_id: mov.id,
        fecha: mov.fecha,
        descripcion: mov.descripcion,
        monto: mov.monto,
        categoria_deducible: categoriaDeducible,
        tipo_perfil: tipo,
        nota: 'Detectado automáticamente desde banco'
      })
    }

    if (nuevos.length > 0) {
      await supabase.from('deducibles').insert(nuevos)
    }

    setSincronizando(false)
  }

  function manejarCambioDescripcion(valor) {
    setDescripcion(valor)
    if (valor.length > 3 && !editandoId) {
      const sugerida = categorizarDeducible(valor, tipoPerfil())
      setCategoria(sugerida)
    }
  }

  function abrirNuevo() {
    setEditandoId(null)
    setFecha(new Date().toISOString().split('T')[0])
    setDescripcion('')
    setMonto('')
    setCategoria('')
    setNota('')
    setMostrarForm(true)
  }

  function abrirEditar(d) {
    setEditandoId(d.id)
    setFecha(d.fecha)
    setDescripcion(d.descripcion)
    setMonto(String(d.monto))
    setCategoria(d.categoria_deducible)
    setNota(d.nota || '')
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
    setError('')
  }

  async function guardar() {
    setError('')
    if (!fecha || !descripcion || !monto || !categoria) {
      setError('Completa todos los campos obligatorios')
      return
    }
    if (isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      setError('El monto debe ser un número mayor a 0')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión no válida'); return }

    const payload = {
      user_id: user.id,
      fecha,
      descripcion,
      monto: parseFloat(monto),
      categoria_deducible: categoria,
      tipo_perfil: tipoPerfil(),
      nota: nota || null
    }

    if (editandoId) {
      const { error: dbError } = await supabase
        .from('deducibles')
        .update(payload)
        .eq('id', editandoId)
      if (dbError) { setError('No se pudo actualizar'); return }
    } else {
      const { error: dbError } = await supabase
        .from('deducibles')
        .insert(payload)
      if (dbError) { setError('No se pudo guardar'); return }
    }

    cerrarForm()
    cargarTodo()
  }

  // Quita un deducible de la lista (no afecta ni borra el movimiento original en banco)
  async function quitar(id) {
    if (!confirm('¿Quitar este deducible? El movimiento original en banco no se verá afectado.')) return
    await supabase.from('deducibles').delete().eq('id', id)
    cargarTodo()
  }

  function totalPorCategoria(cat) {
    return deducibles
      .filter(d => d.categoria_deducible === cat)
      .reduce((sum, d) => sum + parseFloat(d.monto), 0)
  }

  function totalGeneral() {
    return deducibles.reduce((sum, d) => sum + parseFloat(d.monto), 0)
  }

  const deduciblesFiltrados = filtroCategoria
    ? deducibles.filter(d => d.categoria_deducible === filtroCategoria)
    : deducibles

  const categorias = categoriasDeducible(tipoPerfil())

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Gastos deducibles</h1>
            <p className="text-gray-400 text-sm mt-1">
              {tipoPerfil() === 'empresa'
                ? 'Gastos deducibles de renta para tu empresa, detectados desde tus movimientos de banco'
                : 'Gastos deducibles del impuesto a la renta, detectados desde tus movimientos de banco'}
            </p>
          </div>
          <button
            onClick={abrirNuevo}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
          >
            + Agregar manual
          </button>
        </div>

        {sincronizando && (
          <div className="bg-pink-500/10 border border-pink-500/30 text-pink-300 text-sm p-3 rounded-lg mb-5">
            Sincronizando con tus movimientos de banco...
          </div>
        )}

        {/* Total general */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <p className="text-gray-400 text-xs font-semibold mb-1">Total deducible acumulado</p>
          <p className="text-3xl font-bold text-white">${totalGeneral().toFixed(2)}</p>
        </div>

        {/* Resumen por categoría con barras de progreso (solo persona) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {categorias.filter(c => c !== 'sin-clasificar').map(cat => {
            const info = deducibleInfo(cat, tipoPerfil())
            const total = totalPorCategoria(cat)
            const tope = tipoPerfil() === 'persona' ? deduciblePersonaInfo[cat]?.topeAnual : null
            const porcentaje = tope ? Math.min((total / tope) * 100, 100) : null

            return (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(filtroCategoria === cat ? '' : cat)}
                className="bg-gray-900 border rounded-2xl p-5 text-left transition-all hover:scale-[1.02]"
                style={{ borderColor: filtroCategoria === cat ? info.color : '#1f2937' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{info.emoji}</span>
                  <p className="text-white font-bold text-sm">{info.label}</p>
                </div>
                <p className="text-2xl font-bold text-white mb-2">${total.toFixed(2)}</p>

                {porcentaje !== null && (
                  <>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${porcentaje}%`, background: info.color }}
                      />
                    </div>
                    <p className="text-gray-500 text-[11px]">
                      de ${tope.toLocaleString()} tope anual referencial
                    </p>
                  </>
                )}
              </button>
            )
          })}
        </div>

        {tipoPerfil() === 'persona' && (
          <p className="text-gray-600 text-xs mb-8">
            * Los topes anuales son referenciales y pueden variar según la normativa vigente del SRI para cada año fiscal.
          </p>
        )}

        {/* Filtro activo */}
        {filtroCategoria && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gray-400 text-sm">Filtrando por:</span>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full text-white"
              style={{ background: deducibleInfo(filtroCategoria, tipoPerfil()).color }}
            >
              {deducibleInfo(filtroCategoria, tipoPerfil()).label}
            </span>
            <button onClick={() => setFiltroCategoria('')} className="text-gray-500 text-xs hover:text-white">
              ✕ Quitar filtro
            </button>
          </div>
        )}

        {/* Lista de deducibles */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {deduciblesFiltrados.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500 text-sm">
                No hay deducibles todavía. Se detectarán automáticamente desde tus movimientos de banco, o puedes agregar uno manual.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {deduciblesFiltrados.map(d => {
                const info = deducibleInfo(d.categoria_deducible, tipoPerfil())
                const esAutomatico = !!d.movimiento_id
                return (
                  <div key={d.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: `${info.color}22` }}
                      >
                        {info.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{d.descripcion}</p>
                        <p className="text-gray-500 text-xs">
                          {d.fecha} · {info.label}
                          {esAutomatico && (
                            <span className="text-pink-400"> · Desde banco</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-white font-bold text-sm">${parseFloat(d.monto).toFixed(2)}</p>
                      {!esAutomatico && (
                        <button
                          onClick={() => abrirEditar(d)}
                          className="text-gray-500 hover:text-pink-400 text-xs transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => quitar(d.id)}
                        className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal formulario manual */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-6">
              {editandoId ? 'Editar deducible' : 'Nuevo deducible manual'}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-5">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Descripción</label>
              <input
                type="text"
                value={descripcion}
                onChange={e => manejarCambioDescripcion(e.target.value)}
                placeholder="Ej: Farmacia Fybeca, Arriendo oficina..."
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Monto</label>
              <input
                type="number"
                step="0.01"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">
                Categoría {descripcion.length > 3 && !editandoId && (
                  <span className="text-pink-400 font-normal">(sugerida automáticamente)</span>
                )}
              </label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors"
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map(c => {
                  const info = deducibleInfo(c, tipoPerfil())
                  return (
                    <option key={c} value={c}>{info.emoji} {info.label}</option>
                  )
                })}
              </select>
            </div>

            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">
                Nota <span className="text-gray-600 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Detalle adicional..."
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-gray-600"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={cerrarForm}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300 bg-gray-800 border border-gray-700 transition-all hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #E91E8C, #9C27B0)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }}
              >
                {editandoId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}