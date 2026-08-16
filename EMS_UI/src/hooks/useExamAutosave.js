// ems_frontend/src/hooks/useExamAutosave.js
//
// Keeps an attempt in flight recoverable.
//
// An exam session already survived interruption on the server: rejoining an
// IN_PROGRESS session hands back the same paper and only the time that was
// left. The answers did not survive with it. They lived in React state until
// the single submit call at the end, so a dropped connection, a power cut or a
// closed laptop cost the candidate everything they had answered — on an attempt
// they cannot repeat without paying for a new application.
//
// Two layers, because the two failure modes are not the same shape:
//
//   * localStorage, written synchronously on every keystroke-equivalent. This
//     is the layer that survives the machine dying mid-question, because it is
//     already on disk before anything is sent. It only helps on the same
//     browser.
//   * the server, written on a timer and flushed on reconnect. Slower, but it
//     is the only layer that lets a candidate finish on a different machine.
//
// On resume the two are compared and the newer one wins.

import { useCallback, useEffect, useRef, useState } from 'react'
import { examAPI } from '../api/examAPI'

/** How often a dirty draft is pushed to the server. */
const AUTOSAVE_INTERVAL_MS = 8000

const DRAFT_KEY_PREFIX = 'ems.exam.draft.'

const draftKey = (sessionToken) => `${DRAFT_KEY_PREFIX}${sessionToken}`

/**
 * Answers as the API wants them.
 *
 * Cleared answers are dropped rather than sent empty: every save carries the
 * whole draft and replaces the last one, so a question that is absent is a
 * question the candidate has un-answered.
 */
const toAnswerPayload = (answers) => Object.entries(answers || {})
  .map(([questionId, value]) => ({
    questionId: Number(questionId),
    selectedOptions: Array.isArray(value) ? value : (value === '' || value == null ? [] : [value])
  }))
  .filter((answer) => Number.isFinite(answer.questionId) && answer.selectedOptions.length > 0)

const toMarkedPayload = (markedForReview) => Object.entries(markedForReview || {})
  .filter(([, marked]) => Boolean(marked))
  .map(([questionId]) => Number(questionId))
  .filter(Number.isFinite)

/** Turns either draft shape back into the page's `{ questionId: answer }` map. */
export const answersFromDraft = (savedAnswers) => {
  const map = {}
  ;(savedAnswers || []).forEach((answer) => {
    const options = answer?.selectedOptions || []
    if (!answer?.questionId || options.length === 0) {
      return
    }
    // Single-choice answers were stored as a one-element list; the page holds
    // them as a bare string, and a radio group given an array matches nothing.
    map[answer.questionId] = options.length === 1 ? options[0] : options
  })
  return map
}

export const markedFromDraft = (markedIds) => {
  const map = {}
  ;(markedIds || []).forEach((questionId) => {
    map[questionId] = true
  })
  return map
}

export const readLocalDraft = (sessionToken) => {
  if (!sessionToken) {
    return null
  }
  try {
    const raw = window.localStorage.getItem(draftKey(sessionToken))
    if (!raw) {
      return null
    }
    const draft = JSON.parse(raw)
    return draft && Array.isArray(draft.answers) ? draft : null
  } catch (err) {
    // A draft that cannot be read is a draft that does not exist. Never let it
    // throw: this runs on the path that puts the candidate back into their exam.
    console.warn('Ignoring unreadable local exam draft', err)
    return null
  }
}

export const writeLocalDraft = (sessionToken, draft) => {
  if (!sessionToken) {
    return
  }
  try {
    window.localStorage.setItem(draftKey(sessionToken), JSON.stringify(draft))
  } catch (err) {
    console.warn('Failed to mirror exam draft locally', err)
  }
}

export const clearLocalDraft = (sessionToken) => {
  if (!sessionToken) {
    return
  }
  try {
    window.localStorage.removeItem(draftKey(sessionToken))
  } catch (err) {
    console.warn('Failed to clear local exam draft', err)
  }
}

/**
 * Mirrors the candidate's answers to disk and to the server while they work.
 *
 * @param {object}   params
 * @param {string}   params.sessionToken   active session; nothing runs without it
 * @param {boolean}  params.enabled        true only while the attempt is running
 * @param {object}   params.answers        `{ questionId: answer }` from the page
 * @param {object}   params.markedForReview `{ questionId: boolean }`
 * @param {number}   params.currentQuestionNumber 1-indexed position
 * @returns {{status: string, lastSavedAt: number|null, flush: function}}
 *          `status` is one of idle | pending | saving | saved | offline | error
 */
const useExamAutosave = ({
  sessionToken,
  enabled,
  answers,
  markedForReview,
  currentQuestionNumber
}) => {
  const [status, setStatus] = useState('idle')
  const [lastSavedAt, setLastSavedAt] = useState(null)

  /** Latest draft, read by the timer rather than captured in its closure. */
  const snapshotRef = useRef(null)
  /** Serialized form of what the server last acknowledged. */
  const savedSerializedRef = useRef(null)
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (!enabled || !sessionToken) {
      return
    }

    const snapshot = {
      answers: toAnswerPayload(answers),
      markedForReview: toMarkedPayload(markedForReview),
      currentQuestionNumber
    }
    snapshotRef.current = snapshot

    /*
     * Written before anything is sent, and synchronously, because this is the
     * layer that has to be already on disk when the machine dies. An async
     * flush during `pagehide` is not guaranteed to complete; this is.
     */
    writeLocalDraft(sessionToken, { ...snapshot, sessionToken, updatedAt: Date.now() })

    if (JSON.stringify(snapshot) !== savedSerializedRef.current) {
      setStatus((prev) => (prev === 'saving' ? prev : 'pending'))
    }
  }, [enabled, sessionToken, answers, markedForReview, currentQuestionNumber])

  const flush = useCallback(async () => {
    const snapshot = snapshotRef.current
    if (!enabled || !sessionToken || !snapshot || inFlightRef.current) {
      return
    }

    const serialized = JSON.stringify(snapshot)
    if (serialized === savedSerializedRef.current) {
      return
    }

    inFlightRef.current = true
    setStatus('saving')
    try {
      await examAPI.saveExamProgress(sessionToken, snapshot)
      savedSerializedRef.current = serialized
      setLastSavedAt(Date.now())
      setStatus('saved')
    } catch (err) {
      /*
       * Never surfaced as a failure the candidate has to act on. The draft is
       * still on disk and still dirty, so the next tick — or the `online`
       * listener below — tries again. Distinguishing offline from a server
       * error only changes what the status line says.
       */
      setStatus(navigator.onLine ? 'error' : 'offline')
      console.warn('Exam progress autosave failed; will retry', err?.message || err)
    } finally {
      inFlightRef.current = false
    }
  }, [enabled, sessionToken])

  useEffect(() => {
    if (!enabled || !sessionToken) {
      return undefined
    }
    const timer = setInterval(() => { void flush() }, AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [enabled, sessionToken, flush])

  // Reconnecting is the moment a queued draft is most worth sending, and a tab
  // being hidden is the last warning some interruptions give.
  useEffect(() => {
    if (!enabled || !sessionToken) {
      return undefined
    }
    const handler = () => { void flush() }
    window.addEventListener('online', handler)
    window.addEventListener('pagehide', handler)
    document.addEventListener('visibilitychange', handler)
    return () => {
      window.removeEventListener('online', handler)
      window.removeEventListener('pagehide', handler)
      document.removeEventListener('visibilitychange', handler)
    }
  }, [enabled, sessionToken, flush])

  return { status, lastSavedAt, flush }
}

export default useExamAutosave
