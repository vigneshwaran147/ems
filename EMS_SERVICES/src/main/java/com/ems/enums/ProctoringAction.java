package com.ems.enums;

public enum ProctoringAction {
    LOGGED,
    WARNING,
    /**
     * Recorded with evidence for an invigilator to adjudicate, without counting
     * toward the strike limit. Used for detections whose confidence does not
     * justify ending an attempt automatically — see
     * {@link ViolationType#countsAsStrike()}.
     */
    FLAGGED_FOR_REVIEW,
    EXAM_TERMINATED
}
