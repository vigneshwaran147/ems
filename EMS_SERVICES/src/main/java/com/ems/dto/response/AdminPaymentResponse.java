package com.ems.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.CertificationLevel;
import com.ems.enums.PaymentStatus;

public record AdminPaymentResponse(
        Long paymentId,
        String transactionId,
        PaymentStatus paymentStatus,
        BigDecimal amount,
        String currency,
        String provider,
        Instant paymentDate,
        String providerReference,
        Long applicationId,
        CertificationApplicationStatus applicationStatus,
        LocalDate appliedOn,
        String userId,
        String candidateName,
        String candidateEmail,
        Long examId,
        String examCode,
        String examName,
        CertificationLevel certificationLevel) {
}
