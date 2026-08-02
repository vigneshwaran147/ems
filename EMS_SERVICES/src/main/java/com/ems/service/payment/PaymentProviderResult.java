package com.ems.service.payment;

import com.ems.enums.PaymentStatus;

public record PaymentProviderResult(
        PaymentStatus paymentStatus,
        String providerReference,
        String redirectUrl,
        String qrCodePayload) {
}
