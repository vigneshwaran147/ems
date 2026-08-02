package com.ems.dto.response;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long accessTokenExpiresInMinutes,
        UserSummaryResponse user) {
}
