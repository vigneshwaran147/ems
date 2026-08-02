package com.ems.dto.request;

import java.time.Instant;
import java.util.List;

import com.ems.enums.QuestionSeverity;

public record ExamStartRequest(
        List<QuestionSeverity> severities,
        Boolean acknowledgeViolationPolicy,
        Instant acknowledgedAt) {
}
