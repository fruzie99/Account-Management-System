import { AxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardRequest, depositMoneyRequest } from '../services/api'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)

const formatTimeAgo = (isoDate) => {
  if (!isoDate) {
    return 'Just now'
  }

  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [dashboardData, setDashboardData] = useState({
    account: null,
    balance: 0,
    recentActivity: [],
    refreshedAt: null,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [depositOpen, setDepositOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositError, setDepositError] = useState('')
  const [depositSuccess, setDepositSuccess] = useState('')

  const openDeposit = () => {
    setDepositAmount('')
    setDepositError('')
    setDepositSuccess('')
    setDepositOpen(true)
  }

  const closeDeposit = () => {
    if (depositLoading) return
    setDepositOpen(false)
  }

  const handleDeposit = async (e) => {
    e.preventDefault()
    const amount = Number(depositAmount)
    if (!depositAmount || Number.isNaN(amount) || amount <= 0) {
      setDepositError('Enter a valid amount greater than 0.')
      return
    }
    setDepositError('')
    setDepositLoading(true)
    try {
      const data = await depositMoneyRequest({ amount })
      setDepositSuccess(`Added ${formatCurrency(data.deposit.amount)} to your account!`)
      setDashboardData((prev) => ({ ...prev, balance: data.deposit.newBalance }))
      setDepositAmount('')
    } catch (err) {
      setDepositError(err?.response?.data?.message || 'Deposit failed. Try again.')
    } finally {
      setDepositLoading(false)
    }
  }

  const displayName =
    dashboardData.account?.fullName ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User'

  useEffect(() => {
    let mounted = true

    const loadDashboard = async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const data = await getDashboardRequest()

        if (!mounted) {
          return
        }

        setDashboardData({
          account: data.account,
          balance: data.balance,
          recentActivity: data.recentActivity || [],
          refreshedAt: data.refreshedAt,
        })
        setError('')
      } catch (requestError) {
        if (!mounted) {
          return
        }

        if (requestError instanceof AxiosError) {
          const status = requestError.response?.status

          if (status === 401) {
            logout()
            navigate('/login', { replace: true })
            return
          }

          setError(requestError.response?.data?.message || 'Unable to load dashboard.')
        } else {
          setError('Unable to load dashboard.')
        }
      } finally {
        if (!mounted) {
          return
        }

        if (silent) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    }

    loadDashboard()
    const timerId = setInterval(() => {
      loadDashboard({ silent: true })
    }, 5000)

    return () => {
      mounted = false
      clearInterval(timerId)
    }
  }, [logout, navigate])

  const getActivityDescription = (item) => {
    const type = item.transactionType === 'debit' ? 'debit' : 'credit'

    if (type === 'debit') {
      return `Sent to ${item.receiver || 'Unknown'}`
    }

    return `Received from ${item.sender || 'Unknown'}`
  }

  const recentActivity = dashboardData.recentActivity

  return (
    <section className="dashboard-screen">
      <Navbar />

      <main className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>Welcome, {displayName}</h1>
            <p>Manage your account in one place.</p>
          </div>

          <div className="header-actions">
            <span className={`live-chip ${refreshing ? 'syncing' : ''}`}>
              {refreshing ? 'Syncing...' : 'Live'}
            </span>
          </div>
        </header>

        <article className="balance-panel">
          <p className="balance-label">Current Account Balance</p>
          <p className="balance-value">
            {loading ? 'Loading...' : formatCurrency(dashboardData.balance)}
          </p>
          {dashboardData.refreshedAt ? (
            <p className="balance-update-time">
              Updated {formatTimeAgo(dashboardData.refreshedAt)}
            </p>
          ) : null}
          <button className="add-money-btn" onClick={openDeposit} type="button">
            + Add Money
          </button>
        </article>

        {depositOpen && (
          <div className="deposit-overlay" onClick={closeDeposit} role="presentation">
            <div className="deposit-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add Money">
              <h2 className="deposit-title">Add Money</h2>
              <p className="deposit-subtitle">Top up your account balance instantly.</p>

              {depositSuccess ? (
                <div className="deposit-success">{depositSuccess}</div>
              ) : null}

              <form onSubmit={handleDeposit} noValidate>
                <label className="deposit-label" htmlFor="deposit-amount">Amount (₹)</label>
                <input
                  id="deposit-amount"
                  className="deposit-input"
                  type="number"
                  min="1"
                  max="1000000"
                  step="any"
                  placeholder="e.g. 5000"
                  value={depositAmount}
                  onChange={(e) => { setDepositAmount(e.target.value); setDepositError('') }}
                  disabled={depositLoading}
                  autoFocus
                />
                {depositError ? <p className="deposit-error">{depositError}</p> : null}

                <div className="deposit-quick-btns">
                  {[500, 1000, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="deposit-quick-btn"
                      onClick={() => { setDepositAmount(String(preset)); setDepositError('') }}
                      disabled={depositLoading}
                    >
                      +₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                <div className="deposit-actions">
                  <button type="button" className="deposit-cancel-btn" onClick={closeDeposit} disabled={depositLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="deposit-confirm-btn" disabled={depositLoading || !depositAmount}>
                    {depositLoading ? 'Adding...' : 'Add Money'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {error ? <div className="error-box dashboard-error">{error}</div> : null}

        <section className="action-grid" aria-label="Dashboard options">
          <Link className="action-tile action-link" to="/send-money">
            <h2>Send Money</h2>
            <p>Transfer money to another registered user.</p>
          </Link>

          <Link className="action-tile action-link" to="/request-money">
            <h2>Request Money</h2>
            <p>Create and track money requests.</p>
          </Link>

          <Link className="action-tile action-link" to="/statement">
            <h2>Account Statement</h2>
            <p>Review all debit and credit transactions.</p>
          </Link>

          <article className="action-tile">
            <h2>Pay Bills</h2>
            <p>Bill payments can be connected in a later step.</p>
          </article>
        </section>

        <section className="activity-panel">
          <h2>Recent Activity</h2>

          {loading ? (
            <p className="dashboard-muted">Loading transactions...</p>
          ) : recentActivity.length === 0 ? (
            <p className="dashboard-muted">No transactions yet.</p>
          ) : (
            <ul className="activity-list">
              {recentActivity.map((item) => {
                const type = item.transactionType === 'debit' ? 'debit' : 'credit'

                return (
                  <li key={item.id} className="activity-item">
                    <div>
                      <p className="activity-title">{getActivityDescription(item)}</p>
                      <p className="activity-time">{formatTimeAgo(item.createdAt)}</p>
                    </div>
                    <p className={`activity-amount ${type}`}>
                      {type === 'debit' ? '-' : '+'}
                      {formatCurrency(item.amount)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </section>
  )
}

export default Dashboard