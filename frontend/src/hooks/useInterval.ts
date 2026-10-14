import { useEffect, useRef } from 'react'

/** Runs `fn` every `ms` while the tab is visible (and once immediately). Pass ms=null to pause. */
export function useInterval(fn: () => void | Promise<void>, ms: number | null) {
  const saved = useRef(fn)
  useEffect(() => {
    saved.current = fn
  }, [fn])

  useEffect(() => {
    if (ms === null) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      if (!document.hidden) {
        try {
          await saved.current()
        } catch {
          /* network blip: try again next tick */
        }
      }
      if (!stopped) timer = setTimeout(tick, ms)
    }
    tick()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [ms])
}
