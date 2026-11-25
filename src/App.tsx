import { Suspense, lazy } from 'react'
import { useResolvePendingSubmissions } from './blockchain/useSubmission'
import { Navbar } from './components/Navbar'
import { useRoute } from './lib/router'
import History from './pages/History'
import Home from './pages/Home'
import Profile from './pages/Profile'

// The game engine is a large bundle, so it only loads when you start playing.
const Play = lazy(() => import('./pages/Play'))

export default function App() {
  const route = useRoute()
  useResolvePendingSubmissions()

  if (route === 'play') {
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-nex-bg" />}>
        <Play />
      </Suspense>
    )
  }

  return (
    <div className="starfield relative min-h-dvh bg-nex-bg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(76,61,200,0.35),transparent_70%)]" />
      <Navbar />
      <main className="relative">
        {route === 'home' && <Home />}
        {route === 'profile' && <Profile />}
        {route === 'history' && <History />}
      </main>
      <footer className="relative mx-auto max-w-5xl px-4 pb-20 text-center text-xs text-nex-mute">
        Scores are submitted by players from their browser and are not verified gameplay.
      </footer>
    </div>
  )
}
