export const PROCTORING_MODES = {
  STRICT: 'STRICT',
  STANDARD: 'STANDARD',
  VIDEO_ONLY: 'VIDEO_ONLY',
  LIGHT: 'LIGHT'
}

export const PROCTORING_MODE_OPTIONS = [
  {
    value: PROCTORING_MODES.STRICT,
    label: 'Strict',
    description: 'Camera + mic + screen share + fullscreen + key/navigation restrictions + noise monitoring'
  },
  {
    value: PROCTORING_MODES.STANDARD,
    label: 'Standard',
    description: 'Camera + mic + screen share + fullscreen with moderate restriction checks'
  },
  {
    value: PROCTORING_MODES.VIDEO_ONLY,
    label: 'Video Only',
    description: 'Camera/mic recording only. No screen-share or fullscreen enforcement.'
  },
  {
    value: PROCTORING_MODES.LIGHT,
    label: 'Light',
    description: 'Camera only visibility with minimal exam interruption checks'
  }
]

const POLICY_BY_MODE = {
  [PROCTORING_MODES.STRICT]: {
    requireCamera: true,
    requireMicrophone: true,
    requireScreenShare: true,
    requireFullscreen: true,
    monitorNoise: true,
    monitorNavigationLoss: true,
    blockRestrictedShortcuts: true,
    blockCopyActions: true,
    trackViolationsToServer: true
  },
  [PROCTORING_MODES.STANDARD]: {
    requireCamera: true,
    requireMicrophone: true,
    requireScreenShare: true,
    requireFullscreen: true,
    monitorNoise: false,
    monitorNavigationLoss: true,
    blockRestrictedShortcuts: true,
    blockCopyActions: true,
    trackViolationsToServer: true
  },
  [PROCTORING_MODES.VIDEO_ONLY]: {
    requireCamera: true,
    requireMicrophone: true,
    requireScreenShare: false,
    requireFullscreen: false,
    monitorNoise: false,
    monitorNavigationLoss: false,
    blockRestrictedShortcuts: false,
    blockCopyActions: false,
    trackViolationsToServer: true
  },
  [PROCTORING_MODES.LIGHT]: {
    requireCamera: true,
    requireMicrophone: false,
    requireScreenShare: false,
    requireFullscreen: false,
    monitorNoise: false,
    monitorNavigationLoss: false,
    blockRestrictedShortcuts: false,
    blockCopyActions: false,
    trackViolationsToServer: false
  }
}

export const normalizeProctoringMode = (value) => {
  if (!value || typeof value !== 'string') {
    return PROCTORING_MODES.STRICT
  }
  const normalized = value.trim().toUpperCase().replace(/[-\s]/g, '_')
  return POLICY_BY_MODE[normalized] ? normalized : PROCTORING_MODES.STRICT
}

export const getProctoringPolicy = (mode) => {
  const normalizedMode = normalizeProctoringMode(mode)
  return {
    mode: normalizedMode,
    ...POLICY_BY_MODE[normalizedMode]
  }
}
