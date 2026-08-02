package com.ems.dto.response;

import com.ems.enums.ExamStatus;
import com.ems.enums.ViolationType;

public record ViolationSummaryResponse(
        Long sessionId,
        int totalViolations,
        int warningCount,
        boolean examTerminated,
        ExamStatus sessionStatus,
        ViolationType lastViolationType,
        String lastActionMessage) {
}
