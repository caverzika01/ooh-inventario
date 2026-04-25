import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const PERIODOS = [
  '15/16','16/17','17/18','18/19','19/20',
  '20/21','21/22','22/23','23/24','24/25',
  '25/26','26/27','27/28','28/29','29/30'
]

const ATIVOS = [
  { key: 'abrigos_onibus', label: 'Abrigos de Ônibus' },
  { key: 'relogio_eletronico', label: 'Relógio Eletrônico' },
  { key: 'relogio_eletronico_bndes', label: 'Relógio Eletrônico - BNDES' },
  { key: 'lixeira_ecologica', label: 'Lixeira Ecológica - Amostra' },
  { key: 'placas_rua', label: 'Placas de Rua' },
  { key: 'bancos_publicos', label: 'Bancos Públicos' },
  { key: 'totem_indicativo_amostra', label: 'Totem Indicativo - Amostra' },
  { key: 'totem_indicativo_comercial', label: 'Totem Indicativo Comercial' },
  { key: 'painel_led_full_color', label: 'Painel LED Full Color' },
  { key: 'portico', label: 'Pórtico' },
  { key: 'revenda_veiculos', label: 'Revenda (Veículos e Ferramentas)' },
]

const fmt = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
const fmtShort = v => `R$ ${(Number(v) / 1000).toFixed(0)}k`

export default function FluxoCaixa() {
  const [periodo, setPeriodo] = useState('')
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [dadosGrafico, setDadosGrafico] = useState([])

  useEffect(() => {
    carregarGrafico()
  }, [])

  useEffect(() => {
    if (periodo) carregarPeriodo()
  }, [periodo])

  async function carregarGrafico() {
    const { data: fluxos } = await supabase
      .from('fluxo_caixa_periodos')
      .select('*')
      .order('periodo')

    const { data: dre } = await supabase
      .from('dre_periodos')
      .select('periodo, lucro_liquido')

    const dados = PERIODOS.map(p => {
      const fluxo = fluxos?.find(f => f.periodo === p) || {}
      const dreP = dre?.find(d => d.periodo === p) || {}
      const totalInvestimento = ATIVOS.reduce((acc, a) => acc + parseFloat(fluxo[a.key] || 0), 0)
      return {
        periodo: p,
        investimento: totalInvestimento,
        fluxoCaixaLivre: parseFloat(fluxo.fluxo_caixa_livre || 0),
        fluxoCaixaAcumulado: parseFloat(fluxo.fluxo_caixa_acumulado || 0),
        lucroLiquido: parseFloat(dreP.lucro_liquido || 0),
      }
    })

    setDadosGrafico(dados)
  }

  async function carregarPeriodo() {
    setLoading(true)
    setSucesso(false)

    const { data } = await supabase
      .from('fluxo_caixa_periodos')
      .select('*')
      .eq('periodo', periodo)
      .single()

    if (data) {
      const vals = {}
      ATIVOS.forEach(a => { vals[a.key] = data[a.key] || '' })
      setValores(vals)
    } else {
      const vals = {}
      ATIVOS.forEach(a => { vals[a.key] = '' })
      setValores(vals)
    }

    setLoading(false)
  }

  async function salvar() {
    setLoading(true)
    setSucesso(false)

    const payload = { periodo }
    ATIVOS.forEach(a => { payload[a.key] = parseFloat(valores[a.key] || 0) })

    // Buscar lucro líquido do período para calcular fluxo livre
    const { data: dre } = await supabase
      .from('dre_periodos')
      .select('lucro_liquido')
      .eq('periodo', periodo)
      .single()

    const lucroLiquido = parseFloat(dre?.lucro_liquido || 0)
    const totalInvestimento = ATIVOS.reduce((acc, a) => acc + parseFloat(valores[a.key] || 0), 0)
    const fluxoCaixaLivre = lucroLiquido - totalInvestimento

    // Calcular fluxo acumulado
    const indicePeriodo = PERIODOS.indexOf(periodo)
    let acumulado = fluxoCaixaLivre

    if (indicePeriodo > 0) {
      const { data: anterior } = await supabase
        .from('fluxo_caixa_periodos')
        .select('fluxo_caixa_acumulado')
        .eq('periodo', PERIODOS[indicePeriodo - 1])
        .single()
      acumulado += parseFloat(anterior?.fluxo_caixa_acumulado || 0)
    }

    payload.fluxo_caixa_livre = fluxoCaixaLivre
    payload.fluxo_caixa_acumulado = acumulado

    const { error } = await supabase
      .from('fluxo_caixa_periodos')
      .upsert(payload, { onConflict: 'periodo' })

    if (!error) {
      setSucesso(true)
      carregarGrafico()
    }
    setLoading(false)
  }

  const totalInvestimento = ATIVOS.reduce((acc, a) => acc + parseFloat(valores[a.key] || 0), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Fluxo de Caixa</h1>

      {/* Lançamento por período */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Lançar investimentos por período</h2>
        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400 mb-6"
        >
          <option value="">Selecione um período</option>
          {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {periodo && !loading && (
          <>
            <div className="space-y-3">
              <p className="text-xs text-gray-400 uppercase font-medium mb-2">Aquisição de Mobiliário</p>
              {ATIVOS.map(ativo => (
                <div key={ativo.key} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 flex-1">{ativo.label}</span>
                  <div className="relative w-44">
                    <span className="absolute left-3 top-2 text-sm text-gray-400">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={valores[ativo.key] || ''}
                      onChange={e => setValores({ ...valores, [ativo.key]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total de investimentos</p>
                <p className="text-lg font-semibold text-purple-600">{fmt(totalInvestimento)}</p>
              </div>
              <button
                onClick={salvar}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

            {sucesso && (
              <p className="text-green-600 text-sm mt-3 text-right">Salvo com sucesso!</p>
            )}
          </>
        )}
      </div>

      {/* Gráfico investimentos */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-6">Investimentos em Mobiliário por Período</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dadosGrafico} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="investimento" name="Investimento" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico fluxo acumulado */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-6">Fluxo de Caixa Livre × Acumulado</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dadosGrafico} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="fluxoCaixaLivre" name="Fluxo Livre" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="fluxoCaixaAcumulado" name="Fluxo Acumulado" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}