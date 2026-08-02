package com.ems.util;

import java.util.UUID;

import org.slf4j.MDC;

import com.ems.constants.AppConstants;

public final class CorrelationIdUtil {

    private CorrelationIdUtil() {
    }

    public static String getOrCreateTraceId() {
        String traceId = MDC.get(AppConstants.TRACE_ID_MDC_KEY);
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
            MDC.put(AppConstants.TRACE_ID_MDC_KEY, traceId);
        }
        return traceId;
    }
}
