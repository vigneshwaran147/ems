package com.ems.service;

import org.springframework.core.io.Resource;

public record PaymentReceiptContent(
        Resource resource,
        String contentType,
        String fileName) {
}
