import React from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChatBubble } from '@coreui/icons'

import InstantMessagingPanel from '../../src/components/InstantMessagingPanel'
import Login from '../../src/views/pages/login/Login'
import Register from '../../src/views/pages/register/Register'
import RequireAuth from '../../src/components/RequireAuth'
import { useAuth } from '../../src/context/AuthContext'

const ChatPage = () => {
  const { user, logout } = useAuth()

  return (
    <div className="chat-shell">
      <header className="chat-shell__header">
        <div>
          <span className="chat-shell__title">
            <CIcon icon={cilChatBubble} className="me-2" />
            Chat MediPrint
          </span>
          <div className="chat-shell__user">
            {user?.username || user?.email || 'Utente'}
          </div>
        </div>
        <CButton color="outline-secondary" size="sm" onClick={logout}>
          Logout
        </CButton>
      </header>
      <div className="chat-shell__body">
        <InstantMessagingPanel />
      </div>
    </div>
  )
}

const App = () => (
  <HashRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />
      <Route
        path="/chat"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="*"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />
    </Routes>
  </HashRouter>
)

export default App
