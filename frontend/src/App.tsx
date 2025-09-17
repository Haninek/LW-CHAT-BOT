import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './state/useAppStore'

// Pages for Rules + Intake Simulator
import RulesStudio from './pages/RulesStudio'
import IntakeSimulator from './pages/IntakeSimulator'

function App() {
  const initialize = useAppStore(state => state.initialize)

  // Initialize app with seed data on startup
  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/rules" replace />} />
            <Route path="/rules" element={<RulesStudio />} />
            <Route path="/simulate" element={<IntakeSimulator />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App