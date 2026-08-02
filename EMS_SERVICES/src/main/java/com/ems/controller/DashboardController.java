package com.ems.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ems.dto.response.ApiResponse;
import com.ems.dto.response.UserDashboardResponse;
import com.ems.exception.UnauthorizedException;
import com.ems.service.DashboardService;
import com.ems.util.CorrelationIdUtil;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDashboardResponse>> getDashboard(Authentication authentication) {
        if (authentication == null) {
            throw new UnauthorizedException("Authentication required");
        }
        UserDashboardResponse response = dashboardService.getCurrentUserDashboard(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(
                "Dashboard fetched successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }
}
