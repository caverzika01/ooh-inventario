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
import Importar from './pages/Importar'

function Layout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #c3eeb8, #ffffff)' }}>
      <nav className="px-6 py-4 shadow-sm" style={{ background: '#ffffff' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <svg width="80" height="36" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
              <text x="4" y="18" fontFamily="Arial" fontSize="13" letterSpacing="4" fill="#a8c037" fontWeight="300">AGÊNCIA</text>
              <g fill="#a8c037">
                <path d="M4 25 Q4 65 24 65 Q44 65 44 45 Q44 65 64 65 Q84 65 84 25" stroke="#a8c037" strokeWidth="10" strokeLinecap="round" fill="none"/>
                <path d="M100 25 Q100 65 100 65" stroke="#a8c037" strokeWidth="10" strokeLinecap="round" fill="none"/>
                <path d="M100 25 L155 25" stroke="#a8c037" strokeWidth="10" strokeLinecap="round" fill="none"/>
                <path d="M100 45 L145 45" stroke="#a8c037" strokeWidth="10" strokeLinecap="round" fill="none"/>
                <path d="M100 65 L155 65" stroke="#a8c037" strokeWidth="10" strokeLinecap="round" fill="none"/>
              </g>
            </svg>
            <span className="font-semibold" style={{ color: '#6b7280' }}>|</span>
            <NavLink to="/" className={({ isActive }) => isActive ? 'text-sm font-medium' : 'text-sm hover:opacity-70'} style={({ isActive }) => ({ color: isActive ? '#a8c037' : '#6b7280' })}>Dashboard</NavLink>
            <NavLink to="/clientes" className={({ isActive }) => isActive ? 'text-sm font-medium' : 'text-sm hover:opacity-70'} style={({ isActive }) => ({ color: isActive ? '#a8c037' : '#6b7280' })}>Clientes</NavLink>
            <NavLink to="/contratos" className={({ isActive }) => isActive ? 'text-sm font-medium' : 'text-sm hover:opacity-70'} style={({ isActive }) => ({ color: isActive ? '#a8c037' : '#6b7280' })}>Contratos</NavLink>
            <NavLink to="/receita" className={({ isActive }) => isActive ? 'text-sm font-medium' : 'text-sm hover:opacity-70'} style={({ isActive }) => ({ color: isActive ? '#a8c037' : '#6b7280' })}>Receita</NavLink>
            <NavLink to="/dre" className={({ isActive }) => isActive ? 'text-sm font-medium' : 'text-sm hover:opacity-70'} style={({ isActive }) => ({ color: isActive ? '#a8c037' : '#6b7280' })}>DRE</NavLink>
            <NavLink to="/fluxo-caixa" className={({ isActive }) => isActive ? 'text-sm font-medium' : 'text-sm hover:opacity-70'} style={({ isActive }) => ({ color: isActive ? '#a8c037' : '#6b7280' })}>Fluxo de Caixa</NavLink>
            <NavLink to="/despesas" className={({ isActive }) => isActive ? 'text-sm font-medium' : 'text-sm hover:opacity-70'} style={({ isActive }) => ({ color: isActive ? '#a8c037' : '#6b7280' })}>Despesas</NavLink>
            <NavLink to="/energia" className={({ isActive }) => isActive ? 'text-sm font-medium' : 'text-sm hover:opacity-70'} style={({ isActive }) => ({ color: isActive ? '#a8c037' : '#6b7280' })}>Energia</NavLink>
            <NavLink to="/importar" className={({ isActive }) => isActive ? 'text-sm font-medium' : 'text-sm hover:opacity-70'} style={({ isActive }) => ({ color: isActive ? '#a8c037' : '#6b7280' })}>Importar</NavLink>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm hover:opacity-70"
            style={{ color: '#6b7280' }}
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
              <Route path="/importar" element={<Importar />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}