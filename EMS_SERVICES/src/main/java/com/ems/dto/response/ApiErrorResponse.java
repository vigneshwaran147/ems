package com.ems.dto.response;

import java.time.Instant;
import java.util.List;

import lombok.Builder;

@Builder
public record ApiErrorResponse(
        boolean success,
        String message,
        List<String> errors,
        String path,
        Instant timestamp,
        String traceId) {

    public static ApiErrorResponse of(String message, List<String> errors, String path, String traceId) {
        return ApiErrorResponse.builder()
                .success(false)
                .message(message)
                .errors(errors)
                .path(path)
                .timestamp(Instant.now())
                .traceId(traceId)
                .build();
    }
}
