package com.ems.service.impl;

import java.util.concurrent.CompletableFuture;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.ems.config.AsyncConfig;
import com.ems.dto.request.ViolationRequestDTO;
import com.ems.dto.response.ViolationLogResponse;
import com.ems.service.AiProctorService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Async façade over {@link ViolationStrikeRecorder}.
 *
 * <p>The transactional work lives in a separate bean on purpose, so the async hop
 * completes before any transaction is opened. Exceptions raised by the recorder
 * complete the returned future exceptionally; Spring MVC unwraps them and routes
 * them through the shared {@code GlobalExceptionHandler}, preserving the normal
 * error contract for the client.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class AiProctorServiceImpl implements AiProctorService {

    private final ViolationStrikeRecorder violationStrikeRecorder;

    @Override
    @Async(AsyncConfig.PROCTORING_EXECUTOR)
    public CompletableFuture<ViolationLogResponse> logViolationAsync(String callerEmail, ViolationRequestDTO request) {
        log.debug("Processing proctoring violation asynchronously: caller={} examId={} type={}",
                callerEmail, request.examId(), request.violationType());

        return CompletableFuture.completedFuture(violationStrikeRecorder.record(callerEmail, request));
    }
}
