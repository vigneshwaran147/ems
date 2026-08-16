// ems_frontend/src/hooks/useDeviceCheck.js
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * How fast the meter chases the microphone. Raw RMS jitters hard enough to read
 * as noise on a bar chart, and a meter that flickers while the room is silent
 * tells a candidate their microphone is picking something up when it is not.
 */
const SMOOTHING = 0.35

/** RMS is tiny for ordinary speech; this brings a normal voice near full scale. */
const GAIN = 3.4

/**
 * A candidate-initiated camera and microphone check.
 *
 * Deliberately never started on mount. This screen can be opened days before a
 * slot, and a page that raises the browser's permission prompt on arrival trains
 * people to dismiss it — including the one the exam screen raises at start, when
 * refusing it costs them the attempt. So the stream is acquired only from a
 * click, and released again the moment the check is left or the page unmounts:
 * a camera light still on after someone has walked away is its own problem.
 *
 * The level is published on a ref rather than in state on purpose. At sixty
 * frames a second a `setState` here would re-render the whole scheduling screen
 * — picker, syllabus and all — for a bar chart; consumers read `levelRef.current`
 * inside their own animation frame instead.
 */
export const useDeviceCheck = () => {
  const [stream, setStream] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')

  const streamRef = useRef(null)
  const contextRef = useRef(null)
  const frameRef = useRef(0)
  /** Smoothed microphone level, 0–1. Read by the meter, never rendered. */
  const levelRef = useRef(0)

  const stop = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }
    if (contextRef.current) {
      // Nothing depends on the close completing, and a context torn down twice
      // (unmount racing a manual stop) rejects rather than throwing.
      contextRef.current.close().catch(() => {})
      contextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    levelRef.current = 0
    setStream(null)
  }, [])

  const start = useCallback(async () => {
    if (streamRef.current || !navigator.mediaDevices?.getUserMedia) {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser cannot access a camera or microphone, so the exam cannot run here.')
      }
      return
    }
    setRequesting(true)
    setError('')
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 } },
        audio: true
      })
      streamRef.current = media
      setStream(media)

      const AudioCtor = window.AudioContext || window.webkitAudioContext
      if (AudioCtor && media.getAudioTracks().length > 0) {
        const context = new AudioCtor()
        contextRef.current = context
        const analyser = context.createAnalyser()
        analyser.fftSize = 1024
        context.createMediaStreamSource(media).connect(analyser)

        const samples = new Uint8Array(analyser.fftSize)
        const read = () => {
          analyser.getByteTimeDomainData(samples)
          let sum = 0
          for (let i = 0; i < samples.length; i += 1) {
            const centred = (samples[i] - 128) / 128
            sum += centred * centred
          }
          const rms = Math.min(1, Math.sqrt(sum / samples.length) * GAIN)
          levelRef.current += (rms - levelRef.current) * SMOOTHING
          frameRef.current = requestAnimationFrame(read)
        }
        frameRef.current = requestAnimationFrame(read)
      }
    } catch (err) {
      // Worded by cause: "allow it in your browser" is useless advice to someone
      // whose laptop has no camera plugged in, and the fix is different.
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setError('Access was blocked. Allow the camera and microphone for this site in your browser settings, then try again.')
      } else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
        setError('No camera or microphone was found. Connect both before your exam slot.')
      } else if (err?.name === 'NotReadableError') {
        setError('Your camera or microphone is already in use by another app. Close it and try again.')
      } else {
        setError('The device check could not be completed. Please try again.')
      }
      stop()
    } finally {
      setRequesting(false)
    }
  }, [stop])

  useEffect(() => stop, [stop])

  return {
    /** The live MediaStream, or null while nothing is running. */
    stream,
    /** Smoothed 0–1 microphone level. A ref: read it inside your own rAF loop. */
    levelRef,
    requesting,
    error,
    live: Boolean(stream),
    start,
    stop
  }
}

export default useDeviceCheck
