package com.ems.dto.response;

import java.time.LocalDate;

import com.ems.enums.CertificationLevel;

public record CertificationEligibilityResponse(
        CertificationLevel requestedLevel,
        boolean eligible,
        String message,
        CertificationLevel prerequisiteLevel,
        LocalDate prerequisiteExpiryDate) {
}
