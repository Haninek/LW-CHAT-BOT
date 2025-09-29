import OffersLabClean from '@/pages/OffersLabClean'
import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Menu, X, BarChart3, MessageSquare, Building2, Send, Link as LinkIcon, DollarSign, Search, FileText, Settings as SettingsIcon, Bell, User, FolderOpen, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
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
import Campaigns from './pages/Campaigns'
import DealsList from './pages/DealsList'
import DealDetail from './pages/DealDetail'
import AdminBackgroundReview from './pages/AdminBackgroundReview'


// Sidebar Component
function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation()
  
  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: BarChart3 },
    { path: '/chat', name: 'Chat', icon: MessageSquare },
    { path: '/merchants', name: 'Merchants', icon: Building2 },
    { path: '/deals', name: 'Deals', icon: FolderOpen },
    { path: '/campaigns', name: 'Campaigns', icon: Send },
    { path: '/connectors', name: 'Connectors', icon: LinkIcon },
    { path: '/offers', name: 'Offers Lab', icon: DollarSign },
    { path: '/background', name: 'Background', icon: Search },
    { path: '/sign', name: 'Sign', icon: FileText },
    { path: '/admin/background', name: 'Admin Review', icon: Shield },
    { path: '/settings', name: 'Settings', icon: SettingsIcon }
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white/60 backdrop-blur-2xl border-r border-white/20 transform transition-all duration-300 ease-out z-50 lg:translate-x-0 shadow-2xl ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full relative">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/30 via-white/10 to-cyan-50/30 pointer-events-none"></div>
          
          {/* Logo */}
          <div className="relative z-10 flex items-center justify-between px-6 py-6 border-b border-white/20">
            <div className="flex items-center space-x-3">
              <motion.div 
                className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center shadow-lg animate-pulse-glow"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="text-white font-bold text-lg">UW</span>
              </motion.div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Underwriting Wizard
                </h1>
                <p className="text-xs text-slate-500 font-medium">AI-Powered Platform</p>
              </div>
            </div>
            <button 
              className="lg:hidden p-2 rounded-xl hover:bg-white/40 transition-colors duration-200"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="relative z-10 flex-1 px-4 py-6 space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`group flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden ${
                      isActive
                        ? 'bg-white/80 text-slate-900 shadow-lg backdrop-blur-xl border border-white/40'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/40 hover:backdrop-blur-xl'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className={`relative z-10 w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : ''}`}
                    >
                      <Icon size={20} />
                    </motion.div>
                    <span className="relative z-10">{item.name}</span>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      />
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="relative z-10 p-6 border-t border-white/20">
            <div className="text-xs text-slate-500 font-medium text-center">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>AI-Powered Lending Platform</span>
              </div>
              <div className="text-slate-400">v2.0.1 • Premium Edition</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Top Bar Component
function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="bg-white border-b border-slate-200 lg:ml-64">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button 
            className="lg:hidden p-2 rounded-md hover:bg-slate-100"
            onClick={onMenuClick}
          >
            <Menu size={20} />
          </button>
          
          {/* Search bar - hidden on small screens */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search merchants, campaigns..." 
                className="pl-9 pr-4 py-2 w-80 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="p-2 rounded-lg hover:bg-slate-100 relative">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">2</span>
          </button>
          <button 
            className="p-2 rounded-lg hover:bg-slate-100"
            onClick={() => {
              // Simple user profile demo - could be expanded to full login system
              alert('User Profile\n\n• Authentication: Bearer dev\n• Tenant: default-tenant\n• Status: Authenticated\n\n(Click OK to continue)')
            }}
            title="User Profile"
          >
            <User size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}

function App() {
  const initialize = useAppStore(state => state.initialize)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Initialize app with seed data on startup
  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Main content */}
        <main className="lg:ml-64 min-h-screen">
          <div className="px-6 py-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/rules" element={<Navigate to="/dashboard" replace />} />
              <Route path="/test" element={<Navigate to="/chat" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/merchants" element={<Merchants />} />
              <Route path="/deals" element={<DealsList />} />
              <Route path="/deals/:dealId" element={<DealDetail />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/connectors" element={<Connectors />} />
              <Route path="/offers" element={<OffersLab />} />
              <Route path="/background" element={<Background />} />
              <Route path="/sign" element={<Sign />} />
              <Route path="/admin/background" element={<AdminBackgroundReview />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/offers-lab-clean" element={<OffersLabClean />} />
</Routes>
          </div>
        </main>
      </div>
    </Router>
  )
}

export default App