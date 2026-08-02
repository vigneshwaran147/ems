package com.ems.dto.request;

import jakarta.validation.constraints.Size;

public record SessionMonitoringUpdateRequest(
        @Size(max = 255) String browserFingerprint,
        @Size(max = 64) String ipAddress) {
}
