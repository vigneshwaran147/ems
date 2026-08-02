package com.ems.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CertificationCompletionRequest(
        @NotNull Boolean passed,
        @Size(max = 1000) String remarks) {
}
