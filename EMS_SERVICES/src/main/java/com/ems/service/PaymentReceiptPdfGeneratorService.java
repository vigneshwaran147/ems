package com.ems.service;

import java.math.BigDecimal;
import java.time.Instant;

import com.ems.enums.PaymentStatus;

public interface PaymentReceiptPdfGeneratorService {

    byte[] generateReceiptPdf(PaymentReceiptData data);

    /**
     * Everything printed on a receipt.
     *
     * <p>Assembled from the persisted payment row by the service layer — no part
     * of it is supplied by the caller, so a client cannot influence what a
     * receipt says was paid, by whom, or for how much.
     */
    record PaymentReceiptData(
            String transactionId,
            String payerName,
            String userId,
            String email,
            String description,
            BigDecimal amount,
            String currency,
            String provider,
            String providerReference,
            PaymentStatus paymentStatus,
            Instant paymentDate) {
    }
}
