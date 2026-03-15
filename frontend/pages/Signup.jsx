import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuth } from '../contexts/AuthContext'

const Signup = () => {
  const navigate = useNavigate()
  const { signup } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const signupData = await signup({ email: email.trim(), password })

      if (signupData?.session?.access_token) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', {
          replace: true,
          state: {
            message: 'Signup complete. You can log in now.',
          },
        })
      }
    } catch (requestError) {
      if (requestError instanceof AxiosError) {
        setError(requestError.response?.data?.message || 'Unable to sign up.')
      } else {
        setError('Unable to sign up.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-card">
      <h1 className="auth-title">Welcome</h1>
      <p className="auth-subtitle">Create your account.</p>

      {error ? <div className="error-box">{error}</div> : null}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="signup-email">Email Address</label>
          <input
            id="signup-email"
            className="input-field"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            className="input-field"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-confirm-password">Confirm Password</label>
          <input
            id="signup-confirm-password"
            className="input-field"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
            minLength={6}
            required
          />
        </div>

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account?{' '}
        <Link className="auth-link" to="/login">
          Log In
        </Link>
      </p>
    </section>
  )
}

export default Signup