package com.ems.dto.response;

import java.time.Instant;

import lombok.Builder;

@Builder
public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        Instant timestamp,
        String traceId) {

    public static <T> ApiResponse<T> success(String message, T data, String traceId) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(Instant.now())
                .traceId(traceId)
                .build();
    }
}
