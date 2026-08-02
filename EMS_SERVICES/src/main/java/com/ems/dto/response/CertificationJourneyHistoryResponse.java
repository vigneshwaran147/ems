package com.ems.dto.response;

import java.util.List;

public record CertificationJourneyHistoryResponse(
        List<CertificationApplicationResponse> applications,
        List<CertificationSummaryResponse> certifications,
        List<CertificationHistoryEventResponse> events) {
}
