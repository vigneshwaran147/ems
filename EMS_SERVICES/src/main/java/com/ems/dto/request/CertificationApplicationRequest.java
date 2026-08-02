package com.ems.dto.request;

import com.ems.enums.CertificationLevel;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CertificationApplicationRequest(
        @NotNull CertificationLevel certificationLevel,
        @Size(max = 1000) String remarks) {
}
