package com.ems.security;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.ems.dto.response.ApiErrorResponse;
import com.ems.util.CorrelationIdUtil;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;
    private final Map<String, Deque<Long>> requestBuckets = new ConcurrentHashMap<>();
    private final Map<String, RateLimitRule> rules = Map.of(
            "POST:/api/auth/login", new RateLimitRule(5, 60),
            "POST:/api/auth/register", new RateLimitRule(3, 300),
            "POST:/api/auth/forgot-password", new RateLimitRule(3, 900),
            "POST:/api/auth/reset-password", new RateLimitRule(5, 900),
            "POST:/api/auth/refresh-token", new RateLimitRule(10, 60),
            "POST:/api/auth/logout", new RateLimitRule(15, 60),
            "POST:/api/users/register", new RateLimitRule(3, 300));

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !rules.containsKey(ruleKey(request));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        RateLimitRule rule = rules.get(ruleKey(request));
        String bucketKey = resolveClientIp(request) + ":" + ruleKey(request);
        long nowEpochMillis = Instant.now().toEpochMilli();
        Deque<Long> timestamps = requestBuckets.computeIfAbsent(bucketKey, key -> new ArrayDeque<>());

        synchronized (timestamps) {
            long windowStart = nowEpochMillis - (rule.windowSeconds() * 1000L);
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }

            if (timestamps.size() >= rule.maxRequests()) {
                writeRateLimitResponse(request, response);
                return;
            }

            timestamps.addLast(nowEpochMillis);
        }

        filterChain.doFilter(request, response);
    }

    private void writeRateLimitResponse(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String traceId = CorrelationIdUtil.getOrCreateTraceId();
        ApiErrorResponse payload = ApiErrorResponse.of(
                "Too many requests",
                List.of("Rate limit exceeded. Please retry later."),
                request.getRequestURI(),
                traceId);

        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), payload);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return Objects.toString(request.getRemoteAddr(), "unknown");
    }

    private String ruleKey(HttpServletRequest request) {
        return request.getMethod() + ":" + request.getRequestURI();
    }

    private record RateLimitRule(int maxRequests, int windowSeconds) {
    }
}
