import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuth } from '../contexts/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const signupMessage = location.state?.message || ''

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login({ email: email.trim(), password })
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      if (requestError instanceof AxiosError) {
        setError(requestError.response?.data?.message || 'Unable to login.')
      } else {
        setError('Unable to login.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-card">
      <h1 className="auth-title">Welcome</h1>
      <p className="auth-subtitle">Sign in to continue.</p>

      {signupMessage ? <div className="message">{signupMessage}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            className="input-field"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="input-field"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link className="auth-link" to="/signup">
          Sign Up Now
        </Link>
      </p>
    </section>
  )
}

export default Login