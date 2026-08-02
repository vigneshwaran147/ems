package com.ems.service.payment;

import com.ems.dto.request.PaymentRefundRequest;
import com.ems.dto.request.PaymentVerificationRequest;
import com.ems.entity.Payment;
import com.ems.enums.PaymentProvider;

public interface PaymentProviderStrategy {

    PaymentProvider provider();

    PaymentProviderResult initiate(Payment payment);

    PaymentProviderResult verify(Payment payment, PaymentVerificationRequest request);

    PaymentProviderResult refund(Payment payment, PaymentRefundRequest request);
}
