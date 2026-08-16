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

        /**
         * The stretch of time in which this booking may be started; both null
         * until the candidate schedules.
         *
         * <p>Sent rather than left to the client to work out from
         * {@code scheduledExamTime}, so the grace either side of the slot is
         * stated in one place. A client that hardcoded its own copy would go on
         * offering a live "Start" after the rule moved, and the candidate would
         * meet the refusal only after clicking it.</p>
         */
        Instant examWindowStart,
        Instant examWindowEnd,

        String remarks,
        boolean canReApply,
        boolean restartRequired,
        String restartMessage) {
}
