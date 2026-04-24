import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Clientes from './pages/Clientes'
import Contratos from './pages/Contratos'
import Receita from './pages/Receita'
import DRE from './pages/DRE'
import Dashboard from './pages/Dashboard'
import FluxoCaixa from './pages/FluxoCaixa'
import Despesas from './pages/Despesas'
import { supabase } from './lib/supabase'
import Energia from './pages/Energia'

function Layout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #4c1d95, #ffffff)' }}>
      <nav className="px-6 py-4" style={{ background: '#000000' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-semibold text-white">OOH Inventário</span>
            <NavLink to="/" className={({ isActive }) => isActive ? 'text-white font-medium text-sm' : 'text-purple-300 text-sm hover:text-white'}>Dashboard</NavLink>
            <NavLink to="/clientes" className={({ isActive }) => isActive ? 'text-white font-medium text-sm' : 'text-purple-300 text-sm hover:text-white'}>Clientes</NavLink>
            <NavLink to="/contratos" className={({ isActive }) => isActive ? 'text-white font-medium text-sm' : 'text-purple-300 text-sm hover:text-white'}>Contratos</NavLink>
            <NavLink to="/receita" className={({ isActive }) => isActive ? 'text-white font-medium text-sm' : 'text-purple-300 text-sm hover:text-white'}>Receita</NavLink>
            <NavLink to="/dre" className={({ isActive }) => isActive ? 'text-white font-medium text-sm' : 'text-purple-300 text-sm hover:text-white'}>DRE</NavLink>
            <NavLink to="/fluxo-caixa" className={({ isActive }) => isActive ? 'text-white font-medium text-sm' : 'text-purple-300 text-sm hover:text-white'}>Fluxo de Caixa</NavLink>
            <NavLink to="/despesas" className={({ isActive }) => isActive ? 'text-white font-medium text-sm' : 'text-purple-300 text-sm hover:text-white'}>Despesas</NavLink>
            <NavLink to="/energia" className={({ isActive }) => isActive ? 'text-white font-medium text-sm' : 'text-purple-300 text-sm hover:text-white'}>Energia</NavLink>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-purple-300 text-sm hover:text-white"
          >
            Sair
          </button>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/receita" element={<Receita />} />
              <Route path="/dre" element={<DRE />} />
              <Route path="/fluxo-caixa" element={<FluxoCaixa />} />
              <Route path="/despesas" element={<Despesas />} />
              <Route path="/energia" element={<Energia />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}