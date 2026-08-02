package com.ems.dto.response;

import java.time.LocalDate;

import com.ems.enums.CertificationLevel;

public record CertificateResponse(
        String certificateNumber,
        String candidateName,
        String userId,
        CertificationLevel certificationLevel,
        LocalDate issueDate,
        LocalDate expiryDate,
        String verificationUrl,
        String certificateDownloadUrl) {
}
