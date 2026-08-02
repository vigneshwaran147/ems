package com.ems.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PaymentInitiationRequest(
        @NotBlank @Size(max = 30) String provider,
        @NotBlank @Size(max = 10) String currency) {
}
