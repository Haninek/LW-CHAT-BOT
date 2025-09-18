import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Menu, X, BarChart3, MessageSquare, Building2, Send, Link as LinkIcon, DollarSign, Search, FileText, Settings as SettingsIcon, Bell, User, FolderOpen, Shield } from 'lucide-react'
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
      <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out z-50 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">UW</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900">
                Underwriting Wizard
              </h1>
            </div>
            <button 
              className="lg:hidden p-1 rounded-md hover:bg-slate-100"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} className="mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              AI-Powered Lending Platform
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
          <button className="p-2 rounded-lg hover:bg-slate-100">
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
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  )
}

export default App