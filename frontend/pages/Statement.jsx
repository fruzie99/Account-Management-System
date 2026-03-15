import { AxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { getStatementRequest } from '../services/api'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0)

const formatDate = (isoDate) => {
  if (!isoDate) {
    return '--'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(isoDate))
}

const normalizeType = (transactionType) =>
  transactionType === 'credit' ? 'credit' : 'debit'

const Statement = () => {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  useEffect(() => {
    let mounted = true

    const loadStatement = async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const data = await getStatementRequest()

        if (!mounted) {
          return
        }

        setRows(data.statement || [])
        setUpdatedAt(data.refreshedAt || new Date().toISOString())
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

          setError(requestError.response?.data?.message || 'Unable to load statement.')
        } else {
          setError('Unable to load statement.')
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

    loadStatement()
    const timerId = setInterval(() => {
      loadStatement({ silent: true })
    }, 5000)

    return () => {
      mounted = false
      clearInterval(timerId)
    }
  }, [logout, navigate])

  return (
    <section className="statement-screen">
      <Navbar />

      <main className="statement-page" aria-label="Account Statement page">
        <header className="statement-header">
          <div>
            <h1>Account Statement</h1>
            <p>View all your debit and credit transactions.</p>
          </div>

          <div className="header-actions">
            <span className={`live-chip ${refreshing ? 'syncing' : ''}`}>
              {refreshing ? 'Syncing...' : 'Live'}
            </span>
          </div>
        </header>

        {error ? <div className="error-box">{error}</div> : null}

        <section className="statement-table-wrap">
          {loading ? <p className="statement-empty">Loading statement...</p> : null}

          {!loading && rows.length === 0 ? (
            <p className="statement-empty">No transactions found.</p>
          ) : null}

          {!loading && rows.length > 0 ? (
            <div className="statement-table-scroll">
              <table className="statement-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transaction Type</th>
                    <th>Amount</th>
                    <th>Sender</th>
                    <th>Receiver</th>
                    <th>Balance After Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const type = normalizeType(row.transactionType)
                    const sender = type === 'debit' ? 'You' : row.sender || 'Unknown'
                    const receiver = type === 'credit' ? 'You' : row.receiver || 'Unknown'

                    return (
                      <tr key={row.id}>
                        <td>{formatDate(row.createdAt)}</td>
                        <td>
                          <span className={`statement-type ${type}`}>
                            {type === 'credit' ? 'Credit' : 'Debit'}
                          </span>
                        </td>
                        <td className={`statement-amount ${type}`}>
                          {type === 'credit' ? '+' : '-'}
                          {formatCurrency(row.amount)}
                        </td>
                        <td>{sender}</td>
                        <td>{receiver}</td>
                        <td>
                          {row.balanceAfterTransaction === null
                            ? '--'
                            : formatCurrency(row.balanceAfterTransaction)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {updatedAt ? (
          <p className="statement-updated">
            Updated at {new Date(updatedAt).toLocaleTimeString('en-IN')}
          </p>
        ) : null}
      </main>
    </section>
  )
}

export default Statement