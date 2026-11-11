import { hasStaging, isDebugMode, setDebugMode } from '../lib/supabase'

/** The debug-mode switch: a warning banner when on, a quiet footer link when off. */
export function DebugBar() {
  if (!hasStaging) return null

  if (isDebugMode) {
    return (
      <div className="debug-banner" role="status">
        <span>
          Debug mode: you are on the staging database. Accounts and data here are separate and
          may be wiped.
        </span>
        <button type="button" onClick={() => setDebugMode(false)}>Leave debug mode</button>
      </div>
    )
  }

  return (
    <footer className="debug-footer">
      <button type="button" className="link" onClick={() => setDebugMode(true)}>
        Debug mode
      </button>
    </footer>
  )
}
