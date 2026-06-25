import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import './index.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY — see .env.example')
}

// Theme the Clerk widgets (sign-in screen + the account/settings popover behind
// the UserButton) to the crest palette so they match the app shell instead of
// Clerk's default light theme. Values mirror the CSS custom properties in
// index.css. Set once on the provider so both surfaces inherit it.
const clerkAppearance = {
  variables: {
    colorPrimary: '#2F7B52',                  // --green: matches the app's primary buttons
    colorTextOnPrimaryBackground: '#FFFFFF',
    colorBackground: '#0B0F2A',               // --surface: the card sits above the navy bg
    colorText: '#F5F3EE',                     // --text
    colorTextSecondary: '#8C92A6',            // --muted
    colorNeutral: '#F5F3EE',                  // light base so borders/dividers read on dark
    colorInputBackground: '#070A1F',          // --surface-2
    colorInputText: '#F5F3EE',
    colorDanger: '#C8423B',                   // --crimson-text
    colorSuccess: '#2F7B52',                  // --green
    colorWarning: '#C69214',                  // --gold
    borderRadius: '11px',                     // --radius
    fontFamily: 'Lexend, sans-serif',
  },
  elements: {
    // Gold hairline + soft shadow to echo the app's cards.
    card: {
      border: '1px solid rgba(214, 146, 20, 0.16)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    },
    footer: { background: 'transparent' },
  },
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
)
