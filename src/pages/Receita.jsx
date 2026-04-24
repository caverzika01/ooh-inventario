import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PERIODOS = [
  '15/16','16/17','17/18','18/19','19/20',
  '20/21','21/22','22/23','23/24','24/25',
  '25/26','26/27','27/28','28/29','29/30'
]

export default function Receita() {
  const [contratos, setContratos] = useState([])
  const [contratoId, setContratoId] = useState('')
  const [contratoSelecionado, setContratoSelecionado] = useState(null)
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    buscarContratos()
  }, [])

  async function buscarContratos() {
    const { data } = await supabase
      .from('contratos')
      .select('*, clientes(nome)')
      .order('id')
    setContratos(data || [])
  }

  async function selecionarContrato(id) {
    setContratoId(id)
    setSucesso(false)
    if (!id) {
      setContratoSelecionado(null)
      setValores({})
      return
    }

    const contrato = contratos.find(c => c.id === parseInt(id))
    setContratoSelecionado(contrato)

    const { data } = await supabase
      .from('receita_bruta')
      .select('*')
      .eq('contrato_id', id)

    const valoresExistentes = {}
    if (data) {
      data.forEach(r => {
        valoresExistentes[r.periodo] = r.valor
      })
    }
    setValores(valoresExistentes)
  }

  function getPeriodosContrato() {
    if (!contratoSelecionado) return []
    const inicio = PERIODOS.indexOf(contratoSelecionado.periodo_inicio)
    const fim = PERIODOS.indexOf(contratoSelecionado.periodo_fim)
    if (inicio === -1 || fim === -1) return []
    return PERIODOS.slice(inicio, fim + 1)
  }

  async function salvarValores() {
    setLoading(true)
    setSucesso(false)

    const periodosContrato = getPeriodosContrato()
    const upserts = periodosContrato.map(periodo => ({
      contrato_id: parseInt(contratoId),
      periodo,
      valor: parseFloat(valores[periodo] || 0)
    }))

    const { error } = await supabase
      .from('receita_bruta')
      .upsert(upserts, { onConflict: 'contrato_id,periodo' })

    if (!error) setSucesso(true)
    setLoading(false)
  }

  const periodosContrato = getPeriodosContrato()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Receita por contrato</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="text-xs text-gray-500 mb-1 block">Selecione o contrato</label>
        <select
          value={contratoId}
          onChange={e => selecionarContrato(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="">Selecione um contrato</option>
          {contratos.map(c => (
            <option key={c.id} value={c.id}>
              {c.clientes?.nome} {c.descricao ? `· ${c.descricao}` : ''} ({c.periodo_inicio} até {c.periodo_fim})
            </option>
          ))}
        </select>
      </div>

      {contratoSelecionado && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-700">
              Valores por período
            </h2>
            <span className="text-xs text-gray-400">
              Alíquota: {(contratoSelecionado.aliquota_imposto * 100).toFixed(0)}%
            </span>
          </div>

          <div className="space-y-3">
            {periodosContrato.map(periodo => (
              <div key={periodo} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-16">{periodo}</span>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={valores[periodo] || ''}
                    onChange={e => setValores({ ...valores, [periodo]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <span className="text-xs text-gray-400 w-32 text-right">
                  Tributo: R$ {((parseFloat(valores[periodo] || 0) * contratoSelecionado.aliquota_imposto)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total receita bruta</p>
              <p className="text-lg font-semibold text-gray-800">
                R$ {periodosContrato.reduce((acc, p) => acc + parseFloat(valores[p] || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button
              onClick={salvarValores}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar valores'}
            </button>
          </div>

          {sucesso && (
            <p className="text-green-600 text-sm mt-3 text-right">Valores salvos com sucesso!</p>
          )}
        </div>
      )}
    </div>
  )
}