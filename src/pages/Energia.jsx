import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

const ANOS = Array.from({ length: 13 }, (_, i) => 2018 + i)
const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Energia() {
  const [instalacoes, setInstalacoes] = useState([])
  const [contas, setContas] = useState([])
  const [anoSelecionado, setAnoSelecionado] = useState(2018)
  const [statusFiltro, setStatusFiltro] = useState('')
  const [titularFiltro, setTitularFiltro] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [formEdit, setFormEdit] = useState({})
  const [form, setForm] = useState({
    titular: '', codigo: '', local_instalacao: '', status: 'LIGADO', observacao: ''
  })
  const [erro, setErro] = useState('')
  const [valoresEditando, setValoresEditando] = useState(null)
  const [valoresMeses, setValoresMeses] = useState({})

  useEffect(() => {
    buscarDados()
  }, [anoSelecionado, statusFiltro, titularFiltro])

  async function buscarDados() {
    setLoading(true)

    let query = supabase.from('instalacoes').select('*').order('titular')
    if (statusFiltro) query = query.eq('status', statusFiltro)
    if (titularFiltro) query = query.eq('titular', titularFiltro)

    const { data: inst } = await query
    setInstalacoes(inst || [])

    if (inst && inst.length > 0) {
      const ids = inst.map(i => i.id)
      const { data: contasData } = await supabase
        .from('contas_energia')
        .select('*')
        .in('instalacao_id', ids)
        .eq('ano', anoSelecionado)
      setContas(contasData || [])
    } else {
      setContas([])
    }

    setLoading(false)
  }

  function getValor(instalacaoId, mes) {
    const conta = contas.find(c => c.instalacao_id === instalacaoId && c.mes === mes)
    return conta ? parseFloat(conta.valor) : 0
  }

  function getTotalInstalacao(instalacaoId) {
    return MESES.reduce((acc, _, i) => acc + getValor(instalacaoId, i + 1), 0)
  }

  function getTotalMes(mes) {
    return instalacoes
      .filter(i => i.status === 'LIGADO')
      .reduce((acc, inst) => acc + getValor(inst.id, mes), 0)
  }

  async function salvarInstalacao() {
    if (!form.titular.trim()) return setErro('Informe o titular')
    if (!form.codigo.trim()) return setErro('Informe o código')

    setLoading(true)
    setErro('')

    const { error } = await supabase.from('instalacoes').insert({
      titular: form.titular.trim(),
      codigo: form.codigo.trim(),
      local_instalacao: form.local_instalacao.trim() || null,
      status: form.status,
      observacao: form.observacao.trim() || null,
    })

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
    } else {
      setForm({ titular: '', codigo: '', local_instalacao: '', status: 'LIGADO', observacao: '' })
      setMostrarForm(false)
      buscarDados()
    }
    setLoading(false)
  }

  async function salvarEdicao(id) {
    await supabase.from('instalacoes').update({
      titular: formEdit.titular,
      codigo: formEdit.codigo,
      local_instalacao: formEdit.local_instalacao || null,
      status: formEdit.status,
      observacao: formEdit.observacao || null,
    }).eq('id', id)
    setEditando(null)
    buscarDados()
  }

  async function deletar(id) {
    if (!confirm('Tem certeza que deseja excluir esta instalação?')) return
    await supabase.from('instalacoes').delete().eq('id', id)
    buscarDados()
  }

  async function abrirValores(instalacao) {
    setValoresEditando(instalacao)
    const { data } = await supabase
      .from('contas_energia')
      .select('*')
      .eq('instalacao_id', instalacao.id)
      .eq('ano', anoSelecionado)

    const vals = {}
    MESES.forEach((_, i) => {
      const conta = data?.find(c => c.mes === i + 1)
      vals[i + 1] = conta ? conta.valor : ''
    })
    setValoresMeses(vals)
  }

  async function salvarValores() {
    const upserts = MESES.map((_, i) => ({
      instalacao_id: valoresEditando.id,
      mes: i + 1,
      ano: anoSelecionado,
      valor: parseFloat(valoresMeses[i + 1] || 0)
    })).filter(u => u.valor > 0)

    if (upserts.length > 0) {
      await supabase.from('contas_energia')
        .upsert(upserts, { onConflict: 'instalacao_id,mes,ano' })
    }

    setValoresEditando(null)
    buscarDados()
  }

  const titulares = [...new Set(instalacoes.map(i => i.titular))]
  const ligadas = instalacoes.filter(i => i.status === 'LIGADO')
  const desligadas = instalacoes.filter(i => i.status === 'DESLIGADO')
  const totalGeral = ligadas.reduce((acc, inst) => acc + getTotalInstalacao(inst.id), 0)

  return (
    <div className="max-w-full mx-auto px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Rede de Energia (Elektro)</h1>
        <button
          onClick={() => { setMostrarForm(!mostrarForm); setErro('') }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {mostrarForm ? 'Cancelar' : '+ Nova instalação'}
        </button>
      </div>

      {/* Formulário nova instalação */}
      {mostrarForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Nova instalação</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Titular</label>
              <input type="text" value={form.titular} onChange={e => setForm({ ...form, titular: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Código</label>
              <input type="text" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Local da instalação</label>
              <input type="text" value={form.local_instalacao} onChange={e => setForm({ ...form, local_instalacao: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400">
                <option value="LIGADO">LIGADO</option>
                <option value="DESLIGADO">DESLIGADO</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Observação</label>
              <input type="text" placeholder="Ex: Desligado em Mar/2021" value={form.observacao}
                onChange={e => setForm({ ...form, observacao: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          {erro && <p className="text-red-500 text-sm mt-3">{erro}</p>}
          <button onClick={salvarInstalacao} disabled={loading}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Salvando...' : 'Salvar instalação'}
          </button>
        </div>
      )}

      {/* Modal de valores mensais */}
      {valoresEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-lg">
            <h2 className="text-sm font-medium text-gray-700 mb-1">Valores mensais — {anoSelecionado}</h2>
            <p className="text-xs text-gray-400 mb-4">{valoresEditando.titular} · {valoresEditando.codigo}</p>
            <div className="grid grid-cols-3 gap-3">
              {MESES.map((mes, i) => (
                <div key={mes}>
                  <label className="text-xs text-gray-500 mb-1 block">{mes}/{anoSelecionado}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-gray-400">R$</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="0,00"
                      value={valoresMeses[i + 1] || ''}
                      onChange={e => setValoresMeses({ ...valoresMeses, [i + 1]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={salvarValores}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                Salvar
              </button>
              <button onClick={() => setValoresEditando(null)}
                className="text-gray-400 text-sm hover:text-gray-600">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Ano</label>
          <select value={anoSelecionado} onChange={e => setAnoSelecionado(parseInt(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400">
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Status</label>
          <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400">
            <option value="">Todos</option>
            <option value="LIGADO">LIGADO</option>
            <option value="DESLIGADO">DESLIGADO</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Titular</label>
          <select value={titularFiltro} onChange={e => setTitularFiltro(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400">
            <option value="">Todos</option>
            {titulares.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Tabela LIGADOS */}
      {ligadas.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-green-700">LIGADOS ({ligadas.length})</span>
            <span className="text-xs text-green-700 font-medium">Total ano: {fmt(totalGeral)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Titular</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Código</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Local</th>
                  {MESES.map(m => <th key={m} className="text-right px-3 py-2 text-xs text-gray-400 font-medium">{m}</th>)}
                  <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {ligadas.map((inst, i) => (
                  <tr key={inst.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {editando === inst.id ? (
                      <td colSpan={MESES.length + 4} className="px-4 py-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Titular</label>
                            <input type="text" value={formEdit.titular} onChange={e => setFormEdit({ ...formEdit, titular: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Código</label>
                            <input type="text" value={formEdit.codigo} onChange={e => setFormEdit({ ...formEdit, codigo: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Status</label>
                            <select value={formEdit.status} onChange={e => setFormEdit({ ...formEdit, status: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                              <option value="LIGADO">LIGADO</option>
                              <option value="DESLIGADO">DESLIGADO</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block">Local</label>
                            <input type="text" value={formEdit.local_instalacao} onChange={e => setFormEdit({ ...formEdit, local_instalacao: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Observação</label>
                            <input type="text" value={formEdit.observacao} onChange={e => setFormEdit({ ...formEdit, observacao: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div className="col-span-3 flex gap-3">
                            <button onClick={() => salvarEdicao(inst.id)}
                              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">Salvar</button>
                            <button onClick={() => setEditando(null)} className="text-gray-400 text-sm hover:text-gray-600">Cancelar</button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{inst.titular}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{inst.codigo}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{inst.local_instalacao}</td>
                        {MESES.map((_, i) => (
                          <td key={i} className="px-3 py-3 text-right text-gray-600 whitespace-nowrap text-xs">
                            {getValor(inst.id, i + 1) > 0 ? fmt(getValor(inst.id, i + 1)) : '—'}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">
                          {fmt(getTotalInstalacao(inst.id))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => abrirValores(inst)}
                                className="text-green-500 text-xs hover:text-green-700 whitespace-nowrap">Valores</button>
                                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inst.local_instalacao)}`, '_blank')}
                                className="text-purple-400 text-xs hover:text-purple-600 whitespace-nowrap">Maps</button>
                                <button onClick={() => { setEditando(inst.id); setFormEdit({ titular: inst.titular, codigo: inst.codigo, local_instalacao: inst.local_instalacao || '', status: inst.status, observacao: inst.observacao || '' }) }}
                                className="text-blue-400 text-xs hover:text-blue-600">Editar</button>
                                <button onClick={() => deletar(inst.id)}
                                className="text-red-400 text-xs hover:text-red-600">Excluir</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-600">Total mensal</td>
                  {MESES.map((_, i) => (
                    <td key={i} className="px-3 py-3 text-right text-xs font-semibold text-gray-800 whitespace-nowrap">
                      {getTotalMes(i + 1) > 0 ? fmt(getTotalMes(i + 1)) : '—'}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-xs font-semibold text-gray-800">{fmt(totalGeral)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela DESLIGADOS */}
      {desligadas.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 bg-red-50 border-b border-red-100">
            <span className="text-xs font-semibold text-red-700">DESLIGADOS ({desligadas.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Titular</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Código</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Local</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Observação</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {desligadas.map((inst, i) => (
                  <tr key={inst.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {editando === inst.id ? (
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Titular</label>
                            <input type="text" value={formEdit.titular} onChange={e => setFormEdit({ ...formEdit, titular: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Código</label>
                            <input type="text" value={formEdit.codigo} onChange={e => setFormEdit({ ...formEdit, codigo: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Status</label>
                            <select value={formEdit.status} onChange={e => setFormEdit({ ...formEdit, status: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                              <option value="LIGADO">LIGADO</option>
                              <option value="DESLIGADO">DESLIGADO</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block">Local</label>
                            <input type="text" value={formEdit.local_instalacao} onChange={e => setFormEdit({ ...formEdit, local_instalacao: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Observação</label>
                            <input type="text" value={formEdit.observacao} onChange={e => setFormEdit({ ...formEdit, observacao: e.target.value })}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div className="col-span-3 flex gap-3">
                            <button onClick={() => salvarEdicao(inst.id)}
                              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">Salvar</button>
                            <button onClick={() => setEditando(null)} className="text-gray-400 text-sm hover:text-gray-600">Cancelar</button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-gray-800 font-medium">{inst.titular}</td>
                        <td className="px-4 py-3 text-gray-600">{inst.codigo}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{inst.local_instalacao}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{inst.observacao || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inst.local_instalacao)}`, '_blank')}
                                className="text-purple-400 text-xs hover:text-purple-600 whitespace-nowrap">Maps</button>
                                <button onClick={() => { setEditando(inst.id); setFormEdit({ titular: inst.titular, codigo: inst.codigo, local_instalacao: inst.local_instalacao || '', status: inst.status, observacao: inst.observacao || '' }) }}
                                className="text-blue-400 text-xs hover:text-blue-600">Editar</button>
                                <button onClick={() => deletar(inst.id)}
                                className="text-red-400 text-xs hover:text-red-600">Excluir</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {instalacoes.length === 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">Nenhuma instalação cadastrada ainda</p>
        </div>
      )}
    </div>
  )
}