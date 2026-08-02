package com.ems.dto.response;

import java.time.LocalDate;

import com.ems.enums.CertificationLevel;
import com.ems.enums.CertificationStatus;

public record CertificationSummaryResponse(
        Long certificationId,
        CertificationLevel certificationLevel,
        CertificationStatus certificationStatus,
        LocalDate issueDate,
        LocalDate expiryDate) {
}
