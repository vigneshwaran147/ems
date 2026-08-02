package com.ems.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PaymentCompletionRequest(
        @NotNull Boolean success,
        @Size(max = 100) String providerReference) {
}
