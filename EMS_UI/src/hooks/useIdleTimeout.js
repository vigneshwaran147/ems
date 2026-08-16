// ems_frontend/src/hooks/useIdleTimeout.js
import { useCallback, useEffect, useRef, useState } from 'react'

/** How long a session may sit untouched before it is ended. */
export const IDLE_LIMIT_MS = 10 * 60 * 1000

/** How long before the cutoff the warning countdown appears. */
export const WARN_BEFORE_MS = 60 * 1000

/** How often the elapsed time is re-checked. */
const POLL_MS = 1000

/**
 * Minimum spacing between storage writes. A write on every mousemove would
 * hammer localStorage to no purpose: a stamp up to this stale still answers the
 * idle question correctly against a ten-minute window.
 */
const WRITE_THROTTLE_MS = 5000

/**
 * Deliberately shared across tabs: activity in any one of them keeps the
 * session alive in all of them. With a per-tab timer, a background tab expires
 * while the user is working in another and takes the whole session down with it.
 */
const ACTIVITY_KEY = 'ems.lastActivityAt'

/**
 * Passive signals only. Tab focus and visibility are pointedly absent —
 * returning to a tab that has been idle for eleven minutes is not activity,
 * it is the moment the expiry should finally be noticed.
 */
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'touchstart', 'scroll']

const readStamp = () => {
  try {
    const parsed = Number(window.localStorage.getItem(ACTIVITY_KEY))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  } catch {
    // Safari in private mode throws on storage access rather than returning
    // null. The caller falls back to its in-memory ref, which still bounds the
    // session — it just stops being shared between tabs.
    return null
  }
}

const writeStamp = (value) => {
  try {
    window.localStorage.setItem(ACTIVITY_KEY, String(value))
  } catch {
    /* storage unavailable; the in-memory ref carries the session on its own */
  }
}

/**
 * Records activity without arming any expiry.
 *
 * For screens that have to hold the session open while they are on screen but
 * must never be the thing that ends it — the live exam, which runs outside the
 * app shell and would otherwise have its refresh token revoked out from under
 * it by an idle portal tab in the same browser.
 */
export const markSessionActive = () => writeStamp(Date.now())

/** Drops the shared stamp so the next sign-in starts from a clean clock. */
export const clearIdleStamp = () => {
  try {
    window.localStorage.removeItem(ACTIVITY_KEY)
  } catch {
    /* nothing to clear */
  }
}

/**
 * Ends the session after {@link IDLE_LIMIT_MS} without user input.
 *
 * Elapsed time is measured against a wall-clock timestamp rather than by
 * counting down a number. A counter loses whatever time the machine spends
 * asleep, so a laptop closed on a live session would wake up with the session
 * still running; comparing timestamps makes the expiry fire on the first tick
 * after the lid opens.
 *
 * Returns `warningMsLeft` — null except inside the final warning window — and
 * `stayActive` to reset the clock from an explicit user choice.
 */
export const useIdleTimeout = ({ enabled = true, onTimeout }) => {
  const [msLeft, setMsLeft] = useState(null)
  const stampRef = useRef(0)
  const lastWriteRef = useRef(0)
  const warningRef = useRef(false)
  const firedRef = useRef(false)
  const onTimeoutRef = useRef(onTimeout)

  // Held in a ref so a caller passing an inline arrow does not tear down and
  // re-arm every listener on each render.
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  const markActive = useCallback((now = Date.now()) => {
    stampRef.current = now
    lastWriteRef.current = now
    warningRef.current = false
    setMsLeft(null)
    writeStamp(now)
  }, [])

  useEffect(() => {
    if (!enabled) {
      warningRef.current = false
      setMsLeft(null)
      return undefined
    }

    firedRef.current = false

    // Seed from whatever another tab has already recorded, so opening a second
    // tab does not restart the clock. A stamp older than the limit is treated
    // as absent rather than as an instant expiry: it is a leftover from a
    // previous session, and signing a user out the moment they sign in is a
    // far worse failure than granting a returning one a fresh ten minutes.
    const existing = readStamp()
    const now = Date.now()
    if (existing && now - existing < IDLE_LIMIT_MS) {
      stampRef.current = existing
    } else {
      markActive(now)
    }

    const handleActivity = () => {
      const at = Date.now()
      // The write throttle is bypassed once the warning is up, so the countdown
      // clears on the first real movement instead of up to five seconds later.
      if (!warningRef.current && at - lastWriteRef.current < WRITE_THROTTLE_MS) {
        stampRef.current = at
        return
      }
      markActive(at)
    }

    const check = () => {
      if (firedRef.current) return

      const stamp = Math.max(stampRef.current, readStamp() || 0)
      stampRef.current = stamp
      const idleFor = Date.now() - stamp

      if (idleFor >= IDLE_LIMIT_MS) {
        firedRef.current = true
        warningRef.current = false
        setMsLeft(null)
        onTimeoutRef.current?.()
        return
      }

      const remaining = IDLE_LIMIT_MS - idleFor
      if (remaining <= WARN_BEFORE_MS) {
        warningRef.current = true
        // Rounded to whole seconds so the state settles on one value per tick;
        // the raw figure would re-render the whole shell on every poll.
        setMsLeft(Math.ceil(remaining / 1000) * 1000)
      } else {
        warningRef.current = false
        setMsLeft(null)
      }
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }))
    // Background tabs have their timers throttled to roughly once a minute, so
    // an expiry can sit unnoticed until the tab is looked at again. Re-checking
    // on the way back makes that moment immediate.
    document.addEventListener('visibilitychange', check)

    const timer = window.setInterval(check, POLL_MS)
    check()

    return () => {
      window.clearInterval(timer)
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity))
      document.removeEventListener('visibilitychange', check)
    }
  }, [enabled, markActive])

  return {
    warningMsLeft: msLeft,
    stayActive: useCallback(() => markActive(), [markActive]),
  }
}

export default useIdleTimeout
