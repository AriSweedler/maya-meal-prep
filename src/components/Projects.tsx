import { useEffect, useState, type FormEvent } from 'react'
import { createProject, joinProject, listProjects, type Project } from '../lib/api'

type Props = { onOpen: (project: Project) => void }

export function Projects({ onOpen }: Props) {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listProjects().then(setProjects, (cause: Error) => setError(cause.message))
  }, [])

  async function run(action: () => Promise<Project>) {
    setError(null)
    try {
      onOpen(await action())
    } catch (cause) {
      setError((cause as Error).message)
    }
  }

  function create(event: FormEvent) {
    event.preventDefault()
    void run(() => createProject(name))
  }

  function join(event: FormEvent) {
    event.preventDefault()
    void run(() => joinProject(code))
  }

  return (
    <main className="narrow">
      <h1>Your projects</h1>
      {error && <p className="notice">{error}</p>}
      {projects === null && !error && <p className="muted">Loading…</p>}
      {projects?.length === 0 && (
        <p className="muted">No projects yet. Create one, or join with an invite code.</p>
      )}
      <ul className="plain stack">
        {projects?.map((project) => (
          <li key={project.id}>
            <button type="button" className="card row-button" onClick={() => onOpen(project)}>
              {project.name}
            </button>
          </li>
        ))}
      </ul>
      <form className="card stack" onSubmit={create}>
        <label>
          New project
          <input
            required
            placeholder="Our kitchen"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="submit" className="primary">Create project</button>
      </form>
      <form className="card stack" onSubmit={join}>
        <label>
          Invite code
          <input required value={code} onChange={(event) => setCode(event.target.value)} />
        </label>
        <button type="submit">Join project</button>
      </form>
    </main>
  )
}
