import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <main style={{ padding: 24 }}>
      <h1>Council</h1>
      <p>Three agents debate your plan. A moderator decides.</p>
      <p data-testid="health">
        Backend:{' '}
        {error ? `error (${error})` : health ? `${health.status}, db ${health.database}` : 'checking...'}
      </p>
    </main>
  )
}

export default App
