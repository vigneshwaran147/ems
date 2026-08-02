package com.ems.dto.response;

import java.util.Set;

public record UserSummaryResponse(
        String userId,
        String firstName,
        String lastName,
        String email,
        Set<String> roles) {
}
