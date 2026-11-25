import { useSyncExternalStore } from 'react'

export type Route = 'home' | 'play' | 'profile' | 'history'
const ROUTES: Route[] = ['home', 'play', 'profile', 'history']

const readRoute = (): Route => {
  const value = new URLSearchParams(window.location.search).get('p')
  return ROUTES.find((r) => r === value) ?? 'home'
}

const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener)
  return () => window.removeEventListener('popstate', listener)
}

export const useRoute = () => useSyncExternalStore(subscribe, readRoute)

/** Query-string routing works on any static host, with no rewrite rules. */
export function navigate(route: Route) {
  const url = route === 'home' ? window.location.pathname : `${window.location.pathname}?p=${route}`
  window.history.pushState({}, '', url)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}
