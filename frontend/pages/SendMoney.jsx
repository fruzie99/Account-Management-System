import Navbar from '../components/Navbar'
import { AxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { getBalanceRequest, transferMoneyRequest } from '../services/api'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value || 0)

const SendMoney = () => {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('Payment')
  const [message, setMessage] = useState('')
  const [currentBalance, setCurrentBalance] = useState(0)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let mounted = true

    const loadBalance = async () => {
      setLoadingBalance(true)

      try {
        const data = await getBalanceRequest()

        if (!mounted) {
          return
        }

        setCurrentBalance(Number(data.balance || 0))
      } catch (_error) {
        if (!mounted) {
          return
        }

        setError('Unable to fetch account balance.')
      } finally {
        if (mounted) {
          setLoadingBalance(false)
        }
      }
    }

    loadBalance()

    return () => {
      mounted = false
    }
  }, [])

  const parsedAmount = useMemo(() => {
    const value = Number(amount)
    if (Number.isNaN(value) || value <= 0) {
      return 0
    }

    return Number(value.toFixed(2))
  }, [amount])

  const hasInsufficientBalance = parsedAmount > currentBalance

  const handleConfirmTransfer = async () => {
    setError('')
    setSuccess('')

    if (!recipient.trim()) {
      setError('Enter a recipient email or account id.')
      return
    }

    if (!parsedAmount) {
      setError('Enter a valid transfer amount.')
      return
    }

    if (hasInsufficientBalance) {
      setError('Insufficient balance for this transfer.')
      return
    }

    setSubmitting(true)

    try {
      const data = await transferMoneyRequest({
        recipient: recipient.trim(),
        amount: parsedAmount,
        purpose,
        message,
      })

      setCurrentBalance(Number(data?.transfer?.senderBalance || 0))
      setSuccess(`Transferred ${formatCurrency(parsedAmount)} successfully.`)
      setAmount('')
      setMessage('')
      setPurpose('Payment')
    } catch (requestError) {
      if (requestError instanceof AxiosError) {
        setError(requestError.response?.data?.message || 'Transfer failed.')
      } else {
        setError('Transfer failed.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="send-money-screen">
      <Navbar />

      <main className="send-money-page" aria-label="Send Money page">
        <header className="send-money-header">
          <h1>Send Money Page</h1>
          <p>
            Available Balance:{' '}
            <strong>
              {loadingBalance ? 'Loading...' : formatCurrency(currentBalance)}
            </strong>
          </p>
        </header>

        {error ? <div className="error-box send-money-alert">{error}</div> : null}
        {success ? <div className="message send-money-alert">{success}</div> : null}

        <section className="send-step-card">
          <div className="send-step-title-row">
            <span className="send-step-dot" aria-hidden="true" />
            <span className="send-step-index">1</span>
            <h2>Enter Recipient Details</h2>
          </div>

          <div className="send-step-body">
            <input
              className="input-field"
              type="text"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="Recipient Email or Account Number"
            />
          </div>
        </section>

        <section className="send-step-card">
          <div className="send-step-title-row">
            <span className="send-step-dot" aria-hidden="true" />
            <span className="send-step-index">2</span>
            <h2>Enter Amount & Message</h2>
          </div>

          <div className="send-step-body send-form-grid">
            <input
              className="send-amount-input"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />

            <div className="form-group">
              <label htmlFor="purpose">Purpose</label>
              <select
                id="purpose"
                className="input-field"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              >
                <option value="Payment">Payment</option>
                <option value="Rent">Rent</option>
                <option value="Gift">Gift</option>
                <option value="Bill">Bill</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="message">Message (Optional)</label>
              <textarea
                id="message"
                className="send-message-input"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Message (Optional)"
                rows={4}
              />
            </div>
          </div>
        </section>

        <section className="send-step-card">
          <div className="send-step-title-row">
            <span className="send-step-dot" aria-hidden="true" />
            <span className="send-step-index">3</span>
            <h2>Review and Transfer</h2>
          </div>

          <div className="send-step-body">
            <dl className="send-summary-grid">
              <div>
                <dt>Recipient</dt>
                <dd>{recipient.trim() || '-'}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{formatCurrency(parsedAmount)}</dd>
              </div>
              <div>
                <dt>Purpose</dt>
                <dd>{purpose}</dd>
              </div>
              <div>
                <dt>Message</dt>
                <dd>{message.trim() || '-'}</dd>
              </div>
            </dl>

            {hasInsufficientBalance ? (
              <p className="send-warning">Insufficient balance for this transfer amount.</p>
            ) : null}

            <button
              className="auth-button send-confirm-button"
              type="button"
              disabled={submitting || !parsedAmount || !recipient.trim() || hasInsufficientBalance}
              onClick={handleConfirmTransfer}
            >
              {submitting ? 'Processing...' : 'Confirm Transfer'}
            </button>
          </div>
        </section>
      </main>
    </section>
  )
}

export default SendMoney