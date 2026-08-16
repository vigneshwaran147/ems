package com.ems.dto.response;

import java.time.Instant;

import com.ems.enums.ProctoringAction;
import com.ems.enums.ViolationType;

/**
 * Result of a single {@code /api/proctor/log-violation} write.
 *
 * <p>{@code strikeCount} is the authoritative post-increment value read back under
 * the same row lock that produced it, so the client can reconcile its optimistic
 * local counter. {@code isTerminated} is the explicit server verdict: the client
 * must switch to the lockout view when it is {@code true}, regardless of what its
 * own counter says.</p>
 */
public record ViolationLogResponse(
        Long violationId,
        Long sessionId,
        ViolationType violationType,
        int strikeCount,
        int strikeLimit,
        int strikesRemaining,
        boolean isTerminated,
        ProctoringAction actionTaken,
        boolean evidenceStored,
        Long evidenceId,
        Instant detectedAt,
        String policyMessage) {
}
