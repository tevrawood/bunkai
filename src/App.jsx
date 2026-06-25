import { Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'
import Layout from './components/Layout.jsx'
import KataList from './pages/KataList.jsx'
import Segments from './pages/Segments.jsx'
import KataMoveBuilder from './pages/KataMoveBuilder.jsx'
import BunkaiHome from './pages/BunkaiHome.jsx'
import BunkaiList from './pages/BunkaiList.jsx'
import BunkaiForm from './pages/BunkaiForm.jsx'
import BunkaiDetail from './pages/BunkaiDetail.jsx'
import Notes from './pages/Notes.jsx'

function SignInScreen() {
  return (
    <div className="center-screen">
      <div className="brand" style={{ marginBottom: 8 }}>
        <img
          src="/crest.png"
          alt="Shorinkan crest"
          style={{ width: 132, height: 132, margin: '0 auto 18px', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,.6))' }}
        />
        <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 28, color: 'var(--text)' }}>
          Shorinkan Bunkai
        </div>
        <div style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginTop: 12 }}>
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
            <Route path="/kata/:kataId/build" element={<KataMoveBuilder />} />
            <Route path="/segment/:segmentId" element={<BunkaiList />} />
            <Route path="/segment/:segmentId/new" element={<BunkaiForm />} />
            <Route path="/bunkai" element={<BunkaiHome />} />
            <Route path="/bunkai/new" element={<BunkaiForm />} />
            <Route path="/bunkai/:bunkaiId" element={<BunkaiDetail />} />
            <Route path="/notes" element={<Notes />} />
          </Routes>
        </Layout>
      </SignedIn>
    </>
  )
}
