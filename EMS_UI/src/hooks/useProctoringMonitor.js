import { useCallback, useEffect, useRef, useState } from 'react'

const NOISE_THRESHOLD = 0.05
const FACE_DARK_THRESHOLD = 12
const HEAD_MOTION_THRESHOLD = 0.15

const useProctoringMonitor = ({ examInProgress, onViolation }) => {
  const [runtimeError, setRuntimeError] = useState(null)
  const [recordingDurationSec, setRecordingDurationSec] = useState(0)
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine ? 'online' : 'offline')
  const [faceStatus, setFaceStatus] = useState('unknown')
  const [headStatus, setHeadStatus] = useState('unknown')
  const [audioStatus, setAudioStatus] = useState('unknown')

  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const noiseMonitorRef = useRef(null)
  const headMonitorRef = useRef(null)
  const durationRef = useRef(null)
  const monitorVideoRef = useRef(null)
  const monitorCanvasRef = useRef(null)
  const previousFrameRef = useRef(null)
  const recordingStartRef = useRef(null)

  const faceMissingSinceRef = useRef(null)
  const lastNoiseViolationAtRef = useRef(0)
  const lastHeadViolationAtRef = useRef(0)
  const lastFaceViolationAtRef = useRef(0)
  const examInProgressRef = useRef(examInProgress)

  useEffect(() => {
    examInProgressRef.current = examInProgress
  }, [examInProgress])

  const clearMonitors = useCallback(() => {
    if (noiseMonitorRef.current) {
      clearInterval(noiseMonitorRef.current)
      noiseMonitorRef.current = null
    }
    if (headMonitorRef.current) {
      clearInterval(headMonitorRef.current)
      headMonitorRef.current = null
    }
    if (durationRef.current) {
      clearInterval(durationRef.current)
      durationRef.current = null
    }
  }, [])

  const startRecordingTimer = useCallback(() => {
    recordingStartRef.current = Date.now()
    setRecordingDurationSec(0)

    if (durationRef.current) {
      clearInterval(durationRef.current)
    }

    durationRef.current = setInterval(() => {
      if (!recordingStartRef.current) {
        return
      }
      const seconds = Math.max(0, Math.floor((Date.now() - recordingStartRef.current) / 1000))
      setRecordingDurationSec(seconds)
    }, 1000)
  }, [])

  const stopRecordingTimer = useCallback(() => {
    recordingStartRef.current = null
    if (durationRef.current) {
      clearInterval(durationRef.current)
      durationRef.current = null
    }
    setRecordingDurationSec(0)
  }, [])

  const emitViolation = useCallback((type, description, severity = 'MEDIUM') => {
    if (!examInProgressRef.current) {
      return
    }
    onViolation?.({
      type,
      description,
      severity,
      timestamp: new Date().toISOString()
    })
  }, [onViolation])

  const startNoiseMonitor = useCallback((stream) => {
    const audioTracks = stream.getAudioTracks()
    if (!audioTracks.length) {
      setAudioStatus('unknown')
      return
    }

    try {
      const audioTrackStream = new MediaStream(audioTracks)
      const context = new (window.AudioContext || window.webkitAudioContext)()
      if (context.state === 'suspended') {
        void context.resume()
      }
      const source = context.createMediaStreamSource(audioTrackStream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)

      audioContextRef.current = context
      analyserRef.current = analyser
      setAudioStatus('quiet')

      noiseMonitorRef.current = setInterval(() => {
        if (!analyserRef.current || !examInProgressRef.current) {
          return
        }

        const audioData = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteTimeDomainData(audioData)

        let sumSquares = 0
        for (let i = 0; i < audioData.length; i += 1) {
          const centered = (audioData[i] - 128) / 128
          sumSquares += centered * centered
        }
        const rms = Math.sqrt(sumSquares / audioData.length)

        if (rms > NOISE_THRESHOLD) {
          setAudioStatus('noisy')
          const now = Date.now()
          if (now - lastNoiseViolationAtRef.current > 4000) {
            lastNoiseViolationAtRef.current = now
            emitViolation('BACKGROUND_NOISE', 'Background noise detected during exam.', 'MEDIUM')
          }
        } else {
          setAudioStatus('quiet')
        }
      }, 500)
    } catch (err) {
      setRuntimeError('Unable to initialize noise monitoring.')
      console.warn('Noise monitor setup failed:', err)
    }
  }, [emitViolation])

  const startHeadMotionMonitor = useCallback((stream) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.srcObject = stream
    monitorVideoRef.current = video

    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 120
    monitorCanvasRef.current = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (!ctx) {
      setRuntimeError('Unable to initialize head/face monitoring.')
      return
    }

    setHeadStatus('unknown')

    void video.play().catch(() => undefined)

    headMonitorRef.current = setInterval(() => {
      if (!examInProgressRef.current) {
        return
      }

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data

      let luminanceSum = 0
      for (let i = 0; i < frame.length; i += 4) {
        luminanceSum += frame[i] + frame[i + 1] + frame[i + 2]
      }
      const luminanceAvg = luminanceSum / (frame.length / 4) / 3

      if (luminanceAvg < FACE_DARK_THRESHOLD) {
        setFaceStatus('missing')
        if (!faceMissingSinceRef.current) {
          faceMissingSinceRef.current = Date.now()
        }
        const now = Date.now()
        if (
          faceMissingSinceRef.current &&
          now - faceMissingSinceRef.current > 2000 &&
          now - lastFaceViolationAtRef.current > 5000
        ) {
          lastFaceViolationAtRef.current = now
          emitViolation('FACE_MISSING', 'Face missing from camera frame.', 'MEDIUM')
        }
        return
      }

      faceMissingSinceRef.current = null
      setFaceStatus('detected')

      const previousFrame = previousFrameRef.current
      if (previousFrame) {
        let diffSum = 0
        for (let i = 0; i < frame.length; i += 4) {
          const currentGray = (frame[i] + frame[i + 1] + frame[i + 2]) / 3
          const previousGray = (previousFrame[i] + previousFrame[i + 1] + previousFrame[i + 2]) / 3
          diffSum += Math.abs(currentGray - previousGray)
        }
        const motionScore = diffSum / (frame.length / 4) / 255

        if (motionScore > HEAD_MOTION_THRESHOLD) {
          setHeadStatus('moving')
          const now = Date.now()
          if (now - lastHeadViolationAtRef.current > 12000) {
            lastHeadViolationAtRef.current = now
            emitViolation('HEAD_MOVEMENT', 'Head movement detected.', 'MEDIUM')
          }
        } else {
          setHeadStatus('stable')
        }
      }

      previousFrameRef.current = new Uint8ClampedArray(frame)
    }, 1200)
  }, [emitViolation])

  const startMonitoring = useCallback(({ stream, monitorNoise = true, monitorHeadFace = true }) => {
    setRuntimeError(null)
    if (!stream) {
      return
    }

    clearMonitors()
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined)
      audioContextRef.current = null
    }
    analyserRef.current = null
    previousFrameRef.current = null
    faceMissingSinceRef.current = null
    setFaceStatus('unknown')
    setHeadStatus('unknown')
    setAudioStatus('unknown')

    if (monitorNoise) {
      startNoiseMonitor(stream)
    }

    if (monitorHeadFace) {
      startHeadMotionMonitor(stream)
    }
  }, [clearMonitors, startHeadMotionMonitor, startNoiseMonitor])

  const stopMonitoring = useCallback(async () => {
    clearMonitors()

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close()
      } catch (err) {
        console.warn('Failed to close audio context:', err)
      }
      audioContextRef.current = null
    }

    analyserRef.current = null
    previousFrameRef.current = null
    monitorVideoRef.current = null
    monitorCanvasRef.current = null
    faceMissingSinceRef.current = null
    setFaceStatus('unknown')
    setHeadStatus('unknown')
    setAudioStatus('unknown')
  }, [clearMonitors])

  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online')
    const handleOffline = () => setNetworkStatus('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    return () => {
      void stopMonitoring()
      stopRecordingTimer()
    }
  }, [stopMonitoring, stopRecordingTimer])

  return {
    runtimeError,
    recordingDurationSec,
    networkStatus,
    faceStatus,
    headStatus,
    audioStatus,
    startMonitoring,
    stopMonitoring,
    startRecordingTimer,
    stopRecordingTimer
  }
}

export default useProctoringMonitor
