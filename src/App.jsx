import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AppRoutes from './AppRoutes'
import Login from './pages/Login'

function App() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [role, setRole] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session)
      setRole(session?.user?.user_metadata?.role || 'publico')
      setCarregando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session)
      setRole(session?.user?.user_metadata?.role || 'publico')
    })

    return () => subscription.unsubscribe()
  }, [])

  if (carregando) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f3f4f6' }}>
      <p className="text-sm text-gray-400">Carregando...</p>
    </div>
  )

  return sessao ? <AppRoutes role={role} /> : <Login />
}

export default App