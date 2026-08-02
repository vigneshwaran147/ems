package com.ems.dto.request;

import com.ems.enums.CertificationLevel;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ExamWorkflowApplicationRequest(
        @NotNull CertificationLevel certificationLevel,
        @NotNull Long examId,
        @Size(max = 1000) String remarks) {
}
