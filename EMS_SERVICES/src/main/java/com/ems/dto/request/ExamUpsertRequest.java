package com.ems.dto.request;

import java.math.BigDecimal;

import com.ems.enums.CertificationLevel;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ExamUpsertRequest(
        @NotBlank @Size(max = 50) String examCode,
        @NotBlank @Size(max = 255) String examName,
        @NotNull CertificationLevel certificationLevel,
        @NotNull @Positive Integer durationMinutes,
        @NotNull @DecimalMin("0.0") BigDecimal totalMarks,
        @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal passingPercentage) {
}
