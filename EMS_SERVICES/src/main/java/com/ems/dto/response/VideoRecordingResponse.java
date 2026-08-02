package com.ems.dto.response;

import java.time.Instant;

public record VideoRecordingResponse(
        Long recordingId,
        Long sessionId,
        String fileLocation,
        Instant recordingStartTime,
        Instant recordingEndTime,
        Long recordingDurationSeconds) {
}
