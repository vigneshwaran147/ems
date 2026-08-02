package com.ems.dto.response;

import java.time.LocalDate;

import com.ems.enums.CertificateVerificationStatus;
import com.ems.enums.CertificationLevel;

public record CertificateVerificationResponse(
        String certificateNumber,
        CertificateVerificationStatus verificationStatus,
        String candidateName,
        String userId,
        CertificationLevel certificationLevel,
        LocalDate issueDate,
        LocalDate expiryDate,
        String verificationUrl,
        String message) {
}
