import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Auth } from './components/Auth'
import { DebugBar } from './components/DebugBar'
import { Projects } from './components/Projects'
import { ProjectView } from './components/ProjectView'
import type { Project } from './lib/api'
import { isConfigured, isDebugMode, supabase } from './lib/supabase'

export default function App() {
  // The banner goes above the app when debug mode is on; the switch sits below it when off.
  return (
    <>
      {isDebugMode && <DebugBar />}
      <Screen />
      {!isDebugMode && <DebugBar />}
    </>
  )
}

function Screen() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) setProject(null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) {
    return (
      <main className="narrow">
        <h1>Maya Meal Prep</h1>
        <p className="notice">
          This build has no Supabase project configured. Set VITE_SUPABASE_URL and
          VITE_SUPABASE_KEY.
        </p>
      </main>
    )
  }
  if (session === undefined) return null
  if (session === null) return <Auth />

  return (
    <>
      <div className="account">
        <span className="muted">{session.user.email}</span>
        <button type="button" className="link" onClick={() => void supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
      {project ? (
        <ProjectView key={project.id} project={project} onLeave={() => setProject(null)} />
      ) : (
        <Projects onOpen={setProject} />
      )}
    </>
  )
}
