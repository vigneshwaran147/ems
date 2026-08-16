package com.ems.service;

import java.util.concurrent.CompletableFuture;

import com.ems.dto.request.ViolationRequestDTO;
import com.ems.dto.response.ViolationLogResponse;

/**
 * Write path for the client-side AI proctoring pipeline.
 *
 * <p>Distinct from {@link ProctoringService}, which serves the invigilator/admin
 * read APIs. Both ultimately mutate the same authoritative strike counter on
 * {@code exam_sessions.violation_count}.</p>
 */
public interface AiProctorService {

    /**
     * Records a violation, atomically increments the session strike count and
     * decides whether the attempt is terminated.
     *
     * @param callerEmail authenticated principal, used to resolve and authorise the session
     * @param request     violation payload emitted by the browser
     * @return the post-increment strike state; never {@code null}
     */
    CompletableFuture<ViolationLogResponse> logViolationAsync(String callerEmail, ViolationRequestDTO request);
}
