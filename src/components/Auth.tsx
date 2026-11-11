import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function Auth() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    if (mode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      })
      if (error) setMessage(error.message)
      else if (!data.session) setMessage('Check your email to confirm your account, then sign in.')
    }
    setBusy(false)
  }

  return (
    <main className="narrow">
      <h1>Maya Meal Prep</h1>
      <p className="muted">Plan a week of meals together and get the grocery list.</p>
      <form className="card stack" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button type="submit" className="primary" disabled={busy}>
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
        {message && <p className="notice">{message}</p>}
      </form>
      <button
        type="button"
        className="link"
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
          setMessage(null)
        }}
      >
        {mode === 'sign-in' ? 'New here? Create an account' : 'Have an account? Sign in'}
      </button>
    </main>
  )
}
