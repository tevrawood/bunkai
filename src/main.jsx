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

// Dark theme variables to match the app shell so the Clerk widget blends in.
const clerkAppearance = {
  variables: {
    colorPrimary: '#007D6E',
    colorBackground: '#214042',
    colorText: '#EAF2F1',
    colorInputBackground: '#27233A',
    colorInputText: '#EAF2F1',
    borderRadius: '12px',
    fontFamily: 'Lexend, sans-serif',
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
