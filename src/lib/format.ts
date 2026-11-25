export const formatScore = (value: number | bigint) => value.toLocaleString('en-US')

export function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/** Unix seconds or milliseconds to a short local date and time. */
export function formatDateTime(unixSeconds: number | null) {
  if (unixSeconds === null || unixSeconds <= 0) return 'Date unavailable'
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
