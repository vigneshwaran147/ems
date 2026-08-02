package com.ems.dto.response;

import java.time.Instant;

import com.ems.enums.CertificationHistoryEventType;

public record CertificationHistoryEventResponse(
        Long certificationId,
        CertificationHistoryEventType eventType,
        String eventDescription,
        Instant eventTimestamp) {
}
