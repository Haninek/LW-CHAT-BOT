import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useAppStore } from './state/useAppStore'

// Simple Pages
import SimpleRules from './pages/SimpleRules'
import SimpleChat from './pages/SimpleChat'

function App() {
  const initialize = useAppStore(state => state.initialize)

  // Initialize app with seed data on startup
  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Simple Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">Easy Rules App</h1>
              <div className="flex gap-4">
                <Link 
                  to="/rules" 
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Rules
                </Link>
                <Link 
                  to="/test" 
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Test
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Navigate to="/rules" replace />} />
          <Route path="/rules" element={<SimpleRules />} />
          <Route path="/test" element={<SimpleChat />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App