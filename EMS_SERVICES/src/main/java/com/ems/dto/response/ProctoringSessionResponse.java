package com.ems.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.ems.enums.ExamStatus;

public record ProctoringSessionResponse(
        Long sessionId,
        UUID sessionToken,
        String userId,
        String examCode,
        ExamStatus sessionStatus,
        int violationCount,
        String browserFingerprint,
        String ipAddress,
        Instant sessionStartTime,
        Instant sessionEndTime,
        List<ViolationResponse> violations,
        List<VideoRecordingResponse> videoRecordings) {
}
