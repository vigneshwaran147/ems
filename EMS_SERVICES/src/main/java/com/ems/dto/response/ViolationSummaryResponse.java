package com.ems.dto.response;

import com.ems.enums.ExamStatus;
import com.ems.enums.ViolationType;

/**
 * Where a session stands, as the server sees it.
 *
 * <p>Doubles as the exam client's heartbeat payload, which is why
 * {@code strikeCount} is here at all: it is the same authoritative number the
 * write path returns, republished every few seconds so a client that missed a
 * write's reply — or that has just been reloaded — converges on the truth
 * instead of running on whatever it last heard. {@code examTerminated} is the
 * verdict; a client seeing it must stop the attempt whatever its own count
 * says.</p>
 *
 * <p>{@code totalViolations} counts every detection ever recorded for the
 * session, including the ones that cost nothing. It is a log length, not a
 * sanction — do not drive termination from it.</p>
 */
public record ViolationSummaryResponse(
        Long sessionId,
        int totalViolations,
        int warningCount,
        int strikeCount,
        int strikeLimit,
        boolean examTerminated,
        ExamStatus sessionStatus,
        ViolationType lastViolationType,
        String lastActionMessage) {
}
