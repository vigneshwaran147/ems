package com.ems.dto.response;

import java.time.Instant;

import com.ems.enums.CertificationLevel;
import com.ems.enums.ExamStatus;
import com.ems.enums.ProctoringAction;
import com.ems.enums.ViolationType;

public record AdminViolationResponse(
        Long violationId,
        Long sessionId,
        Long applicationId,
        String userId,
        String candidateName,
        String candidateEmail,
        Long examId,
        String examCode,
        String examName,
        CertificationLevel certificationLevel,
        ExamStatus sessionStatus,
        ViolationType violationType,
        Integer violationLevel,
        String description,
        Instant detectedAt,
        ProctoringAction actionTaken,
        String policyMessage,
        boolean examTerminated) {
}
