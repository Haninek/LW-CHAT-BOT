import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useAppStore } from './state/useAppStore'

// Underwriting Wizard Pages
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Merchants from './pages/Merchants'
import Connectors from './pages/Connectors'
import OffersLab from './pages/OffersLab'
import Background from './pages/Background'
import Sign from './pages/Sign'
import Settings from './pages/Settings'

function Navigation() {
  const location = useLocation()
  
  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: '📊' },
    { path: '/chat', name: 'Chat', icon: '💬' },
    { path: '/merchants', name: 'Merchants', icon: '🏢' },
    { path: '/connectors', name: 'Connectors', icon: '🔗' },
    { path: '/offers', name: 'Offers Lab', icon: '💰' },
    { path: '/background', name: 'Background', icon: '🔍' },
    { path: '/sign', name: 'Sign', icon: '📝' },
    { path: '/settings', name: 'Settings', icon: '⚙️' }
  ]

  return (
    <nav className="bg-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-blue-400">
              Underwriting Wizard
            </h1>
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-300">
            Multi-tenant Automated Underwriting Platform
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  const initialize = useAppStore(state => state.initialize)

  // Initialize app with seed data on startup
  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/rules" element={<Navigate to="/dashboard" replace />} />
            <Route path="/test" element={<Navigate to="/chat" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/merchants" element={<Merchants />} />
            <Route path="/connectors" element={<Connectors />} />
            <Route path="/offers" element={<OffersLab />} />
            <Route path="/background" element={<Background />} />
            <Route path="/sign" element={<Sign />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App