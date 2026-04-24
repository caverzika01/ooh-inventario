import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PERIODOS = [
  '15/16','16/17','17/18','18/19','19/20',
  '20/21','21/22','22/23','23/24','24/25',
  '25/26','26/27','27/28','28/29','29/30'
]

const CAMPOS_MANUAIS = [
  { key: 'gratificacoes', label: 'Gratificações' },
  { key: 'bonus_veiculacao', label: 'Bônus de Veiculação (BV)' },
  { key: 'comissao_vendedor', label: 'Comissão de Venda (Vendedor)' },
  { key: 'outorga', label: 'Outorga' },
  { key: 'custo_prestacao_mo', label: 'Prestação de Serviços + M.O. Equipe' },
  { key: 'materiais_insumos', label: 'Materiais / Insumos M.O.' },
  { key: 'prestacao_servicos', label: 'Prestação de Serviços' },
  { key: 'comunicacao_visual', label: 'Comunicação Visual' },
  { key: 'transporte', label: 'Transporte' },
  { key: 'reembolso_despesas', label: 'Reembolso de Despesas' },
  { key: 'subgrupo_extras', label: 'Sub-grupo / Extras' },
  { key: 'servicos_publicos', label: 'Serviços Públicos (Elektro etc.)' },
]

export default function DRE() {
  const [periodo, setPeriodo] = useState('')
  const [dre, setDre] = useState({})
  const [receitaBruta, setReceitaBruta] = useState(0)
  const [tributos, setTributos] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    if (periodo) carregarDados()
  }, [periodo])

  async function carregarDados() {
    setLoading(true)
    setSucesso(false)

    // Buscar receita bruta e tributos calculados automaticamente
    const { data: contratos } = await supabase
      .from('contratos')
      .select('id, aliquota_imposto, periodo_inicio, periodo_fim')

    const contratosNoPeriodo = (contratos || []).filter(c => {
      const inicio = PERIODOS.indexOf(c.periodo_inicio)
      const fim = PERIODOS.indexOf(c.periodo_fim)
      const atual = PERIODOS.indexOf(periodo)
      return atual >= inicio && atual <= fim
    })

    const ids = contratosNoPeriodo.map(c => c.id)

    let totalBruto = 0
    let totalTributos = 0

    if (ids.length > 0) {
      const { data: receitas } = await supabase
        .from('receita_bruta')
        .select('contrato_id, valor')
        .eq('periodo', periodo)
        .in('contrato_id', ids)

      receitas?.forEach(r => {
        const contrato = contratosNoPeriodo.find(c => c.id === r.contrato_id)
        totalBruto += parseFloat(r.valor || 0)
        totalTributos += parseFloat(r.valor || 0) * parseFloat(contrato?.aliquota_imposto || 0)
      })
    }

    setReceitaBruta(totalBruto)
    setTributos(totalTributos)

    // Buscar valores manuais já salvos
    const { data: dreData } = await supabase
      .from('dre_periodos')
      .select('*')
      .eq('periodo', periodo)
      .single()

    if (dreData) {
      const valores = {}
      CAMPOS_MANUAIS.forEach(c => {
        valores[c.key] = dreData[c.key] || ''
      })
      setDre(valores)
    } else {
      const valores = {}
      CAMPOS_MANUAIS.forEach(c => { valores[c.key] = '' })
      setDre(valores)
    }

    setLoading(false)
  }

  async function salvarDRE() {
    setLoading(true)
    setSucesso(false)

    const payload = { periodo }
    CAMPOS_MANUAIS.forEach(c => {
      payload[c.key] = parseFloat(dre[c.key] || 0)
    })

    // Calcular automaticamente
    const receitaLiqAntesBonif = receitaBruta - tributos
    const totalComissoes = parseFloat(dre.gratificacoes || 0) + parseFloat(dre.bonus_veiculacao || 0) + parseFloat(dre.comissao_vendedor || 0)
    const receitaLiquida = receitaLiqAntesBonif - totalComissoes - parseFloat(dre.outorga || 0)
    const totalCustos = CAMPOS_MANUAIS
      .filter(c => ['custo_prestacao_mo','materiais_insumos','prestacao_servicos','comunicacao_visual','transporte','reembolso_despesas','subgrupo_extras','servicos_publicos'].includes(c.key))
      .reduce((acc, c) => acc + parseFloat(dre[c.key] || 0), 0)
    const lucroLiquido = receitaLiquida - totalCustos

    payload.tributos_faturamento = tributos
    payload.receita_liq_antes_bonif = receitaLiqAntesBonif
    payload.receita_liquida = receitaLiquida
    payload.lucro_liquido = lucroLiquido

    const { error } = await supabase
      .from('dre_periodos')
      .upsert(payload, { onConflict: 'periodo' })

    if (!error) setSucesso(true)
    setLoading(false)
  }

  const receitaLiqAntesBonif = receitaBruta - tributos
  const totalComissoes = parseFloat(dre.gratificacoes || 0) + parseFloat(dre.bonus_veiculacao || 0) + parseFloat(dre.comissao_vendedor || 0)
  const receitaLiquida = receitaLiqAntesBonif - totalComissoes - parseFloat(dre.outorga || 0)
  const totalCustos = CAMPOS_MANUAIS
    .filter(c => ['custo_prestacao_mo','materiais_insumos','prestacao_servicos','comunicacao_visual','transporte','reembolso_despesas','subgrupo_extras','servicos_publicos'].includes(c.key))
    .reduce((acc, c) => acc + parseFloat(dre[c.key] || 0), 0)
  const lucroLiquido = receitaLiquida - totalCustos

  const fmt = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">DRE por período</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="text-xs text-gray-500 mb-1 block">Selecione o período</label>
        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="">Selecione um período</option>
          {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {periodo && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">

          {/* Calculados automaticamente */}
          <div>
            <h2 className="text-xs font-medium text-gray-400 uppercase mb-3">Calculado automaticamente</h2>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Receita Bruta</span>
                <span className="text-sm font-medium text-gray-800">R$ {fmt(receitaBruta)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Tributos sobre Faturamento</span>
                <span className="text-sm text-red-500">- R$ {fmt(tributos)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-700">Receita Líquida antes das Bonificações</span>
                <span className="text-sm font-medium text-gray-800">R$ {fmt(receitaLiqAntesBonif)}</span>
              </div>
            </div>
          </div>

          {/* Comissões e bonificações */}
          <div>
            <h2 className="text-xs font-medium text-gray-400 uppercase mb-3">Comissões e Bonificações</h2>
            <div className="space-y-2">
              {CAMPOS_MANUAIS.slice(0, 4).map(campo => (
                <div key={campo.key} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 flex-1">{campo.label}</span>
                  <div className="relative w-44">
                    <span className="absolute left-3 top-2 text-sm text-gray-400">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={dre[campo.key] || ''}
                      onChange={e => setDre({ ...dre, [campo.key]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t border-gray-100 mt-2">
                <span className="text-sm font-medium text-gray-700">Receita Líquida</span>
                <span className={`text-sm font-medium ${receitaLiquida >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  R$ {fmt(receitaLiquida)}
                </span>
              </div>
            </div>
          </div>

          {/* Custos administrativos */}
          <div>
            <h2 className="text-xs font-medium text-gray-400 uppercase mb-3">Custos Administrativos e Operacionais</h2>
            <div className="space-y-2">
              {CAMPOS_MANUAIS.slice(4).map(campo => (
                <div key={campo.key} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 flex-1">{campo.label}</span>
                  <div className="relative w-44">
                    <span className="absolute left-3 top-2 text-sm text-gray-400">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={dre[campo.key] || ''}
                      onChange={e => setDre({ ...dre, [campo.key]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resultado final */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Custos</span>
              <span className="text-sm text-red-500">- R$ {fmt(totalCustos)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="text-base font-semibold text-gray-800">Lucro Líquido do Exercício</span>
              <span className={`text-base font-semibold ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                R$ {fmt(lucroLiquido)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {sucesso && <p className="text-green-600 text-sm">Salvo com sucesso!</p>}
            <button
              onClick={salvarDRE}
              disabled={loading}
              className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar DRE'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">Carregando dados...</p>
        </div>
      )}
    </div>
  )
}