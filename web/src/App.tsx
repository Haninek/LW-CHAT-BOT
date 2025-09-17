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
    <nav className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">UW</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Underwriting Wizard
              </h1>
            </div>
            <div className="flex space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out ${
                    location.pathname === item.path
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-105'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-white/60 hover:shadow-md hover:scale-[1.02] active:scale-95'
                  }`}
                >
                  <span className="mr-2 text-base group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            AI-Powered Lending Platform
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 relative">
        {/* Background decoration */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full opacity-10 blur-3xl"></div>
        </div>
        
        <Navigation />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
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