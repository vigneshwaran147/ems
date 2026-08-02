package com.ems.service;

import com.ems.dto.request.ChangePasswordRequest;
import com.ems.dto.request.ForgotPasswordRequest;
import com.ems.dto.request.LoginRequest;
import com.ems.dto.request.LogoutRequest;
import com.ems.dto.request.RefreshTokenRequest;
import com.ems.dto.request.RegisterRequest;
import com.ems.dto.request.ResetPasswordRequest;
import com.ems.dto.response.AuthResponse;
import com.ems.dto.response.ForgotPasswordResponse;
import com.ems.dto.response.MessageResponse;
import com.ems.dto.response.UserSummaryResponse;

public interface AuthenticationService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    MessageResponse logout(LogoutRequest request);

    ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request);

    MessageResponse resetPassword(ResetPasswordRequest request);

    MessageResponse changePassword(String currentUserEmail, ChangePasswordRequest request);

    UserSummaryResponse getCurrentUser(String email);
}
