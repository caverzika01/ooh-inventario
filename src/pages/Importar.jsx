import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Papa from 'papaparse'

const PERIODOS = [
  '15/16','16/17','17/18','18/19','19/20',
  '20/21','21/22','22/23','23/24','24/25',
  '25/26','26/27','27/28','28/29','29/30'
]

function parseValor(str) {
  if (!str) return 0
  const limpo = str.trim()
  if (limpo === '-' || limpo === '-   ' || limpo === '') return 0
  return parseFloat(limpo.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0
}

function parseAliquota(str) {
  if (!str || str.trim() === '') return 0
  return parseFloat(str.replace('%', '').replace(',', '.').trim()) / 100 || 0
}

export default function Importar() {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(false)
  const [concluido, setConcluido] = useState(false)

  function adicionarLog(msg, tipo = 'info') {
    setLog(prev => [...prev, { msg, tipo, id: Date.now() + Math.random() }])
  }

  async function processarCSV(e) {
    const file = e.target.files[0]
    if (!file) return

    setLog([])
    setConcluido(false)
    setLoading(true)

    Papa.parse(file, {
      complete: async (result) => {
        const linhas = result.data

        const dados = linhas.slice(4, 229).filter(linha => {
          const nome = linha[0]?.trim()
          return nome && nome !== ''
        })

        adicionarLog(`${dados.length} contratos encontrados para importar`, 'info')

        let importados = 0
        let erros = 0

        for (const linha of dados) {
          const nomeCliente = linha[0]?.trim()
          if (!nomeCliente) continue

          const aliquota = parseAliquota(linha[18])

          const valoresPeriodos = PERIODOS.map((periodo, i) => ({
            periodo,
            valor: parseValor(linha[2 + i])
          }))

          const periodosComValor = valoresPeriodos.filter(v => v.valor > 0)
          if (periodosComValor.length === 0) {
            adicionarLog(`Ignorado (sem valores): ${nomeCliente}`, 'aviso')
            continue
          }

          const periodoInicio = periodosComValor[0].periodo
          const periodoFim = periodosComValor[periodosComValor.length - 1].periodo

          try {
            let clienteId = null
            const { data: clienteExistente } = await supabase
              .from('clientes')
              .select('id')
              .eq('nome', nomeCliente)
              .limit(1)

            if (clienteExistente && clienteExistente.length > 0) {
              clienteId = clienteExistente[0].id
            } else {
              const { data: novoCliente, error: errCliente } = await supabase
                .from('clientes')
                .insert({ nome: nomeCliente })
                .select('id')
                .single()

              if (errCliente) {
                adicionarLog(`Erro ao criar cliente: ${nomeCliente} — ${errCliente.message}`, 'erro')
                erros++
                continue
              }
              clienteId = novoCliente.id
              adicionarLog(`Cliente criado: ${nomeCliente}`, 'sucesso')
            }

            const { data: novoContrato, error: errContrato } = await supabase
              .from('contratos')
              .insert({
                cliente_id: clienteId,
                aliquota_imposto: aliquota,
                periodo_inicio: periodoInicio,
                periodo_fim: periodoFim,
              })
              .select('id')
              .single()

            if (errContrato) {
              adicionarLog(`Erro ao criar contrato: ${nomeCliente} — ${errContrato.message}`, 'erro')
              erros++
              continue
            }

            const receitas = periodosComValor.map(v => ({
              contrato_id: novoContrato.id,
              periodo: v.periodo,
              valor: v.valor
            }))

            const { error: errReceita } = await supabase
              .from('receita_bruta')
              .upsert(receitas, { onConflict: 'contrato_id,periodo' })

            if (errReceita) {
              adicionarLog(`Erro ao inserir receita: ${nomeCliente} — ${errReceita.message}`, 'erro')
              erros++
              continue
            }

            adicionarLog(`Importado: ${nomeCliente} (${periodoInicio} → ${periodoFim}, alíquota: ${(aliquota * 100).toFixed(2)}%)`, 'sucesso')
            importados++

          } catch (err) {
            adicionarLog(`Erro inesperado: ${nomeCliente} — ${err.message}`, 'erro')
            erros++
          }
        }

        adicionarLog(`─────────────────────────────`, 'info')
        adicionarLog(`Concluído: ${importados} importados, ${erros} erros`, importados > 0 ? 'sucesso' : 'erro')
        setConcluido(true)
        setLoading(false)
      },
      error: (err) => {
        adicionarLog(`Erro ao ler arquivo: ${err.message}`, 'erro')
        setLoading(false)
      }
    })
  }

  async function importarDRE(e) {
  const file = e.target.files[0]
  if (!file) return

  setLog([])
  setConcluido(false)
  setLoading(true)

  Papa.parse(file, {
    complete: async (result) => {
      const linhas = result.data

      const mapeamento = [
        { linha: 235, campo: 'gratificacoes', label: 'Gratificações', offsetCol: 2 },
        { linha: 236, campo: 'bonus_veiculacao', label: 'Bônus de Veiculação', offsetCol: 2 },
        { linha: 237, campo: 'comissao_vendedor', label: 'Comissão de Venda', offsetCol: 2 },
        { linha: 239, campo: 'outorga', label: 'Outorga', offsetCol: 2 },
      ]

      let importados = 0
      let erros = 0

      for (const { linha, campo, label, offsetCol } of mapeamento) {
        const row = linhas[linha]
        if (!row) {
          adicionarLog(`Linha não encontrada: ${label}`, 'erro')
          erros++
          continue
        }

        for (let i = 0; i < 15; i++) {
          const colIndex = offsetCol + i
          const valor = parseValor(row[colIndex])
          if (valor === 0) continue

          const periodo = PERIODOS[i]

          const { error } = await supabase
            .from('dre_periodos')
            .update({ [campo]: valor })
            .eq('periodo', periodo)

          if (error) {
            adicionarLog(`Erro ao salvar ${label} em ${periodo}: ${error.message}`, 'erro')
            erros++
          } else {
            adicionarLog(`${label} ${periodo}: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'sucesso')
            importados++
          }
        }
      }

      adicionarLog(`─────────────────────────────`, 'info')
      adicionarLog(`Concluído: ${importados} valores importados, ${erros} erros`, importados > 0 ? 'sucesso' : 'erro')
      setConcluido(true)
      setLoading(false)
    },
    error: (err) => {
      adicionarLog(`Erro ao ler arquivo: ${err.message}`, 'erro')
      setLoading(false)
    }
  })
}

  async function importarCustos(e) {
  const file = e.target.files[0]
  if (!file) return

  setLog([])
  setConcluido(false)
  setLoading(true)

  Papa.parse(file, {
    complete: async (result) => {
      const linhas = result.data

      const mapeamento = [
        { linha: 244, campo: 'custo_prestacao_mo', label: 'Prestação de Serviços + M.O. Equipe' },
        { linha: 245, campo: 'materiais_insumos', label: 'Materiais/Insumos M.O.' },
        { linha: 246, campo: 'prestacao_servicos', label: 'Prestação de Serviços' },
        { linha: 247, campo: 'comunicacao_visual', label: 'Comunicação Visual' },
        { linha: 248, campo: 'transporte', label: 'Transporte' },
        { linha: 249, campo: 'reembolso_despesas', label: 'Reembolso de Despesas' },
        { linha: 250, campo: 'subgrupo_extras', label: 'Sub-grupo / Extras' },
        { linha: 251, campo: 'servicos_publicos', label: 'Serviços Públicos (Elektro)' },
      ]

      let importados = 0
      let erros = 0

      for (const { linha, campo, label } of mapeamento) {
        const row = linhas[linha]
        if (!row) {
          adicionarLog(`Linha não encontrada: ${label}`, 'erro')
          erros++
          continue
        }

        for (let i = 0; i < 15; i++) {
          const valor = parseValor(row[2 + i])
          if (valor === 0) continue

          const periodo = PERIODOS[i]

          const { error } = await supabase
            .from('dre_periodos')
            .update({ [campo]: valor })
            .eq('periodo', periodo)

          if (error) {
            adicionarLog(`Erro ao salvar ${label} em ${periodo}: ${error.message}`, 'erro')
            erros++
          } else {
            adicionarLog(`${label} ${periodo}: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'sucesso')
            importados++
          }
        }
      }

      adicionarLog(`─────────────────────────────`, 'info')
      adicionarLog(`Concluído: ${importados} valores importados, ${erros} erros`, importados > 0 ? 'sucesso' : 'erro')
      setConcluido(true)
      setLoading(false)
    },
    error: (err) => {
      adicionarLog(`Erro ao ler arquivo: ${err.message}`, 'erro')
      setLoading(false)
    }
  })
}

async function importarFluxo(e) {
  const file = e.target.files[0]
  if (!file) return

  setLog([])
  setConcluido(false)
  setLoading(true)

  Papa.parse(file, {
    complete: async (result) => {
      const linhas = result.data

      const mapeamento = [
        { linha: 258, campo: 'abrigos_onibus', label: 'Abrigos de Ônibus' },
        { linha: 259, campo: 'relogio_eletronico', label: 'Relógio Eletrônico' },
        { linha: 260, campo: 'relogio_eletronico_bndes', label: 'Relógio Eletrônico - BNDES' },
        { linha: 261, campo: 'lixeira_ecologica', label: 'Lixeira Ecológica' },
        { linha: 262, campo: 'placas_rua', label: 'Placas de Rua' },
        { linha: 263, campo: 'bancos_publicos', label: 'Bancos Públicos' },
        { linha: 264, campo: 'totem_indicativo_amostra', label: 'Totem Indicativo - Amostra' },
        { linha: 265, campo: 'totem_indicativo_comercial', label: 'Totem Indicativo Comercial' },
        { linha: 266, campo: 'painel_led_full_color', label: 'Painel LED Full Color' },
        { linha: 267, campo: 'portico', label: 'Pórtico' },
      ]

      let importados = 0
      let erros = 0

      for (const { linha, campo, label } of mapeamento) {
        const row = linhas[linha]
        if (!row) {
          adicionarLog(`Linha não encontrada: ${label}`, 'erro')
          erros++
          continue
        }

        for (let i = 0; i < 15; i++) {
          const valor = parseValor(row[2 + i])
          if (valor === 0) continue

          const periodo = PERIODOS[i]

          const { error } = await supabase
            .from('fluxo_caixa_periodos')
            .update({ [campo]: valor })
            .eq('periodo', periodo)

          if (error) {
            adicionarLog(`Erro ao salvar ${label} em ${periodo}: ${error.message}`, 'erro')
            erros++
          } else {
            adicionarLog(`${label} ${periodo}: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'sucesso')
            importados++
          }
        }
      }

      adicionarLog(`─────────────────────────────`, 'info')
      adicionarLog(`Concluído: ${importados} valores importados, ${erros} erros`, importados > 0 ? 'sucesso' : 'erro')
      setConcluido(true)
      setLoading(false)
    },
    error: (err) => {
      adicionarLog(`Erro ao ler arquivo: ${err.message}`, 'erro')
      setLoading(false)
    }
  })
}

async function importarDespesas(e) {
  const file = e.target.files[0]
  if (!file) return

  setLog([])
  setConcluido(false)
  setLoading(true)

  Papa.parse(file, {
    complete: async (result) => {
      const linhas = result.data

      const INTERVALOS = [
        { inicio: 5,   fim: 25,  categoria: 'ITENS DE MOBILIÁRIO (AQUISIÇÃO)' },
        { inicio: 29,  fim: 332, categoria: 'MATERIAIS/INSUMOS/M.O. - INSTALAÇÃO MOBILIÁRIO' },
        { inicio: 337, fim: 339, categoria: 'PRESTAÇÃO DE SERVIÇOS' },
        { inicio: 343, fim: 400, categoria: 'COMUNICAÇÃO VISUAL' },
        { inicio: 406, fim: 414, categoria: 'TRANSPORTE' },
        { inicio: 419, fim: 434, categoria: 'REEMBOLSO DE DESPESAS' },
        { inicio: 439, fim: 499, categoria: 'SUB-GRUPO/EXTRAS' },
        { inicio: 506, fim: 531, categoria: 'BV/COMISSÕES/GRATIFICAÇÕES' },
        { inicio: 536, fim: 631, categoria: 'EQUIPE+COORDENAÇÃO' },
      ]

      function parseData(str) {
        if (!str || str.trim() === '') return null
        const s = str.trim()

        const match1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
        if (match1) {
          let ano = parseInt(match1[3])
          if (ano < 100) ano += 2000
          const mes = match1[2].padStart(2, '0')
          const dia = match1[1].padStart(2, '0')
          return `${ano}-${mes}-${dia}`
        }

        const MESES_PT = {
          'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
          'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
          'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
        }
        const match2 = s.match(/^([a-z]{3})\.-?(\d{2,4})$/i)
        if (match2) {
          const mes = MESES_PT[match2[1].toLowerCase()]
          let ano = parseInt(match2[2])
          if (ano < 100) ano += 2000
          if (mes) return `${ano}-${mes}-01`
        }

        if (s.match(/^ANO\s+\d+$/i)) return '2015-01-01'

        return null
      }

      let importados = 0
      let erros = 0
      let ignorados = 0

      for (const { inicio, fim, categoria } of INTERVALOS) {
        adicionarLog(`Importando: ${categoria}`, 'info')

        for (let i = inicio; i <= fim; i++) {
          const linha = linhas[i]
          if (!linha) continue

          const col0 = linha[0]?.trim() || ''
          const col1 = linha[1]?.trim() || ''
          const col2 = linha[2]?.trim() || ''
          const col3 = linha[3]?.trim() || ''
          const col4 = linha[4]?.trim() || ''

          if (!col0 || !col1) { ignorados++; continue }
          if (!col3) { ignorados++; continue }

          const data = parseData(col0)
          if (!data) { ignorados++; continue }

          const valorContratado = parseValor(col3)
          const valorRealizado = parseValor(col4)

          if (valorContratado === 0) { ignorados++; continue }

          const { error } = await supabase.from('itens_despesa').insert({
            categoria,
            data,
            nome_item: col1,
            fornecedor: col2 || null,
            valor_contratado: valorContratado,
            valor_realizado: valorRealizado,
          })

          if (error) {
            adicionarLog(`Erro: ${col1} — ${error.message}`, 'erro')
            erros++
          } else {
            adicionarLog(`✓ ${col0} | ${col1}`, 'sucesso')
            importados++
          }
        }
      }

      adicionarLog(`─────────────────────────────`, 'info')
      adicionarLog(`Concluído: ${importados} importados, ${ignorados} ignorados, ${erros} erros`, importados > 0 ? 'sucesso' : 'erro')
      setConcluido(true)
      setLoading(false)
    },
    error: (err) => {
      adicionarLog(`Erro ao ler arquivo: ${err.message}`, 'erro')
      setLoading(false)
    }
  })
}

async function importarEnergia(e) {
  const file = e.target.files[0]
  if (!file) return

  setLog([])
  setConcluido(false)
  setLoading(true)

  Papa.parse(file, {
    complete: async (result) => {
      const linhas = result.data
      const cabecalho = linhas[1] || []

      const temMedidor = cabecalho.includes('MEDIDOR')

      const idxTitular = 1
      const idxCodigo = 2
      const idxMedidor = temMedidor ? 3 : null
      const idxLocal = temMedidor ? 4 : 3
      const idxStatus = temMedidor ? 5 : 4
      const idxMeses = temMedidor ? 6 : 5
      const idxObs = temMedidor ? 18 : 17

      const anoMatch = cabecalho[idxMeses]?.match(/(\d{2})$/)
      const ano = anoMatch ? parseInt('20' + anoMatch[1]) : null

      if (!ano) {
        adicionarLog('Não foi possível detectar o ano do arquivo', 'erro')
        setLoading(false)
        return
      }

      adicionarLog(`Ano detectado: ${ano} | ${temMedidor ? 'Com coluna Medidor' : 'Sem coluna Medidor'}`, 'info')

      const dados = linhas.slice(2).filter(linha => {
        const titular = linha[idxTitular]?.trim()
        return titular && titular !== '' && titular !== 'TITULAR'
      })

      adicionarLog(`${dados.length} instalações encontradas`, 'info')

      let importados = 0
      let atualizados = 0
      let erros = 0

      for (const linha of dados) {
        const titular = linha[idxTitular]?.trim()
        const codigo = linha[idxCodigo]?.trim()
        const medidor = idxMedidor ? linha[idxMedidor]?.trim() || null : null
        const local = linha[idxLocal]?.trim()
        const status = linha[idxStatus]?.trim() === 'DESLIGADO' ? 'DESLIGADO' : 'LIGADO'
        const observacao = linha[idxObs]?.trim() || null

        if (!titular || !codigo) continue

        try {
          let instalacaoId = null
          const { data: existente } = await supabase
            .from('instalacoes')
            .select('id')
            .eq('codigo', codigo)
            .limit(1)

          if (existente && existente.length > 0) {
            instalacaoId = existente[0].id
            await supabase.from('instalacoes').update({
              status,
              observacao: observacao || null,
              ...(medidor && { medidor }),
            }).eq('id', instalacaoId)
            atualizados++
          } else {
            const { data: nova, error: errInst } = await supabase
              .from('instalacoes')
              .insert({ titular, codigo, medidor, local_instalacao: local, status, observacao })
              .select('id')
              .single()

            if (errInst) {
              adicionarLog(`Erro ao criar instalação ${codigo}: ${errInst.message}`, 'erro')
              erros++
              continue
            }
            instalacaoId = nova.id
            importados++
            adicionarLog(`✓ Criado: ${titular} | ${codigo}`, 'sucesso')
          }

          // Inserir valores mensais
          const contas = []
          for (let m = 0; m < 12; m++) {
            const celula = linha[idxMeses + m]?.trim() || ''
            if (celula === '' || celula.toUpperCase().includes('DESLIGADO')) continue
            const valor = parseValor(celula)
            if (valor > 0) {
              contas.push({ instalacao_id: instalacaoId, mes: m + 1, ano, valor })
            }
          }

          if (contas.length > 0) {
            await supabase.from('contas_energia')
              .upsert(contas, { onConflict: 'instalacao_id,mes,ano' })
          }

        } catch (err) {
          adicionarLog(`Erro inesperado: ${codigo} — ${err.message}`, 'erro')
          erros++
        }
      }

      adicionarLog(`─────────────────────────────`, 'info')
      adicionarLog(`Concluído: ${importados} criados, ${atualizados} atualizados, ${erros} erros`, 'sucesso')
      setConcluido(true)
      setLoading(false)
    },
    error: (err) => {
      adicionarLog(`Erro ao ler arquivo: ${err.message}`, 'erro')
      setLoading(false)
    }
  })
}

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Importar dados</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Importar receita do CSV</h2>
        <p className="text-xs text-gray-400 mb-4">
          Selecione o arquivo CSV exportado da planilha. O sistema vai importar as linhas 5 até 229 automaticamente.
        </p>

        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={processarCSV}
            disabled={loading}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className={`cursor-pointer inline-block bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Importando...' : 'Selecionar arquivo CSV'}
          </label>
          <p className="text-xs text-gray-400 mt-2">Apenas arquivos .csv</p>
        </div>
      </div>
    
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-sm font-medium text-gray-700 mb-2">Importar DRE — Comissões e Outorga</h2>
      <p className="text-xs text-gray-400 mb-4">
        Importa Gratificações, BV, Comissão de Venda e Outorga das linhas 236 a 240 do CSV.
      </p>
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
        <input
          type="file"
          accept=".csv"
          onChange={importarDRE}
          disabled={loading}
          className="hidden"
          id="dre-upload"
        />
        <label
          htmlFor="dre-upload"
          className={`cursor-pointer inline-block bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Importando...' : 'Selecionar arquivo CSV'}
        </label>
        <p className="text-xs text-gray-400 mt-2">Apenas arquivos .csv</p>
      </div>
    </div>

    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-sm font-medium text-gray-700 mb-2">Importar DRE — Custos Operacionais</h2>
      <p className="text-xs text-gray-400 mb-4">
        Importa Prestação de Serviços, Materiais, Comunicação Visual, Transporte, Reembolso, Sub-grupo e Serviços Públicos das linhas 245 a 252.
      </p>
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
        <input
          type="file"
          accept=".csv"
          onChange={importarCustos}
          disabled={loading}
          className="hidden"
          id="custos-upload"
        />
        <label
          htmlFor="custos-upload"
          className={`cursor-pointer inline-block bg-yellow-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Importando...' : 'Selecionar arquivo CSV'}
        </label>
        <p className="text-xs text-gray-400 mt-2">Apenas arquivos .csv</p>
      </div>
    </div>

    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-sm font-medium text-gray-700 mb-2">Importar Fluxo de Caixa — Aquisição Mobiliário</h2>
      <p className="text-xs text-gray-400 mb-4">
        Importa Abrigos, Relógios, Lixeiras, Placas, Bancos, Totens, Painel LED e Pórtico das linhas 259 a 268.
      </p>
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
        <input
          type="file"
          accept=".csv"
          onChange={importarFluxo}
          disabled={loading}
          className="hidden"
          id="fluxo-upload"
        />
        <label
          htmlFor="fluxo-upload"
          className={`cursor-pointer inline-block bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Importando...' : 'Selecionar arquivo CSV'}
        </label>
        <p className="text-xs text-gray-400 mt-2">Apenas arquivos .csv</p>
      </div>
    </div>

      {log.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Log de importação</h2>
            {concluido && <span className="text-xs text-green-600 font-medium">Concluído</span>}
          </div>
          <div className="p-4 space-y-1 max-h-96 overflow-y-auto">
            {log.map(item => (
              <p key={item.id} className={`text-xs ${
                item.tipo === 'sucesso' ? 'text-green-600' :
                item.tipo === 'erro' ? 'text-red-500' :
                item.tipo === 'aviso' ? 'text-yellow-600' :
                'text-gray-500'
              }`}>
                {item.tipo === 'sucesso' ? '✓' : item.tipo === 'erro' ? '✗' : item.tipo === 'aviso' ? '⚠' : '•'} {item.msg}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Importar Despesas</h2>
        <p className="text-xs text-gray-400 mb-4">
          Importa todas as categorias de despesas do CSV consolidado de despesas.
        </p>
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={importarDespesas}
            disabled={loading}
            className="hidden"
            id="despesas-upload"
          />
          <label
            htmlFor="despesas-upload"
            className={`cursor-pointer inline-block bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Importando...' : 'Selecionar arquivo CSV'}
          </label>
          <p className="text-xs text-gray-400 mt-2">Apenas arquivos .csv</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Importar Energia (Elektro)</h2>
        <p className="text-xs text-gray-400 mb-4">
          Importa instalações e valores mensais de cada aba anual. Pode importar um CSV por vez — instalações já existentes serão atualizadas automaticamente.
        </p>
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={importarEnergia}
            disabled={loading}
            className="hidden"
            id="energia-upload"
          />
          <label
            htmlFor="energia-upload"
            className={`cursor-pointer inline-block bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Importando...' : 'Selecionar arquivo CSV'}
          </label>
          <p className="text-xs text-gray-400 mt-2">Apenas arquivos .csv — importe um ano por vez</p>
        </div>
      </div>

    </div>
  )
}