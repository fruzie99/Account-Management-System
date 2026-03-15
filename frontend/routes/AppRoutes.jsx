import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import Dashboard from '../pages/Dashboard'
import Login from '../pages/Login'
import RequestMoney from '../pages/RequestMoney'
import SendMoney from '../pages/SendMoney'
import Signup from '../pages/Signup'
import Statement from '../pages/Statement'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/send-money"
        element={
          <ProtectedRoute>
            <SendMoney />
          </ProtectedRoute>
        }
      />
      <Route
        path="/request-money"
        element={
          <ProtectedRoute>
            <RequestMoney />
          </ProtectedRoute>
        }
      />
      <Route
        path="/statement"
        element={
          <ProtectedRoute>
            <Statement />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default AppRoutes