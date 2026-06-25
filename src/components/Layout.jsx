import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  // Top-level routes don't get a back button.
  const isRoot = ['/', '/bunkai', '/log'].includes(location.pathname)

  return (
    <div className="app">
      <header className="topbar">
        {!isRoot && (
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
            ‹ Back
          </button>
        )}
        <img className="crest" src="/crest.png" alt="Shorinkan crest" />
        <div className="brand">
          <span className="name">Shorinkan Bunkai</span>
          <span className="tag">Kata to Application</span>
        </div>
        <div className="spacer" />
        <UserButton afterSignOutUrl="/" />
      </header>

      <main className="content">{children}</main>

      <nav className="bottomnav">
        <NavLink to="/bunkai">
          <span className="ico"><BunkaiIcon /></span>
          Bunkai
        </NavLink>
        <NavLink to="/" end>
          <span className="ico"><KataIcon /></span>
          Kata
        </NavLink>
        <NavLink to="/log">
          <span className="ico"><LogIcon /></span>
          Log
        </NavLink>
      </nav>
    </div>
  )
}

// Two crossed arms — the moment of application (bunkai).
function BunkaiIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5l16 14" />
      <path d="M20 5L4 19" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  )
}

// Comb/fan motif from the crest — stands in for the kata curriculum.
function KataIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6.2c6-2.4 13-2.4 19 0" />
      <path d="M3.7 8.1c5.3-1.6 11.3-1.6 16.6 0" />
      <path d="M6.6 7V19" />
      <path d="M17.4 7V19" />
    </svg>
  )
}

// Open book — the training log.
function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.5C10.4 5.2 7.6 4.7 4.5 5.2v13c3.1-.5 5.9 0 7.5 1.3" />
      <path d="M12 6.5c1.6-1.3 4.4-1.8 7.5-1.3v13c-3.1-.5-5.9 0-7.5 1.3" />
      <path d="M12 6.5V19.8" />
    </svg>
  )
}
