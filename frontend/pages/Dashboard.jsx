import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Dashboard = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <section className="dashboard-card">
      <h1>Welcome</h1>
      <p>You are logged in.</p>

      <div className="dashboard-meta">Signed in as: {user?.email}</div>

      <button className="auth-button" onClick={handleLogout} type="button">
        Log Out
      </button>
    </section>
  )
}

export default Dashboard