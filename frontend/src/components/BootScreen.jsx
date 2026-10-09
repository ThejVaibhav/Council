import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

/** Shown while a returning visitor's session is checked; explains a slow, waking server instead of a blank page. */
export default function BootScreen() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 3500)
    return () => clearTimeout(t)
  }, [])
  return (
    <motion.main className="boot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
      <div className="boot-card glass" role="status" aria-live="polite">
        <span className="boot-spinner" aria-hidden="true" />
        <strong>Opening Council…</strong>
        <p className="hint">{slow ? 'The server is waking up after a quiet spell. On free hosting this can take up to a minute, and it is quick after that.' : 'Signing you back in.'}</p>
      </div>
    </motion.main>
  )
}
