package com.ems.dto.request;

import com.ems.enums.ViolationType;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ViolationReportRequest(
        @NotNull ViolationType violationType,
        @Size(max = 4000) String description) {
}
