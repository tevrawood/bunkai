import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  // Top-level routes don't get a back button.
  const isRoot = location.pathname === '/' || location.pathname === '/log'

  return (
    <div className="app">
      <header className="topbar">
        {!isRoot && (
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
            ‹ Back
          </button>
        )}
        <div className="brand">
          <span className="name">Shorinkan Bunkai</span>
          <span className="tag">Kata to Application</span>
        </div>
        <div className="spacer" />
        <UserButton afterSignOutUrl="/" />
      </header>

      <main className="content">{children}</main>

      <nav className="bottomnav">
        <NavLink to="/" end>
          <span className="ico">⛩️</span>
          Kata
        </NavLink>
        <NavLink to="/log">
          <span className="ico">📖</span>
          Log
        </NavLink>
      </nav>
    </div>
  )
}
