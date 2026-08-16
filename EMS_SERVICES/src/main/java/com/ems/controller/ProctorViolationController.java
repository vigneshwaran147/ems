package com.ems.controller;

import java.util.concurrent.CompletableFuture;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ems.dto.request.ViolationRequestDTO;
import com.ems.dto.response.ApiResponse;
import com.ems.dto.response.ViolationLogResponse;
import com.ems.exception.UnauthorizedException;
import com.ems.service.AiProctorService;
import com.ems.util.CorrelationIdUtil;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Ingest endpoint for the browser-side AI proctoring pipeline.
 *
 * <p>Kept separate from {@link ProctoringController} (which serves the
 * invigilator/admin read APIs) because this is a hot, write-only path with very
 * different latency and payload characteristics.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/proctor")
@RequiredArgsConstructor
@Validated
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class ProctorViolationController {

    private final AiProctorService aiProctorService;

    /**
     * Logs a proctoring violation and returns the updated strike state.
     *
     * <p>Returns a {@link CompletableFuture} so the Servlet container releases the
     * request thread while the evidence write happens on the dedicated proctoring
     * pool. The principal is captured here, on the request thread, and passed
     * explicitly downstream rather than being read from a thread-local later.</p>
     */
    @PostMapping("/log-violation")
    public CompletableFuture<ResponseEntity<ApiResponse<ViolationLogResponse>>> logViolation(
            Authentication authentication,
            @Valid @RequestBody ViolationRequestDTO request) {

        String email = requireUser(authentication);
        String traceId = CorrelationIdUtil.getOrCreateTraceId();

        return aiProctorService.logViolationAsync(email, request)
                .thenApply(result -> ResponseEntity.ok(ApiResponse.success(
                        result.isTerminated()
                                ? "Violation recorded. Exam terminated."
                                : "Violation recorded.",
                        result,
                        traceId)));
    }

    private String requireUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Authentication required");
        }
        return authentication.getName();
    }
}
