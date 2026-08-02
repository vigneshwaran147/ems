package com.ems.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PaymentRefundRequest(@NotBlank @Size(max = 500) String reason) {
}
