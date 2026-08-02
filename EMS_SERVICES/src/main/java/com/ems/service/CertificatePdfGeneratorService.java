package com.ems.service;

import java.time.LocalDate;

import com.ems.enums.CertificationLevel;

public interface CertificatePdfGeneratorService {

    byte[] generateCertificatePdf(CertificatePdfData data);

    record CertificatePdfData(
            String certificateNumber,
            String candidateName,
            String userId,
            CertificationLevel certificationLevel,
            LocalDate issueDate,
            LocalDate expiryDate,
            String verificationUrl,
            byte[] qrCodePng) {
    }
}
