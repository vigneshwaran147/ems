package com.ems.controller;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ems.dto.request.PaymentInitiationRequest;
import com.ems.dto.request.PaymentRefundRequest;
import com.ems.dto.request.PaymentVerificationRequest;
import com.ems.dto.response.ApiResponse;
import com.ems.dto.response.PaymentResponse;
import com.ems.exception.UnauthorizedException;
import com.ems.service.PaymentService;
import com.ems.util.CorrelationIdUtil;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Validated
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/applications/{applicationId}/initiate")
    public ResponseEntity<ApiResponse<PaymentResponse>> initiatePayment(
            Authentication authentication,
            @PathVariable Long applicationId,
            @Valid @RequestBody PaymentInitiationRequest request) {
        String email = requireUser(authentication);
        PaymentResponse response = paymentService.initiatePayment(email, applicationId, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Payment initiated successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/{transactionId}/verify")
    public ResponseEntity<ApiResponse<PaymentResponse>> verifyPayment(
            Authentication authentication,
            @PathVariable String transactionId,
            @Valid @RequestBody PaymentVerificationRequest request) {
        String email = requireUser(authentication);
        PaymentResponse response = paymentService.verifyPayment(email, transactionId, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Payment verified successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{transactionId}/refund")
    public ResponseEntity<ApiResponse<PaymentResponse>> refundPayment(
            @PathVariable String transactionId,
            @Valid @RequestBody PaymentRefundRequest request) {
        PaymentResponse response = paymentService.refundPayment(transactionId, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Payment refunded successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getHistory(Authentication authentication) {
        String email = requireUser(authentication);
        List<PaymentResponse> response = paymentService.getPaymentHistory(email);
        return ResponseEntity.ok(ApiResponse.success(
                "Payment history fetched successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    private String requireUser(Authentication authentication) {
        if (authentication == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return authentication.getName();
    }
}

