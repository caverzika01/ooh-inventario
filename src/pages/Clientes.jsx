import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

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
                <span className="text-sm text-gray-800">{cliente.nome}</span>
                <button
                  onClick={() => deletarCliente(cliente.id)}
                  className="text-red-400 text-sm hover:text-red-600"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}