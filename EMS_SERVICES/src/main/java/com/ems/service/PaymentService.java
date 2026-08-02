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
}
