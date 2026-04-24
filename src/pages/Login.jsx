import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar() {
    if (!email.trim()) return setErro('Digite o email')
    if (!senha.trim()) return setErro('Digite a senha')

    setLoading(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (error) setErro('Email ou senha incorretos')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-800 mb-1">OOH Inventário</h1>
        <p className="text-sm text-gray-400 mb-6">Faça login para continuar</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {erro && <p className="text-red-500 text-sm">{erro}</p>}

          <button
            onClick={entrar}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}