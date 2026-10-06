import { Sparkle } from 'lucide-react'

export default function Header({ onHome, compact = false }) {
  return (
    <header className={`site-header ${compact ? 'is-compact' : ''}`}>
      <button type="button" className="brand" onClick={onHome} aria-label="Council home">
        <span className="brand-name">
          Council
          <Sparkle className="brand-spark" size={compact ? 16 : 20} fill="currentColor" strokeWidth={0} />
        </span>
        {!compact && <span className="brand-tag">Plan better, together.</span>}
      </button>
      {!compact && (
        <nav className="site-nav">
          <a href="#how">How it works</a>
        </nav>
      )}
    </header>
  )
}
