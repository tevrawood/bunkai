import { Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'
import Layout from './components/Layout.jsx'
import KataList from './pages/KataList.jsx'
import Segments from './pages/Segments.jsx'
import BunkaiList from './pages/BunkaiList.jsx'
import BunkaiForm from './pages/BunkaiForm.jsx'
import BunkaiDetail from './pages/BunkaiDetail.jsx'
import Log from './pages/Log.jsx'

function SignInScreen() {
  return (
    <div className="center-screen">
      <div className="brand" style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 26 }}>Shorinkan Bunkai</div>
        <div style={{ color: 'var(--accent)', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>
          Kata to Application
        </div>
      </div>
      <SignIn routing="hash" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
      <SignedIn>
        <Layout>
          <Routes>
            <Route path="/" element={<KataList />} />
            <Route path="/kata/:kataId" element={<Segments />} />
            <Route path="/segment/:segmentId" element={<BunkaiList />} />
            <Route path="/segment/:segmentId/new" element={<BunkaiForm />} />
            <Route path="/bunkai/:bunkaiId" element={<BunkaiDetail />} />
            <Route path="/log" element={<Log />} />
          </Routes>
        </Layout>
      </SignedIn>
    </>
  )
}
