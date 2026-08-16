package com.ems.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

import com.ems.enums.PaymentStatus;

public record PaymentResponse(
        Long paymentId,
        String transactionId,
        Long applicationId,
        Long examId,
        // What the payer was charged for, composed server-side so every client
        // renders the same wording on statements and receipts.
        String description,
        BigDecimal amount,
        String currency,
        String provider,
        PaymentStatus paymentStatus,
        Instant paymentDate,
        String providerReference,
        String redirectUrl,
        String qrCodePayload) {
}
