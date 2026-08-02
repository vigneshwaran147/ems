package com.ems.controller;

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

import com.ems.dto.request.CertificationApplicationRequest;
import com.ems.dto.request.CertificationCompletionRequest;
import com.ems.dto.response.ApiResponse;
import com.ems.dto.response.CertificationApplicationResponse;
import com.ems.dto.response.CertificationEligibilityResponse;
import com.ems.dto.response.CertificationJourneyHistoryResponse;
import com.ems.enums.CertificationLevel;
import com.ems.exception.UnauthorizedException;
import com.ems.service.CertificationJourneyService;
import com.ems.util.CorrelationIdUtil;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/certifications")
@RequiredArgsConstructor
@Validated
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class CertificationController {

    private final CertificationJourneyService certificationJourneyService;

    @GetMapping("/eligibility/{level}")
    public ResponseEntity<ApiResponse<CertificationEligibilityResponse>> getEligibility(
            Authentication authentication,
            @PathVariable CertificationLevel level) {
        if (authentication == null) {
            throw new UnauthorizedException("Authentication required");
        }
        CertificationEligibilityResponse response =
                certificationJourneyService.getEligibility(authentication.getName(), level);
        return ResponseEntity.ok(ApiResponse.success(
                "Eligibility fetched successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/applications")
    public ResponseEntity<ApiResponse<CertificationApplicationResponse>> apply(
            Authentication authentication,
            @Valid @RequestBody CertificationApplicationRequest request) {
        if (authentication == null) {
            throw new UnauthorizedException("Authentication required");
        }
        CertificationApplicationResponse response =
                certificationJourneyService.apply(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success(
                "Certification application submitted successfully", response,
                CorrelationIdUtil.getOrCreateTraceId()));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<CertificationJourneyHistoryResponse>> getHistory(
            Authentication authentication) {
        if (authentication == null) {
            throw new UnauthorizedException("Authentication required");
        }
        CertificationJourneyHistoryResponse response =
                certificationJourneyService.getHistory(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(
                "Certification history fetched successfully", response,
                CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/applications/{applicationId}/complete")
    public ResponseEntity<ApiResponse<CertificationApplicationResponse>> completeApplication(
            @PathVariable Long applicationId,
            @Valid @RequestBody CertificationCompletionRequest request) {
        CertificationApplicationResponse response =
                certificationJourneyService.completeApplication(applicationId, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Certification application completed successfully", response,
                CorrelationIdUtil.getOrCreateTraceId()));
    }
}
