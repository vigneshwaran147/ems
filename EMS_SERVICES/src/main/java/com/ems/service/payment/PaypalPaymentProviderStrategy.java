package com.ems.service.payment;

import org.springframework.stereotype.Component;

import com.ems.dto.request.PaymentRefundRequest;
import com.ems.dto.request.PaymentVerificationRequest;
import com.ems.entity.Payment;
import com.ems.enums.PaymentProvider;
import com.ems.enums.PaymentStatus;

@Component
public class PaypalPaymentProviderStrategy implements PaymentProviderStrategy {

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.PAYPAL;
    }

    @Override
    public PaymentProviderResult initiate(Payment payment) {
        return new PaymentProviderResult(
                PaymentStatus.PENDING,
                "PAYPAL-" + payment.getTransactionId(),
                "https://www.paypal.com/checkoutnow?token=" + payment.getTransactionId(),
                null);
    }

    @Override
    public PaymentProviderResult verify(Payment payment, PaymentVerificationRequest request) {
        return new PaymentProviderResult(
                Boolean.TRUE.equals(request.success()) ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
                request.providerReference(),
                null,
                null);
    }

    @Override
    public PaymentProviderResult refund(Payment payment, PaymentRefundRequest request) {
        return new PaymentProviderResult(
                PaymentStatus.REFUNDED,
                "PAYPAL-REFUND-" + payment.getTransactionId(),
                null,
                null);
    }
}
