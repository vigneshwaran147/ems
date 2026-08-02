package com.ems.dto.request;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record RecordingMetadataRequest(
        @NotBlank @Size(max = 4000) String fileLocation,
        @NotNull Instant recordingStartTime,
        Instant recordingEndTime,
        @PositiveOrZero Long recordingDurationSeconds) {
}
