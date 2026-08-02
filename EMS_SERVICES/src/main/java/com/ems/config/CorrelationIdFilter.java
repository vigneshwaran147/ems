package com.ems.config;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.ems.constants.AppConstants;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String traceId = Optional.ofNullable(request.getHeader(AppConstants.CORRELATION_ID_HEADER))
                .filter(header -> !header.isBlank())
                .orElse(UUID.randomUUID().toString());

        MDC.put(AppConstants.TRACE_ID_MDC_KEY, traceId);
        response.setHeader(AppConstants.CORRELATION_ID_HEADER, traceId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(AppConstants.TRACE_ID_MDC_KEY);
        }
    }
}
