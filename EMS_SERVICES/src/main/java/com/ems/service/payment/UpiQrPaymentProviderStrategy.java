package com.ems.service.payment;

import java.math.RoundingMode;

import org.springframework.stereotype.Component;

import com.ems.dto.request.PaymentRefundRequest;
import com.ems.dto.request.PaymentVerificationRequest;
import com.ems.entity.Payment;
import com.ems.enums.PaymentProvider;
import com.ems.enums.PaymentStatus;

@Component
public class UpiQrPaymentProviderStrategy implements PaymentProviderStrategy {

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.UPI_QR;
    }

    @Override
    public PaymentProviderResult initiate(Payment payment) {
        String qrPayload = "upi://pay?pa=ems@upi&pn=EMS&tr="
                + payment.getTransactionId()
                + "&am=" + payment.getAmount().setScale(2, RoundingMode.HALF_UP)
                + "&cu=" + payment.getCurrency();
        return new PaymentProviderResult(
                PaymentStatus.PENDING,
                "UPIQR-" + payment.getTransactionId(),
                null,
                qrPayload);
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
                "UPIQR-REFUND-" + payment.getTransactionId(),
                null,
                null);
    }
}
