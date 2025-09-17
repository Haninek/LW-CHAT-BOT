import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { useAppStore } from './state/useAppStore'

// Pages
import Dashboard from './pages/Dashboard'
import ChatSimulator from './pages/ChatSimulator'
import RulesStudio from './pages/RulesStudio'
import OffersLab from './pages/OffersLab'
import ConnectorsAdmin from './pages/ConnectorsAdmin'
import BackgroundMonitor from './pages/BackgroundMonitor'
import SignStudio from './pages/SignStudio'
import Settings from './pages/Settings'

function App() {
  const sidebarOpen = useAppStore(state => state.sidebarOpen)

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
            {/* Top Bar */}
            <TopBar />
            
            {/* Page Content */}
            <main className="p-6">
              <div className="max-w-7xl mx-auto">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/chat" element={<ChatSimulator />} />
                  <Route path="/rules" element={<RulesStudio />} />
                  <Route path="/offers" element={<OffersLab />} />
                  <Route path="/connectors" element={<ConnectorsAdmin />} />
                  <Route path="/background" element={<BackgroundMonitor />} />
                  <Route path="/sign" element={<SignStudio />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </div>
    </Router>
  )
}

export default App