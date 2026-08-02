package com.ems.dto.response;

import java.time.Instant;

import com.ems.enums.ProctoringAction;
import com.ems.enums.ViolationType;

public record ViolationResponse(
        Long violationId,
        Long sessionId,
        ViolationType violationType,
        Integer violationLevel,
        String description,
        Instant detectedAt,
        ProctoringAction actionTaken,
        String policyMessage,
        boolean examTerminated) {
}
