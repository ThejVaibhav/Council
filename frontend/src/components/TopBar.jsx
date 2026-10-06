import { SKIN } from './art/people'

export default function TopBar({ profile, onHome, onProfile, demo }) {
  return (
    <header className="topbar">
      <button type="button" className="wordmark" onClick={onHome} aria-label="Council, start a new plan">
        Council
        {demo && <span className="demo-tag">sample debates</span>}
      </button>
      {profile && (
        <button type="button" className="me-chip" onClick={onProfile} aria-label="Edit your profile">
          <span className="me-face" style={{ background: SKIN[profile.skin ?? 1] }}>
            {profile.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="me-name">{profile.name}</span>
        </button>
      )}
    </header>
  )
}
