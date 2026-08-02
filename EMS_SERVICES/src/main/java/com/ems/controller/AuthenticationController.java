package com.ems.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ems.dto.request.ChangePasswordRequest;
import com.ems.dto.request.ForgotPasswordRequest;
import com.ems.dto.request.LoginRequest;
import com.ems.dto.request.LogoutRequest;
import com.ems.dto.request.RefreshTokenRequest;
import com.ems.dto.request.RegisterRequest;
import com.ems.dto.request.ResetPasswordRequest;
import com.ems.dto.response.ApiResponse;
import com.ems.dto.response.AuthResponse;
import com.ems.dto.response.ForgotPasswordResponse;
import com.ems.dto.response.MessageResponse;
import com.ems.dto.response.UserSummaryResponse;
import com.ems.exception.UnauthorizedException;
import com.ems.service.AuthenticationService;
import com.ems.util.CorrelationIdUtil;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Validated
public class AuthenticationController {

    private final AuthenticationService authenticationService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authenticationService.register(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Registration successful", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authenticationService.login(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Login successful", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authenticationService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Token refreshed successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<MessageResponse>> logout(
            @Valid @RequestBody LogoutRequest request) {
        MessageResponse response = authenticationService.logout(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Logout successful", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<ForgotPasswordResponse>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        ForgotPasswordResponse response = authenticationService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Forgot password processed", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<MessageResponse>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        MessageResponse response = authenticationService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Password reset completed", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<MessageResponse>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        if (authentication == null) {
            throw new UnauthorizedException("Authentication required");
        }
        MessageResponse response = authenticationService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success(
                "Password changed", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> me(Authentication authentication) {
        if (authentication == null) {
            throw new UnauthorizedException("Authentication required");
        }
        UserSummaryResponse response = authenticationService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(
                "Current user fetched", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/ping")
    public ResponseEntity<ApiResponse<MessageResponse>> adminPing() {
        return ResponseEntity.ok(ApiResponse.success(
                "Admin access granted",
                new MessageResponse("pong"),
                CorrelationIdUtil.getOrCreateTraceId()));
    }
}
