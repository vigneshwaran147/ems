package com.ems.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ExamDurationUpdateRequest(@NotNull @Positive Integer durationMinutes) {
}
