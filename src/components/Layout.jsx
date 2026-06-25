import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  // Top-level routes don't get a back button.
  const isRoot = ['/', '/bunkai', '/kata', '/notes'].includes(location.pathname)

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
        <NavLink to="/kata">
          <span className="ico"><KataIcon /></span>
          Kata
        </NavLink>
        <NavLink to="/notes">
          <span className="ico"><NotesIcon /></span>
          Notes
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

// Pencil over lines — dated training notes.
function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h11" />
      <path d="M4 12h7" />
      <path d="M4 17h6" />
      <path d="M19.5 9.5l-7 7-2.5.6.6-2.5 7-7a1.3 1.3 0 0 1 1.9 1.9z" />
    </svg>
  )
}
