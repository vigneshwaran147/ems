package com.ems.controller;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ems.dto.response.ApiResponse;
import com.ems.dto.response.CertificateResponse;
import com.ems.dto.response.CertificateVerificationResponse;
import com.ems.exception.UnauthorizedException;
import com.ems.service.CertificateFileContent;
import com.ems.service.CertificateService;
import com.ems.util.CorrelationIdUtil;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
@Validated
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class CertificateController {

    private final CertificateService certificateService;

    @PostMapping("/sessions/{sessionId}/generate")
    public ResponseEntity<ApiResponse<CertificateResponse>> generateForSession(
            Authentication authentication,
            @PathVariable Long sessionId) {
        String email = requireUser(authentication);
        CertificateResponse response = certificateService.generateForSession(email, sessionId);
        return ResponseEntity.ok(ApiResponse.success(
                "Certificate generated successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<CertificateResponse>>> getMyCertificates(
            Authentication authentication) {
        String email = requireUser(authentication);
        List<CertificateResponse> response = certificateService.getMyCertificates(email);
        return ResponseEntity.ok(ApiResponse.success(
                "Certificates fetched successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @GetMapping("/{certificateNumber}")
    public ResponseEntity<ApiResponse<CertificateResponse>> getMyCertificate(
            Authentication authentication,
            @PathVariable String certificateNumber) {
        String email = requireUser(authentication);
        CertificateResponse response = certificateService.getMyCertificate(email, certificateNumber);
        return ResponseEntity.ok(ApiResponse.success(
                "Certificate fetched successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @GetMapping("/{certificateNumber}/download")
    public ResponseEntity<Resource> downloadMyCertificate(
            Authentication authentication,
            @PathVariable String certificateNumber) {
        String email = requireUser(authentication);
        CertificateFileContent content = certificateService.downloadMyCertificate(email, certificateNumber);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, content.contentType())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + content.fileName() + "\"")
                .body(content.resource());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{certificateNumber}/download/admin")
    public ResponseEntity<Resource> downloadCertificateForAdmin(
            @PathVariable String certificateNumber) {
        CertificateFileContent content = certificateService.downloadCertificateForAdmin(certificateNumber);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, content.contentType())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + content.fileName() + "\"")
                .body(content.resource());
    }

    @GetMapping("/verify/{certificateNumber}")
    public ResponseEntity<ApiResponse<CertificateVerificationResponse>> verify(
            @PathVariable String certificateNumber) {
        CertificateVerificationResponse response = certificateService.verify(certificateNumber);
        return ResponseEntity.ok(ApiResponse.success(
                "Certificate verification completed", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @GetMapping("/diagnose/me")
    public ResponseEntity<ApiResponse<Object>> diagnoseMyCertificates(Authentication authentication) {
        String email = requireUser(authentication);
        Object diagnostics = certificateService.diagnoseCertificatesForUser(email);
        return ResponseEntity.ok(ApiResponse.success(
                "Diagnostic information retrieved", diagnostics, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/generate-missing")
    public ResponseEntity<ApiResponse<Object>> generateMissingCertificates(Authentication authentication) {
        String email = requireUser(authentication);
        Object result = certificateService.generateMissingCertificates(email);
        return ResponseEntity.ok(ApiResponse.success(
                "Certificate generation completed", result, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/regenerate-pdfs")
    public ResponseEntity<ApiResponse<Object>> regenerateMissingPdfFiles(Authentication authentication) {
        String email = requireUser(authentication);
        Object result = certificateService.regenerateMissingPdfFiles(email);
        return ResponseEntity.ok(ApiResponse.success(
                "PDF regeneration completed", result, CorrelationIdUtil.getOrCreateTraceId()));
    }

    private String requireUser(Authentication authentication) {
        if (authentication == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return authentication.getName();
    }
}
