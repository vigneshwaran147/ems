package com.ems.dto.response;

import java.time.Instant;
import java.time.LocalDate;

import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.CertificationLevel;
import com.ems.enums.PaymentStatus;

public record ExamWorkflowApplicationResponse(
        Long applicationId,
        String userId,
        Long examId,
        String examCode,
        CertificationLevel certificationLevel,
        CertificationApplicationStatus applicationStatus,
        PaymentStatus paymentStatus,
        LocalDate appliedOn,
        Instant scheduledExamTime,
        String remarks,
        boolean canReApply,
        boolean restartRequired,
        String restartMessage) {
}
