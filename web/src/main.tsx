import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { bootstrapChadSeeds } from './seeds_chad'

// Initialize Chad seeds once
bootstrapChadSeeds()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)