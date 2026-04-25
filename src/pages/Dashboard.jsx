import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const PERIODOS = [
  '15/16','16/17','17/18','18/19','19/20',
  '20/21','21/22','22/23','23/24','24/25',
  '25/26','26/27','27/28','28/29','29/30'
]

const fmt = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
const fmtShort = v => `R$ ${(Number(v) / 1000).toFixed(0)}k`

export default function Dashboard() {
  const [dados, setDados] = useState([])
  const [totais, setTotais] = useState({ receitaBruta: 0, receitaLiquida: 0, lucroLiquido: 0, totalContratos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setLoading(true)

    const { data: dre } = await supabase
      .from('dre_periodos')
      .select('*')
      .order('periodo')

    const { data: contratos } = await supabase
      .from('contratos')
      .select('id, aliquota_imposto, periodo_inicio, periodo_fim')

    const { data: receitas } = await supabase
      .from('receita_bruta')
      .select('contrato_id, periodo, valor')

    const dadosPorPeriodo = PERIODOS.map(periodo => {

      const dreperiodo = dre?.find(d => d.periodo === periodo) || {}

      const contratosAtivos = (contratos || []).filter(c => {
        const inicio = PERIODOS.indexOf(c.periodo_inicio)
        const fim = PERIODOS.indexOf(c.periodo_fim)
        const atual = PERIODOS.indexOf(periodo)
        return atual >= inicio && atual <= fim
      })

      const ids = contratosAtivos.map(c => c.id)
      let receitaBruta = 0
      let tributos = 0

      ;(receitas || [])
        .filter(r => r.periodo === periodo && ids.includes(r.contrato_id))
        .forEach(r => {
          const contrato = contratosAtivos.find(c => c.id === r.contrato_id)
          receitaBruta += parseFloat(r.valor || 0)
          tributos += parseFloat(r.valor || 0) * parseFloat(contrato?.aliquota_imposto || 0)
        })

      const gratificacoes = parseFloat(dreperiodo.gratificacoes || 0)
      const bonusVeiculacao = parseFloat(dreperiodo.bonus_veiculacao || 0)
      const comissaoVendedor = parseFloat(dreperiodo.comissao_vendedor || 0)
      const outorga = parseFloat(dreperiodo.outorga || 0)
      const totalComissoes = gratificacoes + bonusVeiculacao + comissaoVendedor

      const totalCustos =
        parseFloat(dreperiodo.custo_prestacao_mo || 0) +
        parseFloat(dreperiodo.materiais_insumos || 0) +
        parseFloat(dreperiodo.prestacao_servicos || 0) +
        parseFloat(dreperiodo.comunicacao_visual || 0) +
        parseFloat(dreperiodo.transporte || 0) +
        parseFloat(dreperiodo.reembolso_despesas || 0) +
        parseFloat(dreperiodo.subgrupo_extras || 0) +
        parseFloat(dreperiodo.servicos_publicos || 0)

      const receitaLiqAntesBonif = receitaBruta - tributos
      const receitaLiquida = receitaLiqAntesBonif - totalComissoes - outorga
      const lucroLiquido = receitaLiquida - totalCustos

      return {
        periodo,
        receitaBruta,
        tributos,
        receitaLiquida,
        lucroLiquido,
        totalCustos,
      }
    })

    setDados(dadosPorPeriodo)

    const { count } = await supabase
      .from('contratos')
      .select('*', { count: 'exact', head: true })

    setTotais({
      receitaBruta: dadosPorPeriodo.reduce((a, d) => a + d.receitaBruta, 0),
      receitaLiquida: dadosPorPeriodo.reduce((a, d) => a + d.receitaLiquida, 0),
      lucroLiquido: dadosPorPeriodo.reduce((a, d) => a + d.lucroLiquido, 0),
      totalContratos: count || 0,
    })

    setLoading(false)
  }

  const melhorPeriodo = dados.reduce((a, b) => b.lucroLiquido > a.lucroLiquido ? b : a, dados[0])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Receita Bruta Total', value: fmt(totais.receitaBruta), color: 'text-gray-800' },
          { label: 'Receita Líquida Total', value: fmt(totais.receitaLiquida), color: 'text-blue-600' },
          { label: 'Lucro Líquido Total', value: fmt(totais.lucroLiquido), color: totais.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-500' },
          { label: 'Total de Contratos', value: totais.totalContratos, color: 'text-gray-800' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs text-gray-400 mb-1">{card.label}</p>
            <p className={`text-xl font-semibold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {melhorPeriodo && melhorPeriodo.lucroLiquido > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-6 py-4">
          <p className="text-sm text-green-700">
            Melhor período: <span className="font-semibold">{melhorPeriodo.periodo}</span> com lucro líquido de <span className="font-semibold">{fmt(melhorPeriodo.lucroLiquido)}</span>
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-6">Receita Bruta × Receita Líquida × Lucro Líquido</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dados} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="receitaBruta" name="Receita Bruta" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="receitaLiquida" name="Receita Líquida" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="lucroLiquido" name="Lucro Líquido" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-6">Custos Operacionais por Período</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dados} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="totalCustos" name="Custos Operacionais" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tributos" name="Tributos" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Resumo por período</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Período</th>
                <th className="text-right px-6 py-3 text-xs text-gray-400 font-medium">Receita Bruta</th>
                <th className="text-right px-6 py-3 text-xs text-gray-400 font-medium">Tributos</th>
                <th className="text-right px-6 py-3 text-xs text-gray-400 font-medium">Receita Líquida</th>
                <th className="text-right px-6 py-3 text-xs text-gray-400 font-medium">Custos</th>
                <th className="text-right px-6 py-3 text-xs text-gray-400 font-medium">Lucro Líquido</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((d, i) => (
                <tr key={d.periodo} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 font-medium text-gray-700">{d.periodo}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{fmt(d.receitaBruta)}</td>
                  <td className="px-6 py-3 text-right text-red-400">{fmt(d.tributos)}</td>
                  <td className="px-6 py-3 text-right text-blue-600">{fmt(d.receitaLiquida)}</td>
                  <td className="px-6 py-3 text-right text-yellow-600">{fmt(d.totalCustos)}</td>
                  <td className={`px-6 py-3 text-right font-medium ${d.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {fmt(d.lucroLiquido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}