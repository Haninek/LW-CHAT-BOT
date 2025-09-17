import React from 'react'
import { Bell, Search, User } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'

export function TopBar() {
  const currentClient = useAppStore(state => state.currentClient)
  
  return (
    <div className="h-16 bg-white/60 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="input-field pl-10 pr-4 py-2 w-full"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Current Client */}
        <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-white/80 rounded-lg border border-slate-200/50">
          <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {currentClient.firstName[0]}
            </span>
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-900">{currentClient.firstName}</p>
            <p className="text-slate-500 text-xs">{currentClient.company}</p>
          </div>
          <div className={`w-2 h-2 rounded-full ${
            currentClient.status === 'new' ? 'bg-warning-400' : 'bg-success-400'
          }`}></div>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent-500 rounded-full"></span>
        </button>

        {/* User Menu */}
        <button className="flex items-center space-x-2 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <User className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}