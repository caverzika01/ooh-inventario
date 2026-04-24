import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AppRoutes from './AppRoutes'
import Login from './pages/Login'

function App() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session)
      setCarregando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (carregando) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-sm text-gray-400">Carregando...</p>
    </div>
  )

  return sessao ? <AppRoutes /> : <Login />
}

export default App