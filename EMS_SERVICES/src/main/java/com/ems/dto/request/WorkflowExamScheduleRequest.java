package com.ems.dto.request;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

public record WorkflowExamScheduleRequest(@NotNull Instant scheduledExamTime) {
}
