package com.ems.dto.request;

import java.math.BigDecimal;
import java.util.List;

import com.ems.enums.CertificationLevel;
import com.ems.enums.QuestionCategory;
import com.ems.enums.QuestionSeverity;
import com.ems.enums.QuestionType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record QuestionUpsertRequest(
        @NotBlank @Size(max = 50) String questionCode,
        @NotNull CertificationLevel certificationLevel,
        @NotNull QuestionCategory questionCategory,
        @NotNull QuestionType questionType,
        @NotBlank @Size(max = 4000) String questionText,
        @NotEmpty List<@NotBlank @Size(max = 500) String> options,
        @NotEmpty List<@NotBlank @Size(max = 500) String> correctOptions,
        @NotNull QuestionSeverity severity,
        @NotNull @DecimalMin("0.0") BigDecimal marks,
        @NotNull Boolean active) {
}
