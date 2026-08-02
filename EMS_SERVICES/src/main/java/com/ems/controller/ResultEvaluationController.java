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

import com.ems.dto.request.ExamResultSubmissionRequest;
import com.ems.dto.response.ApiResponse;
import com.ems.dto.response.ExamResultResponse;
import com.ems.exception.UnauthorizedException;
import com.ems.service.ResultEvaluationService;
import com.ems.util.CorrelationIdUtil;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/results")
@RequiredArgsConstructor
@Validated
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class ResultEvaluationController {

    private final ResultEvaluationService resultEvaluationService;

    @PostMapping({ "/sessions/{sessionId}/submit", "/sessions/{sessionId}/evaluate" })
    public ResponseEntity<ApiResponse<ExamResultResponse>> submitResult(
            Authentication authentication,
            @PathVariable Long sessionId,
            @Valid @RequestBody ExamResultSubmissionRequest request) {
        String email = requireUser(authentication);
        return ok("Exam submitted and evaluated successfully",
                resultEvaluationService.evaluateResult(email, sessionId, request));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<ExamResultResponse>> getResult(
            Authentication authentication,
            @PathVariable Long sessionId) {
        String email = requireUser(authentication);
        return ok("Result fetched successfully",
                resultEvaluationService.getResult(email, sessionId));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<ExamResultResponse>>> getMyResults(
            Authentication authentication) {
        String email = requireUser(authentication);
        return ok("Results fetched successfully",
                resultEvaluationService.getMyResults(email));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/sessions/{sessionId}/admin")
    public ResponseEntity<ApiResponse<ExamResultResponse>> getResultForAdmin(
            @PathVariable Long sessionId) {
        return ok("Result fetched successfully",
                resultEvaluationService.getResultForAdmin(sessionId));
    }

    private String requireUser(Authentication authentication) {
        if (authentication == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return authentication.getName();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(String message, T data) {
        return ResponseEntity.ok(ApiResponse.success(message, data, CorrelationIdUtil.getOrCreateTraceId()));
    }
}
