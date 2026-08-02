// ems_frontend/src/pages/exam/ExamPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Container, Paper, Grid, Typography, Button, Box, RadioGroup,
  FormControlLabel, Radio, FormGroup, Checkbox, Alert, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, IconButton,
  Tooltip
} from '@mui/material'
import Webcam from 'react-webcam'
import { startExamStart, startExamSuccess, startExamFailure, loadSessionQuestion, endExamSession } from '../../store/slices/examSlice'
import { initializeProctoring, recordViolation, syncViolationCount } from '../../store/slices/proctoringSlice'
import { examAPI } from '../../api/examAPI'
import { proctoringAPI } from '../../api/proctoringAPI'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import PageHeader from '../../components/common/PageHeader'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import WarningIcon from '@mui/icons-material/Warning'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import ScreenShareIcon from '@mui/icons-material/ScreenShare'
import SecurityIcon from '@mui/icons-material/Security'

const ExamPage = () => {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const webcamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const autoTerminateRef = useRef(false)

  const { currentSession, sessionQuestions, isLoading, examInProgress, error: examError } = useSelector((state) => state.exam)
  const { violationCount, isRecording, violations } = useSelector((state) => state.proctoring)
  const { user } = useSelector((state) => state.auth)

  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1)
  const [answers, setAnswers] = useState({})
  const [markedForReview, setMarkedForReview] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [cameraPermission, setCameraPermission] = useState(false)
  const [microphonePermission, setMicrophonePermission] = useState(false)
  const [cameraPermissionState, setCameraPermissionState] = useState('prompt')
  const [microphonePermissionState, setMicrophonePermissionState] = useState('prompt')
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false)
  const [permissionError, setPermissionError] = useState('')
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [testStarted, setTestStarted] = useState(false)
  const [viewedQuestions, setViewedQuestions] = useState(new Set())
  const [showViolationAlert, setShowViolationAlert] = useState(false)
  const [lastViolation, setLastViolation] = useState(null)
  const [showTerminationNotice, setShowTerminationNotice] = useState(false)
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [isSubmittingExam, setIsSubmittingExam] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [screenShareActive, setScreenShareActive] = useState(false)
  const [devToolsOpen, setDevToolsOpen] = useState(false)
  const [blockedActionWarning, setBlockedActionWarning] = useState({ open: false, message: '' })
  const [showFullscreenRecoveryPrompt, setShowFullscreenRecoveryPrompt] = useState(false)

  const audioContextRef = useRef(null)
  const analyzerRef = useRef(null)
  const noiseCheckIntervalRef = useRef(null)
  const screenStreamRef = useRef(null)
  const screenShareCheckIntervalRef = useRef(null)
  const screenShareRetryTimeoutRef = useRef(null)
  const screenShareDeniedRetryTimeoutRef = useRef(null)
  const screenShareGraceRef = useRef(false)
  const fullscreenEnforcementReadyRef = useRef(false)
  const blockedActionToastTsRef = useRef(0)
  const examEndingRef = useRef(false)
  const proctoringWarmupUntilRef = useRef(0)

  const lockEscapeKeyInFullscreen = useCallback(async () => {
    try {
      if (navigator.keyboard?.lock && document.fullscreenElement) {
        await navigator.keyboard.lock(['Escape'])
      }
    } catch (err) {
      console.warn('Escape key lock is unavailable:', err)
    }
  }, [])

  const unlockKeyboardIfNeeded = useCallback(() => {
    try {
      navigator.keyboard?.unlock?.()
    } catch (err) {
      console.warn('Failed to unlock keyboard:', err)
    }
  }, [])

  const requestFullscreenRecovery = useCallback(async () => {
    if (!examInProgress || examSubmitted || examEndingRef.current) {
      return true
    }

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      }
      await lockEscapeKeyInFullscreen()
      setShowFullscreenRecoveryPrompt(false)
      return true
    } catch (err) {
      console.warn('Failed to recover fullscreen mode:', err)
      setShowFullscreenRecoveryPrompt(true)
      return false
    }
  }, [examInProgress, examSubmitted, lockEscapeKeyInFullscreen])

  // Block tab close / refresh while exam is in progress
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (examInProgress && !examSubmitted) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [examInProgress, examSubmitted])

  // Block browser back/forward navigation while exam is in progress.
  useEffect(() => {
    if (!examInProgress || examSubmitted) {
      return
    }
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
      setBlockedActionWarning({
        open: true,
        message: 'Navigation is blocked while exam is in progress.'
      })
    }
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [examInProgress, examSubmitted])

  const refreshPermissionStates = useCallback(async () => {
    if (!navigator.permissions?.query) {
      return
    }
    try {
      const cameraStatus = await navigator.permissions.query({ name: 'camera' })
      const microphoneStatus = await navigator.permissions.query({ name: 'microphone' })
      setCameraPermissionState(cameraStatus.state)
      setMicrophonePermissionState(microphoneStatus.state)
    } catch (err) {
      console.error('Failed to read permission states:', err)
    }
  }, [])

  const detectDeveloperToolsOpen = useCallback(() => {
    const widthGap = globalThis.outerWidth - globalThis.innerWidth
    const heightGap = globalThis.outerHeight - globalThis.innerHeight
    const threshold = 160
    return widthGap > threshold || heightGap > threshold
  }, [])

  const requestPermissions = useCallback(async () => {
    setIsRequestingPermissions(true)
    setPermissionError('')
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      setCameraPermission(true)
      setMicrophonePermission(true)
      setCameraPermissionState('granted')
      setMicrophonePermissionState('granted')
      mediaStream.getTracks().forEach((track) => track.stop())
    } catch (err) {
      setCameraPermission(false)
      setMicrophonePermission(false)
      setPermissionError('Camera and microphone permission is required to start the exam.')
      console.error('Permission denied:', err)
      await refreshPermissionStates()
    } finally {
      setIsRequestingPermissions(false)
    }
  }, [refreshPermissionStates])

  // Ask for proctoring permission every time this exam page is opened.
  useEffect(() => {
    setCameraPermission(false)
    setMicrophonePermission(false)
    setCameraPermissionState('prompt')
    setMicrophonePermissionState('prompt')
    setTestStarted(false)
    refreshPermissionStates()
    requestPermissions()
  }, [applicationId, requestPermissions, refreshPermissionStates])

  useEffect(() => {
    refreshPermissionStates()
    const intervalId = globalThis.setInterval(() => {
      refreshPermissionStates()
    }, 3000)
    return () => globalThis.clearInterval(intervalId)
  }, [refreshPermissionStates])

  useEffect(() => {
    const evaluateDevTools = () => {
      setDevToolsOpen(detectDeveloperToolsOpen())
    }
    evaluateDevTools()
    const intervalId = globalThis.setInterval(evaluateDevTools, 1000)
    return () => globalThis.clearInterval(intervalId)
  }, [detectDeveloperToolsOpen])

  const handleStartExamClicked = async () => {
    if (devToolsOpen || detectDeveloperToolsOpen()) {
      return
    }

    examEndingRef.current = false

    // Request screen share immediately from the click handler to preserve
    // browser user-activation requirements for getDisplayMedia.
    const preflightScreenShare = await requestScreenShare({
      trackViolation: false,
      autoRetry: false
    })
    if (!preflightScreenShare.ok) {
      dispatch(startExamFailure(preflightScreenShare.message))
      return
    }

    const started = await startExam({ skipScreenShareRequest: true })
    setTestStarted(started)
  }

  const startExam = async ({ skipScreenShareRequest = false } = {}) => {
    if (detectDeveloperToolsOpen()) {
      setDevToolsOpen(true)
      dispatch(startExamFailure('Developer tools must be closed before starting the exam.'))
      return false
    }

    dispatch(startExamStart())
    try {
      examEndingRef.current = false
      fullscreenEnforcementReadyRef.current = false
      const response = await examAPI.startExam(applicationId)
      const examData = response.data.data

      // Request screen share FIRST before fullscreen
      if (!skipScreenShareRequest) {
        const screenShareResult = await requestScreenShare({
          trackViolation: false,
          autoRetry: false
        })
        if (!screenShareResult.ok) {
          throw new Error(screenShareResult.message || 'Screen sharing permission is required to start the exam.')
        }
      }

      // Enable fullscreen mode AFTER screen sharing confirmation (exit only on submission)
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
          await lockEscapeKeyInFullscreen()
          console.log('Fullscreen mode enabled')
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err)
      }

      dispatch(startExamSuccess(examData))
      proctoringWarmupUntilRef.current = Date.now() + 10000
      dispatch(initializeProctoring({
        cameraEnabled: cameraPermission,
        microphoneEnabled: microphonePermission
      }))

      setTimeLeft((examData.durationMinutes || 60) * 60) // Convert to seconds

      startVideoRecording()

      // Load first question
      if (examData.firstQuestion) {
        dispatch(loadSessionQuestion({
          number: 1,
          question: examData.firstQuestion
        }))
      }

      return true
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to start exam'
      dispatch(startExamFailure(errorMessage))
      if (errorMessage.includes('Re-apply and complete payment')) {
        navigate('/exams', {
          state: {
            restartMessage: errorMessage,
            fromApplicationId: Number(applicationId)
          }
        })
      }
      return false
    }
  }

  const getScreenShareErrorMessage = (err) => {
    if (!err) {
      return 'Screen sharing permission is required to start the exam.'
    }

    if (err.name === 'NotAllowedError') {
      return 'Screen sharing was blocked. Please allow screen sharing in the browser prompt. On macOS, also enable Screen Recording for your browser in System Settings > Privacy & Security > Screen Recording, then retry.'
    }

    if (err.name === 'AbortError') {
      return 'Screen sharing was cancelled before completion. Please share your full screen and retry.'
    }

    if (err.name === 'NotFoundError') {
      return 'No shareable screen was found. Connect a display and retry.'
    }

    return `Unable to start screen sharing: ${err.message || 'Unknown error'}`
  }

  const startVideoRecording = async () => {
    if (webcamRef.current?.stream) {
      const mediaRecorder = new MediaRecorder(webcamRef.current.stream)
      mediaRecorderRef.current = mediaRecorder
      recordedChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        recordedChunksRef.current.push(event.data)
      }

      mediaRecorder.start()
      console.log('Video recording started for exam proctoring')

      // Initialize noise detection with separate audio stream
      initializeNoiseDetection()
    }
  }

  const initializeNoiseDetection = async () => {
    if (analyzerRef.current) return

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      })
      const audioContext = new (globalThis.AudioContext || globalThis.webkitAudioContext)()
      const analyzer = audioContext.createAnalyser()
      const sourceNode = audioContext.createMediaStreamSource(audioStream)
      sourceNode.connect(analyzer)
      analyzer.fftSize = 256
      analyzer.smoothingTimeConstant = 0.8

      audioContextRef.current = audioContext
      analyzerRef.current = analyzer

      console.log('Noise detection initialized with dedicated audio stream')

      // Check for excessive background noise every 3 seconds
      const noiseCheckInterval = setInterval(() => {
        if (!analyzerRef.current || !examInProgress) return

        const dataArray = new Uint8Array(analyzer.frequencyBinCount)
        analyzer.getByteFrequencyData(dataArray)

        // Calculate average frequency magnitude
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length

        // Check low frequency (bass) for environmental noise
        const lowFreq = dataArray.slice(0, Math.floor(dataArray.length * 0.15))
        const lowFreqAvg = lowFreq.reduce((a, b) => a + b, 0) / lowFreq.length

        // Threshold adjusted: >35 indicates moderate-to-loud background noise
        if (average > 35 || lowFreqAvg > 40) {
          console.warn(`Noise detected - Overall: ${average.toFixed(1)}, LowFreq: ${lowFreqAvg.toFixed(1)}`)
          reportViolationEvent({
            type: 'BACKGROUND_NOISE',
            description: 'Excessive background noise detected during exam',
            severity: 'MEDIUM',
            timestamp: new Date().toISOString()
          })
        }
      }, 3000)

      noiseCheckIntervalRef.current = noiseCheckInterval

      // Store audio stream for cleanup
      audioContextRef.current._audioStream = audioStream
    } catch (err) {
      console.warn('Noise detection setup failed:', err)
    }
  }

  const showBlockedActionWarning = (message) => {
    const now = Date.now()
    if (now - blockedActionToastTsRef.current < 1500) {
      return
    }
    blockedActionToastTsRef.current = now
    setBlockedActionWarning({ open: true, message })
  }

  const isInProctoringWarmup = () => Date.now() < proctoringWarmupUntilRef.current

  const clearScreenShareRetryTimers = () => {
    if (screenShareRetryTimeoutRef.current) {
      clearTimeout(screenShareRetryTimeoutRef.current)
      screenShareRetryTimeoutRef.current = null
    }
    if (screenShareDeniedRetryTimeoutRef.current) {
      clearTimeout(screenShareDeniedRetryTimeoutRef.current)
      screenShareDeniedRetryTimeoutRef.current = null
    }
  }

  const stopScreenShareTracking = () => {
    if (screenShareCheckIntervalRef.current) {
      clearInterval(screenShareCheckIntervalRef.current)
      screenShareCheckIntervalRef.current = null
    }
    clearScreenShareRetryTimers()
  }

  const exitFullscreenSafely = async () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      return
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
        return
      }
    } catch (err) {
      console.warn('Failed to exit fullscreen:', err)
    }

    try {
      if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      }
    } catch (err) {
      console.warn('Failed to exit webkit fullscreen:', err)
    }
  }

  const getPostExamRedirectPath = useCallback(() => {
    const isAdmin = user?.role === 'ADMIN' || user?.roles?.includes('ADMIN')
    return isAdmin ? '/admin/dashboard' : '/dashboard'
  }, [user])

  const mapViolationTypeForApi = useCallback((type) => {
    switch (type) {
      case 'TAB_SWITCH':
        return 'TAB_SWITCH'
      case 'WINDOW_BLUR':
        return 'WINDOW_FOCUS_LOST'
      case 'BACKGROUND_NOISE':
      case 'RESTRICTED_KEY_PRESS':
        return 'BROWSER_MONITORING'
      case 'SCREEN_SHARE_STOPPED':
      case 'SCREEN_SHARE_DENIED':
      case 'FULLSCREEN_EXIT_ATTEMPT':
        return 'SESSION_TAMPERING'
      default:
        return null
    }
  }, [])

  const reportViolationEvent = useCallback((payload) => {
    dispatch(recordViolation(payload))

    const examSessionId = currentSession?.examSessionId
    const apiViolationType = mapViolationTypeForApi(payload.type)
    if (!examSessionId || !apiViolationType) {
      return
    }

    proctoringAPI.reportViolation(examSessionId, {
      violationType: apiViolationType,
      description: payload.description
    }).then((response) => {
      const serverLevel = response?.data?.data?.violationLevel
      if (Number.isInteger(serverLevel)) {
        dispatch(syncViolationCount(serverLevel))
      }
    }).catch((err) => {
      console.error('Failed to persist violation:', err)
    })
  }, [dispatch, currentSession, mapViolationTypeForApi])

  const handleGoBackFromPreStart = () => {
    navigate(getPostExamRedirectPath())
  }

  const preventExamInteractionCopy = (e) => {
    if (!examInProgress) return

    e.preventDefault()

    if (e.type === 'contextmenu') {
      showBlockedActionWarning('Right-click is disabled during the exam.')
      return
    }

    showBlockedActionWarning('Copy and paste actions are disabled during the exam.')
  }

  // Handle browser/tab switching, prevent cheating shortcuts, and block copy actions
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isInProctoringWarmup()) {
        return
      }
      if (document.hidden && examInProgress && screenShareActive && !screenShareGraceRef.current) {
        reportViolationEvent({
          type: 'TAB_SWITCH',
          description: 'User switched to a different browser tab during exam',
          severity: 'HIGH',
          timestamp: new Date().toISOString()
        })
        console.warn('Tab switch detected - exam window blurred')
      }
    }

    const handleBlur = () => {
      if (isInProctoringWarmup()) {
        return
      }
      if (examInProgress && screenShareActive && !screenShareGraceRef.current) {
        reportViolationEvent({
          type: 'WINDOW_BLUR',
          description: 'User minimized exam window or switched to another application',
          severity: 'HIGH',
          timestamp: new Date().toISOString()
        })
        console.warn('Browser window focus lost')
      }
    }

    const handleKeyDown = (e) => {
      if (!examInProgress) return

      const lowerKey = (e.key || '').toLowerCase()
      const isCopyAction = (e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'a', 's', 'u', 'p'].includes(lowerKey)
      const isDevToolsAction = e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(lowerKey))

      // Prevent common cheating shortcuts
      if (
        e.key === 'F11' || // Fullscreen toggle
        (e.ctrlKey && e.key === 'q') || // Close window
        (e.ctrlKey && e.key === 'w') || // Close tab
        (e.ctrlKey && e.key === 't') || // New tab
        (e.ctrlKey && e.key === 'n') || // New window
        (e.altKey && e.key === 'F4') || // Close window (Alt+F4)
        isCopyAction || // Copy/paste/select all/save/view source/print
        isDevToolsAction || // DevTools shortcuts
        e.key === 'Escape' // Escape key
      ) {
        e.preventDefault()
        if (isDevToolsAction) {
          showBlockedActionWarning('Developer tools shortcuts are disabled during the exam.')
        } else if (isCopyAction) {
          showBlockedActionWarning('Copy and paste shortcuts are disabled during the exam.')
        } else {
          showBlockedActionWarning('Restricted keyboard shortcut blocked during the exam.')
        }
        reportViolationEvent({
          type: 'RESTRICTED_KEY_PRESS',
          description: `Restricted key combination detected: ${e.key}`,
          severity: 'LOW',
          timestamp: new Date().toISOString()
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    globalThis.addEventListener('blur', handleBlur)
    globalThis.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('contextmenu', preventExamInteractionCopy)
    document.addEventListener('copy', preventExamInteractionCopy)
    document.addEventListener('cut', preventExamInteractionCopy)
    document.addEventListener('paste', preventExamInteractionCopy)
    document.addEventListener('dragstart', preventExamInteractionCopy)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      globalThis.removeEventListener('blur', handleBlur)
      globalThis.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('contextmenu', preventExamInteractionCopy)
      document.removeEventListener('copy', preventExamInteractionCopy)
      document.removeEventListener('cut', preventExamInteractionCopy)
      document.removeEventListener('paste', preventExamInteractionCopy)
      document.removeEventListener('dragstart', preventExamInteractionCopy)
    }
  }, [examInProgress, screenShareActive, reportViolationEvent]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer countdown
  useEffect(() => {
    if (!examInProgress || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [examInProgress, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-terminate the exam when the candidate reaches 3 violations.
  useEffect(() => {
    if (violationCount >= 3 && examInProgress && !autoTerminateRef.current) {
      autoTerminateRef.current = true
      setShowTerminateDialog(false)
      setShowViolationAlert(false)
      handleAutoTerminateExam()
    }
  }, [violationCount, examInProgress]) // eslint-disable-line react-hooks/exhaustive-deps

  // Monitor fullscreen - user should not exit until submission
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!examInProgress || examSubmitted) {
        return
      }

      if (document.fullscreenElement) {
        // Enable enforcement only after the first confirmed fullscreen entry.
        fullscreenEnforcementReadyRef.current = true
        lockEscapeKeyInFullscreen()
        return
      }

      if (!fullscreenEnforcementReadyRef.current) {
        return
      }

      if (isInProctoringWarmup()) {
        return
      }

      if (!document.fullscreenElement) {
        // User attempted to exit fullscreen, record violation
        reportViolationEvent({
          type: 'FULLSCREEN_EXIT_ATTEMPT',
          description: 'User attempted to exit fullscreen mode during exam',
          severity: 'HIGH',
          timestamp: new Date().toISOString()
        })

        // Re-enable fullscreen mode after violation.
        setTimeout(() => {
          requestFullscreenRecovery()
        }, 0)
      }
    }

    if (examInProgress) {
      document.addEventListener('fullscreenchange', handleFullscreenChange)
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [examInProgress, examSubmitted, reportViolationEvent, lockEscapeKeyInFullscreen, requestFullscreenRecovery])

  // Watch for new violations and show alert
  useEffect(() => {
    if (violations.length > 0) {
      const currentViolation = violations[violations.length - 1]
      if (currentViolation !== lastViolation) {
        setLastViolation(currentViolation)
        if (violationCount < 3) {
          setShowViolationAlert(true)
        } else {
          setShowViolationAlert(false)
        }
      }
    }
  }, [violations, lastViolation])

  const getViolationDetails = (violation) => {
    const details = {
      BACKGROUND_NOISE: {
        title: 'Excessive Background Noise Detected',
        details: 'The proctoring system detected excessive noise from your surroundings.',
        action: 'Please ensure a quiet environment for the remainder of the exam.'
      },
      WINDOW_BLUR: {
        title: 'Window Focus Lost',
        details: 'You minimized the exam window or switched to another application.',
        action: 'Keep the exam window in focus and do not switch to other applications.'
      },
      TAB_SWITCH: {
        title: 'Tab Switch Detected',
        details: 'You switched to a different browser tab while the exam was active.',
        action: 'Keep only this exam tab open and do not switch tabs during the exam.'
      },
      FULLSCREEN_EXIT_ATTEMPT: {
        title: 'Fullscreen Mode Violation',
        details: 'You attempted to exit fullscreen mode during the exam.',
        action: 'The system has automatically re-enabled fullscreen. Please keep the exam in fullscreen mode.'
      },
      SCREEN_SHARE_STOPPED: {
        title: 'Screen Sharing Violation',
        details: 'You attempted to stop screen sharing during the exam.',
        action: 'The system is re-requesting screen sharing permission. Please approve to continue the exam.'
      }
    }
    return details[violation.type] || {
      title: violation.type,
      details: violation.description,
      action: 'Please follow exam guidelines.'
    }
  }

  // Request and maintain screen share throughout exam (user cannot stop it)
  const requestScreenShare = async ({ trackViolation = true, autoRetry = true } = {}) => {
    if (examEndingRef.current) {
      return { ok: false, message: 'Exam is ending. Screen sharing request has been cancelled.' }
    }

    const existingTrack = screenStreamRef.current?.getVideoTracks?.()?.[0]
    if (existingTrack && existingTrack.readyState === 'live') {
      console.log('Screen share already active')
      return { ok: true }
    }

    try {
      stopScreenShareTracking()

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', displaySurface: 'monitor' },
        audio: false
      })
      screenStreamRef.current = screenStream
      // Suppress violation detection briefly while the browser
      // transitions focus back from the OS screen-picker dialog to the exam window
      screenShareGraceRef.current = true
      setTimeout(() => { screenShareGraceRef.current = false }, 2000)
      setScreenShareActive(true)
      console.log('Screen sharing started for exam proctoring - stream maintained')

      // Monitor if user tries to stop screen sharing
      screenShareCheckIntervalRef.current = setInterval(() => {
        if (screenStreamRef.current) {
          const videoTracks = screenStreamRef.current.getVideoTracks()
          if (videoTracks.length === 0 || videoTracks[0].readyState === 'ended') {
            console.warn('Screen share stopped by user - attempting to re-request')
            if (trackViolation) {
              reportViolationEvent({
                type: 'SCREEN_SHARE_STOPPED',
                description: 'User attempted to stop screen sharing during exam',
                severity: 'HIGH',
                timestamp: new Date().toISOString()
              })
            }
            screenStreamRef.current = null
            setScreenShareActive(false)
            // Attempt to re-request screen share after 1 second
            if (autoRetry) {
              screenShareRetryTimeoutRef.current = setTimeout(() => {
                if (!examEndingRef.current && !examSubmitted && examInProgress) {
                  requestScreenShare()
                }
              }, 1000)
            }
          }
        }
      }, 2000)

      return { ok: true }
    } catch (err) {
      setScreenShareActive(false)
      const message = getScreenShareErrorMessage(err)

      if (err.name === 'NotAllowedError') {
        console.warn('Screen sharing permission denied or blocked by system')
        if (trackViolation) {
          reportViolationEvent({
            type: 'SCREEN_SHARE_DENIED',
            description: 'User denied screen sharing permission during exam',
            severity: 'LOW',
            timestamp: new Date().toISOString()
          })
        }
        // Re-attempt screen share if user denied
        if (autoRetry) {
          screenShareDeniedRetryTimeoutRef.current = setTimeout(() => {
            if (!examEndingRef.current && !examSubmitted && examInProgress && !screenStreamRef.current) {
              console.log('Re-attempting screen sharing after denial...')
              requestScreenShare()
            }
          }, 2000)
        }
      } else {
        console.warn('Screen share setup failed:', err.message)
      }
      return { ok: false, message }
    }
  }

  // Cleanup audio context and streams on unmount
  useEffect(() => {
    return () => {
      if (noiseCheckIntervalRef.current) {
        clearInterval(noiseCheckIntervalRef.current)
      }
      if (audioContextRef.current) {
        if (audioContextRef.current._audioStream) {
          audioContextRef.current._audioStream.getTracks().forEach((track) => track.stop())
        }
        audioContextRef.current.close()
      }
      if (screenShareCheckIntervalRef.current) {
        clearInterval(screenShareCheckIntervalRef.current)
      }
      unlockKeyboardIfNeeded()
      clearScreenShareRetryTimers()
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [unlockKeyboardIfNeeded])

  // Mark current question as viewed
  useEffect(() => {
    const currentQ = sessionQuestions[currentQuestionNumber]
    if (currentQ?.questionId) {
      setViewedQuestions((prev) => new Set(prev).add(currentQ.questionId))
    }
  }, [currentQuestionNumber, sessionQuestions])

  // Fetch question on demand
  const loadQuestion = useCallback(async (questionNumber) => {
    if (sessionQuestions[questionNumber]) {
      setCurrentQuestionNumber(questionNumber)
      return
    }
    try {
      const response = await examAPI.getSessionQuestion(
        currentSession.sessionToken,
        questionNumber
      )
      dispatch(loadSessionQuestion({
        number: questionNumber,
        question: response.data.data.question
      }))
      setCurrentQuestionNumber(questionNumber)
    } catch (err) {
      console.error('Failed to load question:', err)
    }
  }, [currentSession, sessionQuestions, dispatch])

  const handleAnswerChange = (questionId, answer, isMultiple = false) => {
    if (isMultiple) {
      const currentAnswers = answers[questionId] || []
      if (currentAnswers.includes(answer)) {
        setAnswers({ ...answers, [questionId]: currentAnswers.filter((a) => a !== answer) })
      } else {
        setAnswers({ ...answers, [questionId]: [...currentAnswers, answer] })
      }
    } else {
      setAnswers({ ...answers, [questionId]: answer })
    }
  }

  const isQuestionAttempted = useCallback((questionId) => {
    const answer = answers[questionId]
    if (Array.isArray(answer)) {
      return answer.length > 0
    }
    return Boolean(answer)
  }, [answers])

  const handleToggleReview = () => {
    if (!currentQuestion?.questionId) {
      return
    }
    const questionId = currentQuestion.questionId
    setMarkedForReview((prev) => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionNumber > 1) {
      loadQuestion(currentQuestionNumber - 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionNumber < (currentSession?.questionCount || 0)) {
      loadQuestion(currentQuestionNumber + 1)
    }
  }

  const handleSubmitExam = async () => {
    if (isSubmittingExam || examSubmitted) {
      return
    }

    if (!currentSession?.examSessionId) {
      setSubmitError('Unable to submit exam: session information is missing. Please refresh and try again.')
      return
    }

    setSubmitError('')
    setIsSubmittingExam(true)

    // Mark exam as submitted to prevent screen share re-request
    examEndingRef.current = true
    setExamSubmitted(true)
    setScreenShareActive(false)
    fullscreenEnforcementReadyRef.current = false

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }

    // Stop screen sharing
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
    }

    // Clear screen share check interval
    stopScreenShareTracking()

    // Exit fullscreen after submission
    await exitFullscreenSafely()
    unlockKeyboardIfNeeded()

    // Backend expects: { answers: [{ questionId, selectedOptions: [...] }] }
    const payload = {
      answers: Object.entries(answers).map(([questionId, value]) => ({
        questionId: Number(questionId),
        selectedOptions: Array.isArray(value) ? value : [value]
      }))
    }

    try {
      await examAPI.submitExam(currentSession.examSessionId, payload)
      setShowTerminateDialog(false)
      dispatch(endExamSession())
      navigate(`/exam/result/${currentSession.examSessionId}`)
    } catch (err) {
      examEndingRef.current = false
      setExamSubmitted(false)
      setSubmitError(err.response?.data?.message || err.message || 'Failed to submit exam. Please try again.')
      console.error('Failed to submit exam:', err)
    } finally {
      setIsSubmittingExam(false)
    }
  }

  const handleAutoTerminateExam = async () => {
    examEndingRef.current = true
    setExamSubmitted(true)
    setScreenShareActive(false)
    fullscreenEnforcementReadyRef.current = false

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
    }

    stopScreenShareTracking()

    await exitFullscreenSafely()
    unlockKeyboardIfNeeded()

    dispatch(endExamSession())
    setShowTerminationNotice(true)
  }

  const handleTerminationAcknowledge = () => {
    navigate('/exams', {
      replace: true,
      state: {
        restartMessage: 'You received 3 proctoring violations. Your exam was terminated and you must re-apply and complete payment from the beginning to take the exam again.'
      }
    })
  }

  if (!cameraPermission || !microphonePermission) {
    const isDenied = cameraPermissionState === 'denied' || microphonePermissionState === 'denied'

    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <PageHeader
          title="Exam Proctoring Setup"
          subtitle="Complete device checks before entering the secure exam environment"
        />

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>Permission Required</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Camera and microphone access are mandatory to continue.
              </Typography>

              {permissionError && (
                <Alert severity="error" sx={{ mb: 2 }}>{permissionError}</Alert>
              )}

              {isDenied && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Browser permission is currently blocked.</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>Please allow Camera and Microphone in browser site settings for this page.</Typography>
                  <Typography variant="body2">After allowing access, click Retry to continue the exam.</Typography>
                </Alert>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">Camera: {cameraPermissionState}</Typography>
                <Typography variant="body2" color="textSecondary">Microphone: {microphonePermissionState}</Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Tooltip title="Camera access required">
                  <IconButton size="small" color={cameraPermission ? 'primary' : 'error'}>
                    {cameraPermission ? <VideocamIcon /> : <VideocamOffIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Microphone access required">
                  <IconButton size="small" color={microphonePermission ? 'primary' : 'error'}>
                    {microphonePermission ? <MicIcon /> : <MicOffIcon />}
                  </IconButton>
                </Tooltip>
              </Box>

              <Button variant="contained" onClick={requestPermissions} disabled={isRequestingPermissions} fullWidth>
                {isRequestingPermissions ? 'Requesting Permission...' : 'Retry Camera & Microphone Access'}
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>Security Checklist</Typography>
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VideocamIcon color={cameraPermission ? 'success' : 'disabled'} fontSize="small" />
                  <Typography variant="body2">Camera ready</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MicIcon color={microphonePermission ? 'success' : 'disabled'} fontSize="small" />
                  <Typography variant="body2">Microphone ready</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScreenShareIcon fontSize="small" color="action" />
                  <Typography variant="body2">Screen sharing will be requested before start</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FullscreenIcon fontSize="small" color="action" />
                  <Typography variant="body2">Exam runs in locked fullscreen mode</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon fontSize="small" color="action" />
                  <Typography variant="body2">Proctoring violations are monitored continuously</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    )
  }

  // Render pre-start screen before exam starts
  if (!testStarted) {
    const setupFlow = [
      {
        key: 'permissions',
        label: 'Permissions',
        helper: cameraPermission && microphonePermission ? 'Ready' : 'Pending',
        done: cameraPermission && microphonePermission
      },
      {
        key: 'security',
        label: 'Security Check',
        helper: devToolsOpen ? 'Action Required' : 'Ready',
        done: !devToolsOpen
      },
      {
        key: 'start',
        label: 'Start Exam',
        helper: 'Launch',
        done: false
      }
    ]

    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <PageHeader
          title="Preparing Exam Environment"
          subtitle="Final checks before entering your secure exam session"
        />

        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={1.5}>
            {setupFlow.map((step, index) => {
              const isCurrent = !step.done && setupFlow.slice(0, index).every((item) => item.done)
              return (
                <Grid item xs={12} sm={4} key={step.key}>
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: step.done ? 'success.light' : (isCurrent ? 'primary.light' : 'divider'),
                      backgroundColor: step.done ? 'rgba(46, 125, 50, 0.08)' : (isCurrent ? 'rgba(25, 118, 210, 0.08)' : 'background.paper')
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">Step {index + 1}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{step.label}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: step.done ? 'success.main' : (isCurrent ? 'primary.main' : 'text.secondary'),
                        fontWeight: 600
                      }}
                    >
                      {step.helper}
                    </Typography>
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>Exam Readiness</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Do not switch tabs, minimize the window, or use restricted keyboard shortcuts once the exam starts.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Tooltip title="Camera is active">
                  <IconButton size="small" color="success"><VideocamIcon /></IconButton>
                </Tooltip>
                <Tooltip title="Microphone is active">
                  <IconButton size="small" color="success"><MicIcon /></IconButton>
                </Tooltip>
              </Box>

              <Alert severity="success" sx={{ mb: 2 }}>
                Camera and microphone checks passed. You can start the exam once you are ready.
              </Alert>

              {devToolsOpen && (
                <Alert severity="error" sx={{ mb: 2 }}>Developer tools are open. Close developer tools to start the exam.</Alert>
              )}

              {!devToolsOpen && examError && (
                <Alert severity="warning" sx={{ mb: 2 }}>{examError}</Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  fullWidth
                  size="large"
                  onClick={handleGoBackFromPreStart}
                  disabled={isLoading}
                >
                  Go Back
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleStartExamClicked}
                  disabled={devToolsOpen || isLoading}
                >
                  {isLoading ? 'Loading...' : 'Start Exam Now'}
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>Session Requirements</Typography>
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScreenShareIcon fontSize="small" color="action" />
                  <Typography variant="body2">Share your full screen when prompted</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FullscreenIcon fontSize="small" color="action" />
                  <Typography variant="body2">Stay in fullscreen throughout the exam</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon fontSize="small" color="warning" />
                  <Typography variant="body2">3 violations will terminate the attempt</Typography>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    Keep your environment quiet and avoid switching applications.
                  </Alert>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    )
  }

  if (isLoading) {
    return <LoadingSpinner open={true} />
  }

  const currentQuestion = sessionQuestions[currentQuestionNumber]
  const questionNumbers = Array.from({ length: currentSession?.questionCount || 0 }, (_, i) => i + 1)
  const attemptedQuestionNumbers = questionNumbers.filter((num) => {
    const questionId = sessionQuestions[num]?.questionId
    return questionId ? isQuestionAttempted(questionId) : false
  })
  const reviewedQuestionNumbers = questionNumbers.filter((num) => {
    const questionId = sessionQuestions[num]?.questionId
    return questionId ? Boolean(markedForReview[questionId]) : false
  })
  const viewedCount = viewedQuestions.size

  const getQuestionStatus = (num) => {
    const questionId = sessionQuestions[num]?.questionId
    if (!questionId) {
      return 'unanswered'
    }
    if (markedForReview[questionId]) {
      return 'review'
    }
    if (isQuestionAttempted(questionId)) {
      return 'attempted'
    }
    return 'unanswered'
  }

  return (
    <Container maxWidth="xl" sx={{ p: 0, px: { sm: '8px' } }}>
      <Grid container spacing={1} sx={{p: 2}}>
        {/* Left: Question Panel */}
        <Grid item xs={12} md={8} lg={9} >
          <Paper sx={{ p: 1, mb: 1 }}>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6"> Question {currentQuestionNumber} of {currentSession?.questionCount} </Typography>
              </Grid>
              <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Typography variant="h6" color={timeLeft < 300 ? 'error' : 'inherit'}>
                  Time: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <LinearProgress variant="determinate" value={(currentQuestionNumber / currentSession?.questionCount) * 100} />
              </Grid>
            </Grid>
          </Paper>

          {currentQuestion && (
            <Paper sx={{ p: 1.25, mb: 1, minHeight: { md: 360 } }}>
              <Typography variant="h6" gutterBottom>
                {currentQuestion.questionText}
              </Typography>

              <Box sx={{ my: 1.5 }}>
                {currentQuestion.questionType === 'SINGLE_CHOICE' ? (
                  <RadioGroup
                    value={answers[currentQuestion.questionId] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.questionId, e.target.value)}
                  >
                    {currentQuestion.options.map((option, idx) => (
                      <FormControlLabel key={idx} value={option} control={<Radio />} label={option} />
                    ))}
                  </RadioGroup>
                ) : (
                  <FormGroup>
                    {currentQuestion.options.map((option, idx) => (
                      <FormControlLabel
                        key={idx}
                        control={
                          <Checkbox
                            checked={(answers[currentQuestion.questionId] || []).includes(option)}
                            onChange={() => handleAnswerChange(currentQuestion.questionId, option, true)}
                          />
                        }
                        label={option}
                      />
                    ))}
                  </FormGroup>
                )}
              </Box>
            </Paper>
          )}

          <Paper sx={{ p: 1 }}>
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                Viewed: {viewedCount}/{currentSession?.questionCount || 0} questions
              </Typography>
              {viewedCount < (currentSession?.questionCount || 0) && (
                <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 500 }}>⚠ Not all questions viewed</Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={handlePreviousQuestion} disabled={currentQuestionNumber === 1}> Previous</Button>
                <Button variant="outlined" onClick={handleNextQuestion} disabled={currentQuestionNumber === (currentSession?.questionCount || 0)}> Next </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={currentQuestion?.questionId && markedForReview[currentQuestion.questionId] ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={handleToggleReview}
                  disabled={!currentQuestion}
                >
                  {currentQuestion?.questionId && markedForReview[currentQuestion.questionId] ? 'Marked for Review' : 'Mark for Review'}
                </Button>
                <Button variant="contained" color="success" onClick={() => setShowTerminateDialog(true)}>Submit Exam</Button>
              </Box>
              
            </Box>
          </Paper>
        </Grid>

        {/* Right: Top navigation + Bottom proctoring */}
        <Grid item xs={12} md={4} lg={3}>
          <Grid container spacing={0.75} sx={{ position: { md: 'sticky' }, top: { md: 12 } }}>
            <Grid item xs={12}>
              <Paper sx={{ p: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 0.75, fontWeight: 700 }}>
                  Question Navigator
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.25, mb: 0.75, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                  {questionNumbers.map((num) => {
                    const status = getQuestionStatus(num)
                    const isCurrent = currentQuestionNumber === num
                    const borderColor = status === 'review' ? '#f59e0b' : status === 'attempted' ? '#16a34a' : undefined
                    const textColor = isCurrent ? '#ffffff' : status === 'review' ? '#d45309' : status === 'attempted' ? '#166534' : undefined
                    const bgColor = isCurrent ? '#1565c0' : status === 'review' ? '#fffbeb' : status === 'attempted' ? '#f0fdf4' : undefined
                    const hoverBgColor = isCurrent ? '#1a6d7a' : status === 'review' ? '#fef3c7' : status === 'attempted' ? '#dcfce7' : undefined
                    const hoverBorderColor = status === 'review' ? '#d97706' : status === 'attempted' ? '#15803d' : undefined

                    return (
                      <Button
                        key={num}
                        variant={isCurrent ? 'contained' : 'outlined'}
                        onClick={() => loadQuestion(num)}
                        sx={{
                          minWidth: 32, width: 32, height: 32, p: 0,
                          borderRadius: '50%', fontSize: '0.72rem',
                          lineHeight: 1, borderColor, color: textColor,
                          bgcolor: bgColor,
                          '&:hover': { bgcolor: hoverBgColor, borderColor: hoverBorderColor }
                        }}
                      >
                        {num}
                      </Button>
                    )
                  })}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Typography variant="caption">Attempted: {attemptedQuestionNumbers.length}</Typography>
                  <Typography variant="caption">Review: {reviewedQuestionNumbers.length}</Typography>
                  <Typography variant="caption">Unanswered: {(currentSession?.questionCount || 0) - attemptedQuestionNumbers.length}</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pt: 0.75, borderTop: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#1565c0', borderRadius: '50%' }} />
                    <Typography variant="caption">Current</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#f0fdf4', border: '1px solid #16a34a', borderRadius: '50%' }} />
                    <Typography variant="caption">Attempted</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '50%' }} />
                    <Typography variant="caption">Review</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 0.75, fontWeight: 700 }}>
                  Video Proctoring
                </Typography>

                {cameraPermission ? (
                  <Box sx={{ mb: 1 }}>
                    <Webcam
                      ref={webcamRef}
                      audio={true}
                      videoConstraints={{ width: 300, height: 300 }}
                      screenshotFormat="image/jpeg"
                      style={{ width: '100%', borderRadius: '8px' }}
                    />
                  </Box>
                ) : (
                  <Alert severity="error" sx={{ mb: 1.25 }}>Camera access denied</Alert>
                )}

                <Box sx={{ display: 'flex', gap: 1, mb: 1.25 }}>
                  <Tooltip title="Camera">
                    <IconButton size="small" color={cameraPermission ? 'primary' : 'error'}>
                      {cameraPermission ? <VideocamIcon /> : <VideocamOffIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Microphone">
                    <IconButton size="small" color={microphonePermission ? 'primary' : 'error'}>
                      {microphonePermission ? <MicIcon /> : <MicOffIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>

                {violationCount > 0 && (
                  <Alert severity={violationCount >= 3 ? 'error' : 'warning'} sx={{ mb: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon fontSize="small" />
                      <Typography variant="body2">
                        Violations: {violationCount}/3{' '}
                        {violationCount === 1 && '(1 more warning)'}
                        {violationCount === 2 && '(Final warning)'}
                      </Typography>
                    </Box>
                  </Alert>
                )}

                <Box sx={{ maxHeight: 120, overflow: 'auto' }}>
                  {violations.map((v, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, p: 1, bgcolor: '#fff3cd', borderRadius: 1 }}>
                      <Typography variant="caption" display="block">{v.type}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Violation Alert Dialog */}
      <Dialog open={showViolationAlert} onClose={() => setShowViolationAlert(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#fef3c7', fontWeight: 700 }}>
          Proctoring Violation Detected
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {lastViolation && (() => {
            const violationInfo = getViolationDetails(lastViolation)
            return (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#d97706' }}>
                  {violationInfo.title}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {violationInfo.details}
                </Typography>
                <Box sx={{ bgcolor: '#efffeb', p: 1.5, borderRadius: 1, mb: 2, border: '1px solid #fcd34d' }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>⬛ Violation Details</Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#6b7280', mb: 0.5 }}><strong>Type:</strong> {lastViolation.type}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#6b7280', mb: 0.5 }}><strong>Time:</strong> {new Date(lastViolation.timestamp).toLocaleTimeString()}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#6b7280', mb: 0.5 }}><strong>Severity:</strong> {lastViolation.severity || 'MEDIUM'}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#6b7280' }}><strong>Violations:</strong> {violationCount}/3</Typography>
                </Box>
                <Box sx={{ bgcolor: '#faf5ff', p: 1.5, borderRadius: 1, mb: 2, border: '1px solid #f3e8ff' }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>✓ What you should do:</Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#6b7280' }}>
                    {violationInfo.action}
                  </Typography>
                </Box>
                {violationCount === 1 && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    <strong>First Warning:</strong> You have 2 more violation(s) before your exam is automatically submitted.
                  </Alert>
                )}
                {violationCount === 2 && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    <strong>⚠ FINAL WARNING:</strong> This is your second violation. One more violation will immediately auto-submit your exam. Please be more careful.
                  </Alert>
                )}
              </Box>
            )
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowViolationAlert(false)} variant="contained" fullWidth>
            Continue Exam
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showTerminationNotice} maxWidth="sm" fullWidth disableEscapeKeyDown>
        <DialogTitle sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
          Exam Terminated After 3 Violations
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Your exam has been terminated due to repeated policy violations.
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Enforcement actions completed in order:
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>1. Screen sharing was stopped.</Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>2. Fullscreen mode was exited.</Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>3. This attempt was closed and marked for restart.</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            To continue, re-apply for the examination and complete payment again from the beginning.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleTerminationAcknowledge} variant="contained" color="error" fullWidth>
            Go to Exam Applications
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showFullscreenRecoveryPrompt} maxWidth="xs" fullWidth disableEscapeKeyDown>
        <DialogTitle sx={{ fontWeight: 700 }}>Fullscreen Required</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Fullscreen mode is required during the exam. You cannot continue outside fullscreen.
          </Alert>
          <Typography variant="body2">
            Click the button below to return to fullscreen mode and continue.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={requestFullscreenRecovery}
          >
            Return to Fullscreen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showTerminateDialog} onClose={() => setShowTerminateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Exam</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to submit the exam? You cannot change your answers after submission.
          </Typography>
          {viewedCount < (currentSession?.questionCount || 0) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You have not viewed all questions ({viewedCount}/{currentSession?.questionCount || 0}). Consider reviewing the remaining questions before submitting.
            </Alert>
          )}
          <Typography variant="body2" sx={{ mb: 1 }}>Viewed: {viewedCount} / {currentSession?.questionCount || 0}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>Attempted: {attemptedQuestionNumbers.length} / {currentSession?.questionCount || 0}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>Attempted Question Numbers:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {attemptedQuestionNumbers.length > 0 ? (
              attemptedQuestionNumbers.map((num) => (
                <Box
                  key={num}
                  sx={{ px: 1.25, py: 0.5, borderRadius: 1, bgcolor: '#f0fdf4', color: '#166534', border: '1px solid #16a34a', fontSize: 13, fontWeight: 600 }}
                >
                  Q{num}
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">No questions attempted yet.</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTerminateDialog(false)} disabled={isSubmittingExam}>Cancel</Button>
          <Button onClick={handleSubmitExam} variant="contained" color="success" disabled={isSubmittingExam}>
            {isSubmittingExam ? 'Submitting...' : 'Confirm Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={blockedActionWarning.open}
        autoHideDuration={2200}
        onClose={() => setBlockedActionWarning({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setBlockedActionWarning({ open: false, message: '' })}
          severity="warning"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {blockedActionWarning.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default ExamPage
