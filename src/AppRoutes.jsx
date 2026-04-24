import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Clientes from './pages/Clientes'
import Contratos from './pages/Contratos'
import Receita from './pages/Receita'
import DRE from './pages/DRE'
import Dashboard from './pages/Dashboard'
import FluxoCaixa from './pages/FluxoCaixa'
import Despesas from './pages/Despesas'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="font-semibold text-gray-800">OOH Inventário</span>
          <NavLink to="/" className={({ isActive }) => isActive ? 'text-blue-600 font-medium text-sm' : 'text-gray-500 text-sm hover:text-gray-800'}>Dashboard</NavLink>
          <NavLink to="/clientes" className={({ isActive }) => isActive ? 'text-blue-600 font-medium text-sm' : 'text-gray-500 text-sm hover:text-gray-800'}>Clientes</NavLink>
          <NavLink to="/contratos" className={({ isActive }) => isActive ? 'text-blue-600 font-medium text-sm' : 'text-gray-500 text-sm hover:text-gray-800'}>Contratos</NavLink>
          <NavLink to="/receita" className={({ isActive }) => isActive ? 'text-blue-600 font-medium text-sm' : 'text-gray-500 text-sm hover:text-gray-800'}>Receita</NavLink>
          <NavLink to="/dre" className={({ isActive }) => isActive ? 'text-blue-600 font-medium text-sm' : 'text-gray-500 text-sm hover:text-gray-800'}>DRE</NavLink>
          <NavLink to="/fluxo-caixa" className={({ isActive }) => isActive ? 'text-blue-600 font-medium text-sm' : 'text-gray-500 text-sm hover:text-gray-800'}>Fluxo de Caixa</NavLink>
          <NavLink to="/despesas" className={({ isActive }) => isActive ? 'text-blue-600 font-medium text-sm' : 'text-gray-500 text-sm hover:text-gray-800'}>Despesas</NavLink>
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
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}