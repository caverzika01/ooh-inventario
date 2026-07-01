import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function formatarCNPJ(valor) {
  const nums = valor.replace(/\D/g, '').slice(0, 14)
  return nums
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function Clientes({ readOnly = false }) {
  const [clientes, setClientes] = useState([])
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [endereco, setEndereco] = useState('')
  const [loading, setLoading] = useState(false)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(null)
  const [formEdit, setFormEdit] = useState({})
  const [buscandoCnpjEdit, setBuscandoCnpjEdit] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => {
    buscarClientes()
  }, [])

  async function buscarClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
  }

  async function buscarDadosCNPJ(cnpjValor, modo = 'novo') {
    const numeros = cnpjValor.replace(/\D/g, '')
    if (numeros.length !== 14) {
      setErro('CNPJ deve ter 14 dígitos')
      return
    }

    if (modo === 'novo') setBuscandoCnpj(true)
    else setBuscandoCnpjEdit(true)
    setErro('')

    try {
      const resp = await fetch(`https://api.opencnpj.org/${numeros}`)
      if (!resp.ok) throw new Error('CNPJ não encontrado')
      const data = await resp.json()

      const enderecoCompleto = [
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
        data.municipio,
        data.uf,
        data.cep
      ].filter(Boolean).join(', ')

      if (modo === 'novo') {
        setRazaoSocial(data.razao_social || '')
        setNomeFantasia(data.nome_fantasia || '')
        setEndereco(enderecoCompleto)
        if (!nome.trim()) setNome(data.nome_fantasia || data.razao_social || '')
      } else {
        setFormEdit(prev => ({
          ...prev,
          razao_social: data.razao_social || '',
          nome_fantasia: data.nome_fantasia || '',
          endereco: enderecoCompleto
        }))
      }
    } catch (err) {
      setErro('CNPJ não encontrado ou inválido')
    }

    if (modo === 'novo') setBuscandoCnpj(false)
    else setBuscandoCnpjEdit(false)
  }

  async function adicionarCliente() {
    if (!nome.trim()) return setErro('Digite o nome do cliente')
    setLoading(true)
    setErro('')
    const { error } = await supabase.from('clientes').insert({
      nome: nome.trim(),
      cnpj: cnpj.trim() || null,
      razao_social: razaoSocial.trim() || null,
      nome_fantasia: nomeFantasia.trim() || null,
      endereco: endereco.trim() || null,
    })
    if (error) {
      setErro('Erro ao salvar: ' + error.message)
    } else {
      setNome('')
      setCnpj('')
      setRazaoSocial('')
      setNomeFantasia('')
      setEndereco('')
      setMostrarForm(false)
      buscarClientes()
    }
    setLoading(false)
  }

  function iniciarEdicao(cliente) {
    setEditando(cliente.id)
    setFormEdit({
      nome: cliente.nome,
      cnpj: cliente.cnpj || '',
      razao_social: cliente.razao_social || '',
      nome_fantasia: cliente.nome_fantasia || '',
      endereco: cliente.endereco || '',
    })
  }

  async function salvarEdicao(id) {
    if (!formEdit.nome?.trim()) return
    await supabase.from('clientes').update({
      nome: formEdit.nome.trim(),
      cnpj: formEdit.cnpj?.trim() || null,
      razao_social: formEdit.razao_social?.trim() || null,
      nome_fantasia: formEdit.nome_fantasia?.trim() || null,
      endereco: formEdit.endereco?.trim() || null,
    }).eq('id', id)
    setEditando(null)
    buscarClientes()
  }

  async function deletarCliente(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    buscarClientes()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Clientes</h1>
        {!readOnly && (
          <button
            onClick={() => { setMostrarForm(!mostrarForm); setErro('') }}
            className="text-white px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#a8c037' }}
          >
            {mostrarForm ? 'Cancelar' : '+ Novo cliente'}
          </button>
        )}
      </div>

      {mostrarForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Novo cliente</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">CNPJ</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={e => setCnpj(formatarCNPJ(e.target.value))}
                  maxLength={18}
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={() => buscarDadosCNPJ(cnpj, 'novo')}
                  disabled={buscandoCnpj || cnpj.replace(/\D/g, '').length !== 14}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                  style={{ background: '#a8c037' }}
                >
                  {buscandoCnpj ? 'Buscando...' : 'Buscar CNPJ'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Busca automática na base pública da Receita Federal</p>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nome do cliente (identificação no sistema)</label>
              <input
                type="text"
                placeholder="Nome do cliente"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Razão Social</label>
                <input
                  type="text"
                  placeholder="Nome Empresarial"
                  value={razaoSocial}
                  onChange={e => setRazaoSocial(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome Fantasia</label>
                <input
                  type="text"
                  placeholder="Título do Estabelecimento"
                  value={nomeFantasia}
                  onChange={e => setNomeFantasia(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Endereço completo</label>
              <input
                type="text"
                placeholder="Rua, número, bairro, cidade, UF, CEP"
                value={endereco}
                onChange={e => setEndereco(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>

          {erro && <p className="text-red-500 text-sm mt-3">{erro}</p>}

          <button
            onClick={adicionarCliente}
            disabled={loading}
            className="mt-4 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: '#a8c037' }}
          >
            {loading ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        {clientes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum cliente cadastrado ainda</p>
        ) : (
          <ul>
            {clientes.map((cliente, i) => (
              <li
                key={cliente.id}
                className={`px-6 py-4 ${i !== clientes.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {editando === cliente.id && !readOnly ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">CNPJ</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formEdit.cnpj}
                          onChange={e => setFormEdit({ ...formEdit, cnpj: formatarCNPJ(e.target.value) })}
                          maxLength={18}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                        />
                        <button
                          onClick={() => buscarDadosCNPJ(formEdit.cnpj, 'edit')}
                          disabled={buscandoCnpjEdit}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                          style={{ background: '#a8c037' }}
                        >
                          {buscandoCnpjEdit ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nome do cliente</label>
                      <input
                        type="text"
                        value={formEdit.nome}
                        onChange={e => setFormEdit({ ...formEdit, nome: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Razão Social</label>
                        <input
                          type="text"
                          value={formEdit.razao_social}
                          onChange={e => setFormEdit({ ...formEdit, razao_social: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Nome Fantasia</label>
                        <input
                          type="text"
                          value={formEdit.nome_fantasia}
                          onChange={e => setFormEdit({ ...formEdit, nome_fantasia: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Endereço completo</label>
                      <input
                        type="text"
                        value={formEdit.endereco}
                        onChange={e => setFormEdit({ ...formEdit, endereco: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => salvarEdicao(cliente.id)}
                        className="text-white px-4 py-1.5 rounded-lg text-sm font-medium"
                        style={{ background: '#a8c037' }}
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
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{cliente.nome}</p>
                      {(cliente.cnpj || cliente.razao_social) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {cliente.cnpj && `CNPJ: ${cliente.cnpj}`}
                          {cliente.razao_social && ` · ${cliente.razao_social}`}
                        </p>
                      )}
                      {cliente.nome_fantasia && (
                        <p className="text-xs text-gray-400">Fantasia: {cliente.nome_fantasia}</p>
                      )}
                      {cliente.endereco && (
                        <p className="text-xs text-gray-400">{cliente.endereco}</p>
                      )}
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <button onClick={() => iniciarEdicao(cliente)} className="text-xs hover:opacity-70" style={{ color: '#a8c037' }}>Editar</button>
                        <button onClick={() => deletarCliente(cliente.id)} className="text-red-400 text-xs hover:text-red-600">Excluir</button>
                      </div>
                    )}
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