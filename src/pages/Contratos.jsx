import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PERIODOS = [
  '15/16','16/17','17/18','18/19','19/20',
  '20/21','21/22','22/23','23/24','24/25',
  '25/26','26/27','27/28','28/29','29/30'
]

export default function Contratos() {
  const [clientes, setClientes] = useState([])
  const [contratos, setContratos] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [aliquota, setAliquota] = useState('')
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(null)
  const [formEdit, setFormEdit] = useState({})

  useEffect(() => {
    buscarClientes()
    buscarContratos()
  }, [])

  async function buscarClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
  }

  async function buscarContratos() {
    const { data } = await supabase
      .from('contratos')
      .select('*, clientes(nome)')
      .order('id')
    setContratos(data || [])
  }

  async function adicionarContrato() {
    if (!clienteId) return setErro('Selecione um cliente')
    if (!periodoInicio) return setErro('Selecione o período de início')
    if (!periodoFim) return setErro('Selecione o período de fim')
    if (aliquota === '') return setErro('Digite a alíquota de imposto')

    setLoading(true)
    setErro('')

    const { error } = await supabase.from('contratos').insert({
      cliente_id: clienteId,
      descricao: descricao.trim() || null,
      aliquota_imposto: parseFloat(aliquota) / 100,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim
    })

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
    } else {
      setClienteId('')
      setDescricao('')
      setAliquota('')
      setPeriodoInicio('')
      setPeriodoFim('')
      buscarContratos()
    }
    setLoading(false)
  }

  function iniciarEdicao(contrato) {
    setEditando(contrato.id)
    setFormEdit({
      cliente_id: contrato.cliente_id,
      descricao: contrato.descricao || '',
      aliquota_imposto: (contrato.aliquota_imposto * 100).toFixed(0),
      periodo_inicio: contrato.periodo_inicio,
      periodo_fim: contrato.periodo_fim,
    })
  }

  async function salvarEdicao(id) {
    const { error } = await supabase.from('contratos').update({
      cliente_id: formEdit.cliente_id,
      descricao: formEdit.descricao || null,
      aliquota_imposto: parseFloat(formEdit.aliquota_imposto) / 100,
      periodo_inicio: formEdit.periodo_inicio,
      periodo_fim: formEdit.periodo_fim,
    }).eq('id', id)

    if (!error) {
      setEditando(null)
      buscarContratos()
    }
  }

  async function deletarContrato(id) {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return
    await supabase.from('contratos').delete().eq('id', id)
    buscarContratos()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Contratos</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Novo contrato</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
            <select
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">Selecione o cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Contrato outdoor centro"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Alíquota de imposto (%)</label>
            <input
              type="number"
              placeholder="Ex: 12"
              min="0"
              max="18"
              value={aliquota}
              onChange={e => setAliquota(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div></div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Período início</label>
            <select
              value={periodoInicio}
              onChange={e => setPeriodoInicio(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">Selecione</option>
              {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Período fim</label>
            <select
              value={periodoFim}
              onChange={e => setPeriodoFim(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">Selecione</option>
              {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {erro && <p className="text-red-500 text-sm mt-3">{erro}</p>}

        <button
          onClick={adicionarContrato}
          disabled={loading}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Adicionar contrato'}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {contratos.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum contrato cadastrado ainda</p>
        ) : (
          <ul>
            {contratos.map((contrato, i) => (
              <li
                key={contrato.id}
                className={`px-6 py-4 ${i !== contratos.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {editando === contrato.id ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
                      <select
                        value={formEdit.cliente_id}
                        onChange={e => setFormEdit({ ...formEdit, cliente_id: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                      >
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
                      <input
                        type="text"
                        value={formEdit.descricao}
                        onChange={e => setFormEdit({ ...formEdit, descricao: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Alíquota (%)</label>
                      <input
                        type="number"
                        value={formEdit.aliquota_imposto}
                        onChange={e => setFormEdit({ ...formEdit, aliquota_imposto: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div></div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Período início</label>
                      <select
                        value={formEdit.periodo_inicio}
                        onChange={e => setFormEdit({ ...formEdit, periodo_inicio: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                      >
                        {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Período fim</label>
                      <select
                        value={formEdit.periodo_fim}
                        onChange={e => setFormEdit({ ...formEdit, periodo_fim: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                      >
                        {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 flex gap-3 mt-1">
                      <button
                        onClick={() => salvarEdicao(contrato.id)}
                        className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditando(null)}
                        className="text-gray-400 text-sm hover:text-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{contrato.clientes?.nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {contrato.descricao && `${contrato.descricao} · `}
                        {contrato.periodo_inicio} até {contrato.periodo_fim} ·
                        Alíquota: {(contrato.aliquota_imposto * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => iniciarEdicao(contrato)}
                        className="text-blue-400 text-sm hover:text-blue-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deletarContrato(contrato.id)}
                        className="text-red-400 text-sm hover:text-red-600"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}