import { PROCTORING_MODES, getProctoringPolicy } from '../components/exam/proctoring/proctoringProfiles'

// Developer-only config. Candidates cannot change this from the exam UI.
// Update these values during development/deployment as required.
export const PROCTORING_DEVELOPER_CONFIG = {
  mode: PROCTORING_MODES.STRICT,
  violationSwitches: {
    TAB_SWITCH: true,
    WINDOW_BLUR: true,
    BACKGROUND_NOISE: true,
    RESTRICTED_KEY_PRESS: true,
    SCREEN_SHARE_STOPPED: true,
    SCREEN_SHARE_DENIED: true,
    FULLSCREEN_EXIT_ATTEMPT: true
  }
}

export const getDeveloperProctoringPolicy = () => {
  const base = getProctoringPolicy(PROCTORING_DEVELOPER_CONFIG.mode)

  return {
    ...base,
    monitorNoise: base.monitorNoise && PROCTORING_DEVELOPER_CONFIG.violationSwitches.BACKGROUND_NOISE,
    monitorNavigationLoss:
      base.monitorNavigationLoss &&
      (PROCTORING_DEVELOPER_CONFIG.violationSwitches.TAB_SWITCH ||
        PROCTORING_DEVELOPER_CONFIG.violationSwitches.WINDOW_BLUR),
    blockRestrictedShortcuts:
      base.blockRestrictedShortcuts && PROCTORING_DEVELOPER_CONFIG.violationSwitches.RESTRICTED_KEY_PRESS,
    requireScreenShare:
      base.requireScreenShare &&
      (PROCTORING_DEVELOPER_CONFIG.violationSwitches.SCREEN_SHARE_STOPPED ||
        PROCTORING_DEVELOPER_CONFIG.violationSwitches.SCREEN_SHARE_DENIED),
    requireFullscreen:
      base.requireFullscreen && PROCTORING_DEVELOPER_CONFIG.violationSwitches.FULLSCREEN_EXIT_ATTEMPT
  }
}

export const isViolationEnabled = (type) => PROCTORING_DEVELOPER_CONFIG.violationSwitches[type] !== false
