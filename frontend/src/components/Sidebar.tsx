import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  Workflow,
  DollarSign,
  Plug,
  UserCheck,
  FileSignature,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { useAppStore } from '../state/useAppStore'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Chat Simulator', href: '/chat', icon: MessageSquare },
  { name: 'Rules Studio', href: '/rules', icon: Workflow },
  { name: 'Offers Lab', href: '/offers', icon: DollarSign },
  { name: 'Connectors', href: '/connectors', icon: Plug },
  { name: 'Background', href: '/background', icon: UserCheck },
  { name: 'E-Signature', href: '/sign', icon: FileSignature },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <div className={`fixed inset-y-0 left-0 z-50 bg-white/90 backdrop-blur-md border-r border-slate-200/50 shadow-xl transition-all duration-300 ease-in-out ${
      sidebarOpen ? 'w-64' : 'w-16'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/50">
        <div className={`flex items-center space-x-3 transition-all duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
        }`}>
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-slate-900">LendWisely</h1>
            <p className="text-xs text-slate-500">Chatbot Dashboard</p>
          </div>
        </div>
        
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `sidebar-nav ${
                  isActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className={`transition-all duration-300 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
              }`}>
                {item.name}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className={`absolute bottom-6 left-0 right-0 px-3 transition-all duration-300 ${
        sidebarOpen ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-200/50">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-700">API Status</p>
              <p className="text-xs text-slate-500">Connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}