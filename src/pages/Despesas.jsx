import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIAS = [
  'ITENS DE MOBILIÁRIO (AQUISIÇÃO)',
  'MATERIAIS/INSUMOS/M.O. - INSTALAÇÃO MOBILIÁRIO',
  'PRESTAÇÃO DE SERVIÇOS',
  'COMUNICAÇÃO VISUAL',
  'TRANSPORTE',
  'REEMBOLSO DE DESPESAS',
  'SUB-GRUPO/EXTRAS',
  'BV/COMISSÕES/GRATIFICAÇÕES',
  'EQUIPE+COORDENAÇÃO',
]

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Despesas() {
  const [itens, setItens] = useState([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    categoria: '',
    data: '',
    nome_item: '',
    fornecedor: '',
    valor_contratado: '',
    valor_realizado: '',
  })

  useEffect(() => {
    buscarItens()
  }, [categoriaFiltro])

  async function buscarItens() {
    let query = supabase
      .from('itens_despesa')
      .select('*')
      .order('data', { ascending: false })

    if (categoriaFiltro) {
      query = query.eq('categoria', categoriaFiltro)
    }

    const { data } = await query
    setItens(data || [])
  }

  async function salvar() {
    if (!form.categoria) return setErro('Selecione a categoria')
    if (!form.data) return setErro('Informe a data')
    if (!form.nome_item.trim()) return setErro('Informe o nome do item')
    if (form.valor_contratado === '') return setErro('Informe o valor contratado')

    setLoading(true)
    setErro('')

    const { error } = await supabase.from('itens_despesa').insert({
      categoria: form.categoria,
      data: form.data,
      nome_item: form.nome_item.trim(),
      fornecedor: form.fornecedor.trim() || null,
      valor_contratado: parseFloat(form.valor_contratado || 0),
      valor_realizado: parseFloat(form.valor_realizado || 0),
    })

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
    } else {
      setSucesso(true)
      setForm({ categoria: '', data: '', nome_item: '', fornecedor: '', valor_contratado: '', valor_realizado: '' })
      setMostrarForm(false)
      buscarItens()
      setTimeout(() => setSucesso(false), 3000)
    }
    setLoading(false)
  }

  async function deletar(id) {
    if (!confirm('Tem certeza que deseja excluir este item?')) return
    await supabase.from('itens_despesa').delete().eq('id', id)
    buscarItens()
  }

  // Agrupar itens por categoria
  const itensPorCategoria = CATEGORIAS.reduce((acc, cat) => {
    const filtrados = itens.filter(i => i.categoria === cat)
    if (filtrados.length > 0) acc[cat] = filtrados
    return acc
  }, {})

  const totalContratado = itens.reduce((a, i) => a + parseFloat(i.valor_contratado || 0), 0)
  const totalRealizado = itens.reduce((a, i) => a + parseFloat(i.valor_realizado || 0), 0)
  const totalSaldo = totalContratado - totalRealizado

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Despesas</h1>
        <button
          onClick={() => { setMostrarForm(!mostrarForm); setErro(''); setSucesso(false) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {mostrarForm ? 'Cancelar' : '+ Nova despesa'}
        </button>
      </div>

      {/* Formulário */}
      {mostrarForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Nova despesa</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
              <select
                value={form.categoria}
                onChange={e => setForm({ ...form, categoria: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              >
                <option value="">Selecione a categoria</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data</label>
              <input
                type="date"
                value={form.data}
                onChange={e => setForm({ ...form, data: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fornecedor</label>
              <input
                type="text"
                placeholder="Nome do fornecedor"
                value={form.fornecedor}
                onChange={e => setForm({ ...form, fornecedor: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Nome do item</label>
              <input
                type="text"
                placeholder="Descrição do item ou serviço"
                value={form.nome_item}
                onChange={e => setForm({ ...form, nome_item: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Valor Contratado</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-gray-400">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor_contratado}
                  onChange={e => setForm({ ...form, valor_contratado: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Valor Realizado</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-gray-400">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor_realizado}
                  onChange={e => setForm({ ...form, valor_realizado: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          {erro && <p className="text-red-500 text-sm mt-3">{erro}</p>}
          {sucesso && <p className="text-green-600 text-sm mt-3">Salvo com sucesso!</p>}

          <button
            onClick={salvar}
            disabled={loading}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar despesa'}
          </button>
        </div>
      )}

      {/* Totais gerais */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">Total Contratado</p>
          <p className="text-lg font-semibold text-gray-800">{fmt(totalContratado)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">Total Realizado</p>
          <p className="text-lg font-semibold text-blue-600">{fmt(totalRealizado)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">Saldo Total</p>
          <p className={`text-lg font-semibold ${totalSaldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(totalSaldo)}</p>
        </div>
      </div>

      {/* Filtro por categoria */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <select
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Itens agrupados por categoria */}
      {Object.keys(itensPorCategoria).length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">Nenhuma despesa lançada ainda</p>
        </div>
      ) : (
        Object.entries(itensPorCategoria).map(([cat, itensGrupo]) => {
          const contratadoCat = itensGrupo.reduce((a, i) => a + parseFloat(i.valor_contratado || 0), 0)
          const realizadoCat = itensGrupo.reduce((a, i) => a + parseFloat(i.valor_realizado || 0), 0)
          const saldoCat = contratadoCat - realizadoCat

          return (
            <div key={cat} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">{cat}</span>
                <div className="flex gap-6 text-xs text-gray-400">
                  <span>Contratado: <span className="text-gray-700 font-medium">{fmt(contratadoCat)}</span></span>
                  <span>Realizado: <span className="text-blue-600 font-medium">{fmt(realizadoCat)}</span></span>
                  <span>Saldo: <span className={`font-medium ${saldoCat >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(saldoCat)}</span></span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-2 text-xs text-gray-400 font-medium">Data</th>
                    <th className="text-left px-6 py-2 text-xs text-gray-400 font-medium">Item</th>
                    <th className="text-left px-6 py-2 text-xs text-gray-400 font-medium">Fornecedor</th>
                    <th className="text-right px-6 py-2 text-xs text-gray-400 font-medium">Contratado</th>
                    <th className="text-right px-6 py-2 text-xs text-gray-400 font-medium">Realizado</th>
                    <th className="text-right px-6 py-2 text-xs text-gray-400 font-medium">Saldo</th>
                    <th className="px-6 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itensGrupo.map((item, i) => {
                    const saldo = parseFloat(item.valor_contratado) - parseFloat(item.valor_realizado)
                    return (
                      <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-3 text-gray-600">
                          {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-3 text-gray-800 font-medium">{item.nome_item}</td>
                        <td className="px-6 py-3 text-gray-500">{item.fornecedor || '—'}</td>
                        <td className="px-6 py-3 text-right text-gray-700">{fmt(item.valor_contratado)}</td>
                        <td className="px-6 py-3 text-right text-blue-600">{fmt(item.valor_realizado)}</td>
                        <td className={`px-6 py-3 text-right font-medium ${saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {fmt(saldo)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => deletar(item.id)}
                            className="text-red-400 text-xs hover:text-red-600"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })
      )}
    </div>
  )
}