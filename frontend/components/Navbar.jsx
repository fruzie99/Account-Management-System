import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/send-money', label: 'Send Money' },
  { to: '/statement', label: 'Account Statement' },
]

const Navbar = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const email = user?.email || 'user@email.com'

  const handleProfileClick = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="top-nav-wrap">
      <nav className="top-nav" aria-label="Main navigation">
        <span className="top-nav-logo" aria-hidden="true">
          ●
        </span>

        <div className="top-nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'top-nav-link active' : 'top-nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <button
          className="top-nav-user top-nav-user-button"
          type="button"
          onClick={handleProfileClick}
          title="Logout"
        >
          {email}
        </button>
      </nav>
    </header>
  )
}

export default Navbar