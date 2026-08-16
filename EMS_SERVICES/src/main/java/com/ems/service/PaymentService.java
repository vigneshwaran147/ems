package com.ems.service;

import java.util.List;

import com.ems.dto.request.PaymentInitiationRequest;
import com.ems.dto.request.PaymentRefundRequest;
import com.ems.dto.request.PaymentVerificationRequest;
import com.ems.dto.response.PaymentResponse;

public interface PaymentService {

    PaymentResponse initiatePayment(String email, Long applicationId, PaymentInitiationRequest request);

    PaymentResponse verifyPayment(String email, String transactionId, PaymentVerificationRequest request);

    PaymentResponse refundPayment(String transactionId, PaymentRefundRequest request);

    List<PaymentResponse> getPaymentHistory(String email);

    /**
     * Renders the caller's own receipt for {@code transactionId}.
     *
     * <p>Scoped to the authenticated payer: a transaction id belonging to
     * someone else reads as not found rather than as a permission error, so the
     * endpoint cannot be used to probe which ids exist.
     */
    PaymentReceiptContent downloadReceipt(String email, String transactionId);
}
