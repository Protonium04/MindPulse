import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './context/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import ConnectAccounts from './pages/ConnectAccounts'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Analytics from './pages/Analytics'
import Connections from './pages/Connections'
import Layout from './components/common/Layout'

const PrivateRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* OAuth onboarding — needs auth but no sidebar layout */}
      <Route
        path="/connect-accounts"
        element={
          <PrivateRoute>
            <ConnectAccounts />
          </PrivateRoute>
        }
      />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index          element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"   element={<Dashboard />} />
        <Route path="chat"        element={<Chat />} />
        <Route path="analytics"   element={<Analytics />} />
        <Route path="connections" element={<Connections />} />
      </Route>
    </Routes>
  )
}
