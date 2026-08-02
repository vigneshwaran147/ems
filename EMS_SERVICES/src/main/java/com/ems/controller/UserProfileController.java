package com.ems.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ems.dto.request.ProfilePhotoUploadRequest;
import com.ems.dto.request.UpdateUserProfileRequest;
import com.ems.dto.request.UserRegistrationRequest;
import com.ems.dto.response.ApiResponse;
import com.ems.dto.response.UserProfileResponse;
import com.ems.exception.UnauthorizedException;
import com.ems.service.ProfilePhotoContent;
import com.ems.service.UserProfileService;
import com.ems.util.CorrelationIdUtil;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Validated
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class UserProfileController {

    private final UserProfileService userProfileService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserProfileResponse>> register(
            @Valid @RequestBody UserRegistrationRequest request) {
        UserProfileResponse response = userProfileService.register(request);
        return ResponseEntity.ok(ApiResponse.success(
                "User registered successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(Authentication authentication) {
        String email = requireUser(authentication);
        UserProfileResponse response = userProfileService.getCurrentUserProfile(email);
        return ResponseEntity.ok(ApiResponse.success(
                "Profile fetched successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateUserProfileRequest request) {
        String email = requireUser(authentication);
        UserProfileResponse response = userProfileService.updateCurrentUserProfile(email, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Profile updated successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @PostMapping("/me/photo")
    public ResponseEntity<ApiResponse<UserProfileResponse>> uploadPhoto(
            Authentication authentication,
            @Valid @RequestBody ProfilePhotoUploadRequest request) {
        String email = requireUser(authentication);
        UserProfileResponse response = userProfileService.uploadProfilePhoto(email, request.profilePhoto());
        return ResponseEntity.ok(ApiResponse.success(
                "Profile photo uploaded successfully", response, CorrelationIdUtil.getOrCreateTraceId()));
    }

    @GetMapping("/me/photo")
    public ResponseEntity<Resource> getPhoto(Authentication authentication) {
        String email = requireUser(authentication);
        ProfilePhotoContent content = userProfileService.loadCurrentUserProfilePhoto(email);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, content.contentType())
                .body(content.resource());
    }

    private String requireUser(Authentication authentication) {
        if (authentication == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return authentication.getName();
    }
}
