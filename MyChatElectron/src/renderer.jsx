import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import { AuthProvider } from '../../src/context/AuthContext'

import '../../src/scss/style.scss'
import '../../src/scss/examples.scss'
import './global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
