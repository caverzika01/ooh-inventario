import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(null)
  const [nomeEdit, setNomeEdit] = useState('')

  useEffect(() => {
    buscarClientes()
  }, [])

  async function buscarClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
  }

  async function adicionarCliente() {
    if (!nome.trim()) return setErro('Digite o nome do cliente')
    setLoading(true)
    setErro('')
    const { error } = await supabase.from('clientes').insert({ nome: nome.trim() })
    if (error) {
      setErro('Erro ao salvar: ' + error.message)
    } else {
      setNome('')
      buscarClientes()
    }
    setLoading(false)
  }

  async function salvarEdicao(id) {
    if (!nomeEdit.trim()) return
    await supabase.from('clientes').update({ nome: nomeEdit.trim() }).eq('id', id)
    setEditando(null)
    buscarClientes()
  }

  async function deletarCliente(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    buscarClientes()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Clientes</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Novo cliente</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Nome do cliente"
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionarCliente()}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={adicionarCliente}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
        {erro && <p className="text-red-500 text-sm mt-2">{erro}</p>}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {clientes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum cliente cadastrado ainda</p>
        ) : (
          <ul>
            {clientes.map((cliente, i) => (
              <li
                key={cliente.id}
                className={`flex items-center justify-between px-6 py-4 ${i !== clientes.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {editando === cliente.id ? (
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="text"
                      value={nomeEdit}
                      onChange={e => setNomeEdit(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && salvarEdicao(cliente.id)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                      autoFocus
                    />
                    <button
                      onClick={() => salvarEdicao(cliente.id)}
                      className="text-blue-600 text-sm font-medium hover:text-blue-800"
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
                ) : (
                  <>
                    <span className="text-sm text-gray-800">{cliente.nome}</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => { setEditando(cliente.id); setNomeEdit(cliente.nome) }}
                        className="text-blue-400 text-sm hover:text-blue-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deletarCliente(cliente.id)}
                        className="text-red-400 text-sm hover:text-red-600"
                      >
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}