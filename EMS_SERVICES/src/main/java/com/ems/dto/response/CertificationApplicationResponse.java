package com.ems.dto.response;

import java.time.LocalDate;

import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.CertificationLevel;

public record CertificationApplicationResponse(
        Long applicationId,
        String userId,
        CertificationLevel certificationLevel,
        CertificationApplicationStatus applicationStatus,
        LocalDate appliedOn,
        String remarks) {
}
