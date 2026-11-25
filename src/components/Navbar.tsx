import clsx from 'clsx'
import { History, Home, Rocket, User } from 'lucide-react'
import { navigate, useRoute, type Route } from '../lib/router'
import { Logo } from './Logo'
import { NetworkBadge, WalletConnect } from './WalletConnect'

const LINKS: { route: Route; label: string; icon: typeof Home }[] = [
  { route: 'home', label: 'Home', icon: Home },
  { route: 'play', label: 'Play', icon: Rocket },
  { route: 'profile', label: 'Profile', icon: User },
  { route: 'history', label: 'History', icon: History },
]

export function Navbar() {
  const current = useRoute()
  return (
    <header className="sticky top-0 z-30 border-b border-nex-line bg-nex-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
        <button type="button" onClick={() => navigate('home')} aria-label="NexArena home" className="shrink-0">
          <Logo />
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map(({ route, label }) => (
            <button
              key={route}
              type="button"
              onClick={() => navigate(route)}
              aria-current={current === route ? 'page' : undefined}
              className={clsx(
                'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                current === route ? 'bg-white/[0.07] text-nex-text' : 'text-nex-mute hover:text-nex-text',
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NetworkBadge className="max-lg:hidden" />
          <WalletConnect />
        </div>
      </div>

      <nav className="grid grid-cols-4 border-t border-nex-line md:hidden" aria-label="Main mobile">
        {LINKS.map(({ route, label, icon: Icon }) => (
          <button
            key={route}
            type="button"
            onClick={() => navigate(route)}
            aria-current={current === route ? 'page' : undefined}
            className={clsx(
              'flex min-h-11 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium',
              current === route ? 'text-nex-blue' : 'text-nex-mute',
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}
